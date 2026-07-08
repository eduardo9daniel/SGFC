/**
 * routes/certificados.js — versão completa com QR Code e autenticidade
 *
 * Instalar dependências adicionais:
 *   npm install qrcode express-rate-limit puppeteer
 */

const router    = require('express').Router();
const crypto    = require('crypto');
const puppeteer = require('puppeteer');
const db        = require('../config/db');
const auth      = require('../middleware/auth');
const { gerarQRCodeDataURL, gerarQRCodeBuffer, urlValidacao } = require('../utils/qrcode');
const { gerarHTMLCertificado } = require('../utils/certificadoTemplate');

// ─── Rate limiter para a rota pública de validação ───────────────────────────
const rateLimit = require('express-rate-limit');

const validacaoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, erro: 'Muitas consultas. Aguarde um momento.' },
});

const CERT_MIN = parseInt(process.env.CERT_MIN_FREQUENCIA || '75');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function calcFreq(inscricaoId) {
  const [[r]] = await db.query(
    'SELECT COUNT(*) AS total, IFNULL(SUM(presente),0) AS presentes FROM frequencias WHERE inscricao_id = ?',
    [inscricaoId]
  );
  if (!r || r.total === 0) return 0;
  return Math.round((r.presentes / r.total) * 100);
}

async function logConsulta(certificadoId, hash, req, resultado) {
  try {
    await db.query(
      `INSERT INTO logs_consultas_certificados
         (certificado_id, hash_consultado, ip, user_agent, referer, resultado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        certificadoId,
        hash,
        req.ip || req.headers['x-forwarded-for'] || null,
        (req.headers['user-agent'] || '').substring(0, 500),
        (req.headers['referer'] || '').substring(0, 500),
        resultado,
      ]
    );
    if (certificadoId) {
      await db.query(
        'UPDATE certificados SET total_consultas = total_consultas + 1 WHERE id = ?',
        [certificadoId]
      );
    }
  } catch (e) {
    console.error('Erro ao registrar log de consulta:', e);
  }
}

// ─── ROTAS ───────────────────────────────────────────────────────────────────

router.get('/', auth('admin', 'coordenador', 'equipe'), async (req, res) => {
  const { formacao_id } = req.query;
  if (!formacao_id) return res.status(400).json({ ok: false, erro: 'formacao_id obrigatório.' });

  const [rows] = await db.query(
    `SELECT
       i.id AS inscricao_id,
       u.nome_completo, u.cpf, u.email,
       f.titulo, f.carga_horaria, f.data_inicio, f.data_fim,
       c.id AS certificado_id,
       c.codigo_validacao,
       c.hash_unico,
       c.status AS cert_status,
       c.data_emissao,
       c.carga_horaria_cursada,
       c.total_consultas,
       (SELECT COUNT(*) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS total_aulas,
       (SELECT IFNULL(SUM(fq.presente),0) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS total_presentes
     FROM inscricoes i
     JOIN usuarios  u ON u.id = i.usuario_id
     JOIN formacoes f ON f.id = i.formacao_id
     LEFT JOIN certificados c ON c.inscricao_id = i.id
     WHERE i.formacao_id = ? AND i.status = 'confirmada'
     ORDER BY u.nome_completo`,
    [formacao_id]
  );
  res.json({ ok: true, data: rows });
});

router.get('/meus', auth('participante'), async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.*, f.titulo, f.data_inicio, f.data_fim, u.nome_completo
     FROM certificados c
     JOIN inscricoes i ON i.id = c.inscricao_id
     JOIN formacoes  f ON f.id = i.formacao_id
     JOIN usuarios   u ON u.id = i.usuario_id
     WHERE i.usuario_id = ?
     ORDER BY c.data_emissao DESC`,
    [req.user.id]
  );
  res.json({ ok: true, data: rows });
});

router.get('/validar/:hash', validacaoLimiter, async (req, res) => {
  const { hash } = req.params;

  if (!/^[0-9a-f-]{8,40}$/i.test(hash)) {
    return res.status(400).json({ ok: false, erro: 'Hash inválido.' });
  }

  const [rows] = await db.query(
    `SELECT
       c.id, c.hash_unico, c.codigo_validacao, c.status,
       c.data_emissao, c.data_validade, c.carga_horaria_cursada,
       c.total_consultas, c.motivo_status,
       u.nome_completo, u.email, u.cpf,
       f.titulo, f.carga_horaria, f.data_inicio, f.data_fim, f.instrutor, f.local
     FROM certificados c
     JOIN inscricoes i ON i.id = c.inscricao_id
     JOIN usuarios   u ON u.id = i.usuario_id
     JOIN formacoes  f ON f.id = i.formacao_id
     WHERE c.hash_unico = ?`,
    [hash]
  );

  if (!rows.length) {
    await db.query(
      `INSERT INTO logs_consultas_certificados
         (certificado_id, hash_consultado, ip, user_agent, resultado)
       VALUES (0, ?, ?, ?, 'nao_encontrado')`,
      [hash, req.ip || null, (req.headers['user-agent'] || '').substring(0, 500)]
    );
    return res.status(404).json({ ok: false, erro: 'Certificado não encontrado.' });
  }

  const cert = rows[0];
  const resultado = cert.status === 'ativo' ? 'encontrado' : 'cancelado';
  await logConsulta(cert.id, hash, req, resultado);

  res.json({ ok: true, data: cert });
});

router.get('/validar-codigo/:codigo', validacaoLimiter, async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.*, u.nome_completo, f.titulo, f.carga_horaria, f.data_inicio, f.data_fim, f.instrutor
     FROM certificados c
     JOIN inscricoes i ON i.id = c.inscricao_id
     JOIN usuarios   u ON u.id = i.usuario_id
     JOIN formacoes  f ON f.id = i.formacao_id
     WHERE c.codigo_validacao = ?`,
    [req.params.codigo]
  );
  if (!rows.length) return res.status(404).json({ ok: false, erro: 'Certificado não encontrado.' });
  res.json({ ok: true, data: rows[0] });
});

router.get('/qrcode/:hash.png', async (req, res) => {
  try {
    const buffer = await gerarQRCodeBuffer(req.params.hash);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch {
    res.status(500).json({ ok: false, erro: 'Erro ao gerar QR Code.' });
  }
});

router.post('/', auth('admin', 'coordenador'), async (req, res) => {
  const { inscricao_id, carga_horaria_cursada } = req.body;
  if (!inscricao_id) return res.status(400).json({ ok: false, erro: 'inscricao_id obrigatório.' });

  const freq = await calcFreq(inscricao_id);
  if (freq < CERT_MIN) {
    return res.status(400).json({
      ok: false,
      erro: `Frequência insuficiente (${freq}%). Mínimo: ${CERT_MIN}%.`,
    });
  }

  const [[dadosParticipante]] = await db.query(
    `SELECT u.nome_completo, u.email, u.cpf,
            f.titulo, f.carga_horaria, f.data_inicio, f.data_fim, f.instrutor, f.local,
            i.id AS inscricao_id
     FROM inscricoes i
     JOIN usuarios  u ON u.id = i.usuario_id
     JOIN formacoes f ON f.id = i.formacao_id
     WHERE i.id = ?`,
    [inscricao_id]
  );

  if (!dadosParticipante) return res.status(404).json({ ok: false, erro: 'Inscrição não encontrada.' });

  const hashUnico = crypto.randomUUID();
  const codigoValidacao = crypto.randomBytes(8).toString('hex').toUpperCase()
    + '-' + new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const dadosCompletos = {
    participante: { nome: dadosParticipante.nome_completo, email: dadosParticipante.email, cpf: dadosParticipante.cpf },
    formacao: {
      titulo: dadosParticipante.titulo, carga_horaria: dadosParticipante.carga_horaria,
      data_inicio: dadosParticipante.data_inicio, data_fim: dadosParticipante.data_fim,
      instrutor: dadosParticipante.instrutor, local: dadosParticipante.local,
    },
    emissao: { data: new Date().toISOString(), emitido_por: req.user?.id || null },
  };

  await db.query(
    `INSERT INTO certificados
       (inscricao_id, codigo_validacao, hash_unico, status, data_emissao, carga_horaria_cursada, dados_completos)
     VALUES (?, ?, ?, 'ativo', CURDATE(), ?, ?)
     ON DUPLICATE KEY UPDATE
       codigo_validacao = VALUES(codigo_validacao),
       hash_unico       = VALUES(hash_unico),
       status           = 'ativo',
       data_emissao     = CURDATE(),
       dados_completos  = VALUES(dados_completos)`,
    [inscricao_id, codigoValidacao, hashUnico, carga_horaria_cursada || dadosParticipante.carga_horaria, JSON.stringify(dadosCompletos)]
  );

  const qrCodeDataUrl = await gerarQRCodeDataURL(hashUnico);
  const urlDeValidacao = urlValidacao(hashUnico);

  await db.query(
    `INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?, 'CERT_EMISSAO', ?, ?)`,
    [req.user?.id || null, `Certificado emitido para inscrição #${inscricao_id} — hash: ${hashUnico}`, req.ip || null]
  );

  res.status(201).json({
    ok: true, codigo: codigoValidacao, hash: hashUnico,
    url_validacao: urlDeValidacao, qr_code_data_url: qrCodeDataUrl,
  });
});

router.patch('/:id/revogar', auth('admin', 'coordenador'), async (req, res) => {
  const { status, motivo } = req.body;
  if (!['cancelado', 'substituido'].includes(status)) {
    return res.status(400).json({ ok: false, erro: "status deve ser 'cancelado' ou 'substituido'." });
  }

  const [[cert]] = await db.query('SELECT id, hash_unico FROM certificados WHERE id = ?', [req.params.id]);
  if (!cert) return res.status(404).json({ ok: false, erro: 'Certificado não encontrado.' });

  await db.query('UPDATE certificados SET status = ?, motivo_status = ? WHERE id = ?', [status, motivo || null, req.params.id]);
  await db.query(
    `INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?, 'CERT_REVOGACAO', ?, ?)`,
    [req.user?.id || null, `Certificado #${req.params.id} marcado como '${status}'. Motivo: ${motivo || 'não informado'}`, req.ip || null]
  );

  res.json({ ok: true, mensagem: `Certificado marcado como ${status}.` });
});

router.get('/:id/qrcode', auth('admin', 'coordenador', 'participante'), async (req, res) => {
  const [[cert]] = await db.query('SELECT hash_unico FROM certificados WHERE id = ?', [req.params.id]);
  if (!cert) return res.status(404).json({ ok: false, erro: 'Certificado não encontrado.' });

  const qrCodeDataUrl = await gerarQRCodeDataURL(cert.hash_unico);
  res.json({ ok: true, qr_code_data_url: qrCodeDataUrl, url_validacao: urlValidacao(cert.hash_unico) });
});

router.get('/:id/logs', auth('admin', 'coordenador','equipe'), async (req, res) => {
  const [logs] = await db.query(
    `SELECT id, ip, user_agent, resultado, data_consulta
     FROM logs_consultas_certificados
     WHERE certificado_id = ?
     ORDER BY data_consulta DESC LIMIT 100`,
    [req.params.id]
  );
  res.json({ ok: true, data: logs });
});

router.post('/validar-massa', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ ok: false, erro: 'X-API-Key obrigatório.' });

  const [[key]] = await db.query('SELECT id, nome FROM api_keys_certificados WHERE api_key = ? AND ativo = 1', [apiKey]);
  if (!key) return res.status(403).json({ ok: false, erro: 'Chave inválida ou desativada.' });

  await db.query('UPDATE api_keys_certificados SET ultimo_uso = NOW() WHERE id = ?', [key.id]);

  const { hashes } = req.body;
  if (!Array.isArray(hashes) || hashes.length === 0) return res.status(400).json({ ok: false, erro: 'Envie um array de hashes.' });
  if (hashes.length > 100) return res.status(400).json({ ok: false, erro: 'Máximo de 100 hashes por requisição.' });

  const placeholders = hashes.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT c.hash_unico, c.status, c.data_emissao, u.nome_completo, f.titulo, f.carga_horaria
     FROM certificados c
     JOIN inscricoes i ON i.id = c.inscricao_id
     JOIN usuarios   u ON u.id = i.usuario_id
     JOIN formacoes  f ON f.id = i.formacao_id
     WHERE c.hash_unico IN (${placeholders})`,
    hashes
  );

  const resultado = hashes.map(h => {
    const cert = rows.find(r => r.hash_unico === h);
    return cert ? { hash: h, valido: cert.status === 'ativo', ...cert } : { hash: h, valido: false, erro: 'não encontrado' };
  });

  res.json({ ok: true, consultado_por: key.nome, total: hashes.length, data: resultado });
});

router.get('/relatorio-consultas', auth('admin'), async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.id, c.hash_unico, c.codigo_validacao, c.status, c.total_consultas, c.data_emissao, u.nome_completo, f.titulo
     FROM certificados c
     JOIN inscricoes i ON i.id = c.inscricao_id
     JOIN usuarios   u ON u.id = i.usuario_id
     JOIN formacoes  f ON f.id = i.formacao_id
     ORDER BY c.total_consultas DESC LIMIT 50`
  );
  res.json({ ok: true, data: rows });
});

// ─── ROTA PDF ─────────────────────────────────────────────────────────────────
/**
 * GET /api/certificados/:codigo/pdf
 *
 * :codigo = hash_unico UUID  OU  codigo_validacao legado
 *
 * O QR Code embutido no PDF aponta para: ${FRONTEND_URL}/validar/:hash_unico
 * Quando escaneado, abre ValidarHash.jsx que confirma a autenticidade.
 */
router.get('/:codigo/pdf', async (req, res) => {
  const { codigo } = req.params;

  // ── 1. Busca certificado ──────────────────────────────────────────────────
  let cert;
  try {
    const [rows] = await db.query(
      // IMPORTANTE: f.tipo NÃO existe na tabela formacoes — não selecionar
      `SELECT
         c.id, c.hash_unico, c.codigo_validacao, c.status,
         c.data_emissao, c.carga_horaria_cursada,
         u.nome_completo,
         f.titulo, f.carga_horaria, f.data_inicio, f.data_fim
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

    cert = rows[0];
  } catch (dbErr) {
    console.error('[PDF] Erro no banco:', dbErr.message);
    return res.status(500).json({ ok: false, erro: 'Erro ao buscar certificado.', detalhe: dbErr.message });
  }

  let browser;
  try {
    // ── 2. QR Code como Data URL base64 ──────────────────────────────────
    const qrCodeDataUrl = await gerarQRCodeDataURL(cert.hash_unico);

    // ── 3. HTML do certificado com QR embutido ────────────────────────────
    const html = gerarHTMLCertificado({
      nome_completo:         cert.nome_completo,
      titulo:                cert.titulo,
      tipo:                  'Curso',      // fixo — coluna tipo não existe
      data_inicio:           cert.data_inicio,
      data_fim:              cert.data_fim,
      carga_horaria:         cert.carga_horaria,
      carga_horaria_cursada: cert.carga_horaria_cursada,
      data_emissao:          cert.data_emissao,
      qr_code_data_url:      qrCodeDataUrl,
      hash_unico:            cert.hash_unico,
    });

    // ── 4. Puppeteer ──────────────────────────────────────────────────────
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // 'domcontentloaded': não espera Google Fonts (evita timeout/networkidle0)
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Aguarda fontes (máx 5s) sem travar se não carregar
    await page.evaluate(() =>
      Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ])
    );

    await page.setViewport({ width: 1122, height: 794, deviceScaleFactor: 2 });

    const pdfRaw = await page.pdf({
      width:           '297mm',
      height:          '210mm',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    // ─── FIX CRÍTICO: Puppeteer v20+ retorna Uint8Array, não Buffer.
    // Buffer.from() garante um Buffer Node.js real — sem isso o
    // Content-Length fica errado e o browser recebe PDF corrompido.
    const pdfBuffer = Buffer.from(pdfRaw);

    // ── 5. Log não-crítico ────────────────────────────────────────────────
    db.query(
      `INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?, 'CERT_PDF_DOWNLOAD', ?, ?)`,
      [req.user?.id || null, `PDF baixado — certificado #${cert.id} (${cert.nome_completo})`, req.ip || null]
    ).catch((e) => console.warn('[PDF] Erro no log:', e.message));

    // ── 6. Envia PDF ──────────────────────────────────────────────────────
    const nomeSafe = cert.nome_completo
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_');

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="Certificado_${nomeSafe}.pdf"`,
      'Content-Length':       pdfBuffer.length,
    });

    res.end(pdfBuffer);

  } catch (err) {
    console.error('[PDF] Erro:', err.message);
    if (!res.headersSent) {
      res.status(500).json({
        ok:      false,
        erro:    'Erro ao gerar PDF.',
        detalhe: process.env.NODE_ENV !== 'production' ? err.message : undefined,
      });
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

module.exports = router;