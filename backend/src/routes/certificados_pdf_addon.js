/**
 * ADIÇÃO à rota certificados.js
 * ─────────────────────────────────────────────────────────────────────
 * Adicione este bloco ao arquivo backend/src/routes/certificados.js
 * ANTES da linha `module.exports = router;`
 *
 * Dependências:
 *   npm install puppeteer
 *
 * Variável de ambiente extra (opcional, padrão: http://localhost:5173):
 *   FRONTEND_URL=https://seu-dominio.com.br
 * ─────────────────────────────────────────────────────────────────────
 */

// Adicionar no topo do arquivo, junto aos outros requires:
const { gerarHTMLCertificado } = require('../utils/certificadoTemplate');

// ─── ROTA PDF ────────────────────────────────────────────────────────
/**
 * GET /api/certificados/:codigo/pdf
 * Gera e retorna o PDF do certificado.
 * Acessado tanto pelo participante quanto pelo admin/coord.
 *
 * :codigo pode ser o codigo_validacao legado OU o hash_unico UUID.
 */
router.get('/:codigo/pdf', async (req, res) => {
  const { codigo } = req.params;

  // Busca pelo hash UUID ou pelo código legado
  const [rows] = await db.query(
    `SELECT
       c.id, c.hash_unico, c.codigo_validacao, c.status,
       c.data_emissao, c.carga_horaria_cursada,
       u.nome_completo,
       f.titulo, f.carga_horaria, f.data_inicio, f.data_fim, f.instrutor
     FROM certificados c
     JOIN inscricoes i ON i.id = c.inscricao_id
     JOIN usuarios   u ON u.id = i.usuario_id
     JOIN formacoes  f ON f.id = i.formacao_id
     WHERE c.hash_unico = ? OR c.codigo_validacao = ?`,
    [codigo, codigo]
  );

  if (!rows.length) {
    return res.status(404).json({ ok: false, erro: 'Certificado não encontrado.' });
  }

  const cert = rows[0];

  // Gera QR Code como Data URL para embutir no PDF
  const { gerarQRCodeDataURL } = require('../utils/qrcode');
  const qrCodeDataUrl = await gerarQRCodeDataURL(cert.hash_unico);

  // Monta o HTML do certificado
  const html = gerarHTMLCertificado({
    nome_completo:         cert.nome_completo,
    titulo:                cert.titulo,
    tipo:                  'Curso',             // Ajuste se tiver campo tipo na formacao
    data_inicio:           cert.data_inicio,
    data_fim:              cert.data_fim,
    carga_horaria:         cert.carga_horaria,
    carga_horaria_cursada: cert.carga_horaria_cursada,
    data_emissao:          cert.data_emissao,
    qr_code_data_url:      qrCodeDataUrl,
    hash_unico:            cert.hash_unico,
  });

  // Gera PDF com Puppeteer
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Carrega o HTML com fonts do Google via waitUntil networkidle
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    // Viewport A4 landscape em pixels (96dpi)
    await page.setViewport({ width: 1122, height: 794, deviceScaleFactor: 2 });

    const pdfBuffer = await page.pdf({
      width:       '297mm',
      height:      '210mm',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    // Salva URL do PDF no banco (opcional)
    // await db.query('UPDATE certificados SET url_pdf = ? WHERE id = ?', [urlGerada, cert.id]);

    // Log de emissão de PDF
    await db.query(
      `INSERT INTO logs_atividades (usuario_id, acao, descricao, ip)
       VALUES (?, 'CERT_PDF_DOWNLOAD', ?, ?)`,
      [
        req.user?.id || null,
        `PDF baixado — certificado #${cert.id} (${cert.nome_completo})`,
        req.ip || null,
      ]
    );

    const nomeSafe = cert.nome_completo
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_');

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="Certificado_${nomeSafe}.pdf"`,
      'Content-Length':       pdfBuffer.length,
    });
    res.send(pdfBuffer);

  } finally {
    await browser.close();
  }
});
