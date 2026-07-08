/**
 * backend/src/utils/certificadoTemplate.js
 * Gera o HTML do certificado com dados reais do banco.
 * Usado pela rota GET /api/certificados/:codigo/pdf
 */

const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../../assets/logo_niteroi_transparente.png');
const LOGO_DATA_URL = `data:image/png;base64,${fs.readFileSync(logoPath, 'base64')}`;

/**
 * @param {object} dados
 * @param {string} dados.nome_completo
 * @param {string} dados.titulo          - título da formação
 * @param {string} dados.tipo            - "Curso" | "Oficina" | "Palestra" etc.
 * @param {string} dados.data_inicio     - YYYY-MM-DD
 * @param {string} dados.data_fim        - YYYY-MM-DD
 * @param {number} dados.carga_horaria   - total
 * @param {number} dados.carga_horaria_cursada
 * @param {string} dados.data_emissao    - YYYY-MM-DD
 * @param {string} dados.qr_code_data_url - data:image/png;base64,...
 * @param {string} dados.hash_unico
 */
function gerarHTMLCertificado(dados) {
  const {
    nome_completo,
    titulo,
    tipo = 'Curso',
    data_fim,
    carga_horaria_cursada,
    carga_horaria,
    qr_code_data_url,
    hash_unico,
  } = dados;

  // Formata data por extenso — aceita Date JS (retorno padrão do MySQL2) ou string YYYY-MM-DD
  function fmtDataExtenso(str) {
    const meses = [
      '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ];

    if (!str) return { dia: '—', mes: '—', ano: '—' };

    // Se for um objeto Date (retorno padrão do MySQL2), usa métodos UTC
    // para evitar problemas de fuso horário
    if (str instanceof Date) {
      const dia = String(str.getUTCDate()).padStart(2, '0');
      const mes = meses[str.getUTCMonth() + 1];
      const ano = String(str.getUTCFullYear());
      return { dia, mes, ano };
    }

    // Se for string — garante formato ISO YYYY-MM-DD antes do split
    // Evita o bug onde String(dateObj) vira "Fri Mar 20 2026..." sem hífens
    const iso = (typeof str === 'string' && str.includes('-') && str.length >= 10)
      ? str.slice(0, 10)
      : new Date(str).toISOString().slice(0, 10);

    const [ano, mesNum, dia] = iso.split('-');
    return { dia, mes: meses[parseInt(mesNum, 10)], ano };
  }

  const { dia, mes, ano } = fmtDataExtenso(data_fim);
  const horas = carga_horaria_cursada || carga_horaria || '—';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Certificado – ${nome_completo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #f9f5f0;
      font-family: 'Montserrat', sans-serif;
      width: 1122px;
      height: 794px;
      overflow: hidden;
    }

    #certificate {
      width: 1122px;
      height: 794px;
      background: #f9f5f0;
      position: relative;
      overflow: hidden;
    }

    /* ── HEADER ── */
    .cert-header {
      width: 100%;
      height: 175px;
      background: #e8621a;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
    }
    .circle { position: absolute; border-radius: 50%; }
    .c1 { width:180px; height:180px; background:#f0a800; left:-50px; top:-50px; }
    .c2 { width:120px; height:120px; background:#2e7d32; left:10px;  top:60px; }
    .c3 { width: 80px; height: 80px; background:#f0a800; left:100px; top:110px; }

    .cert-logo { position:relative; z-index:2; margin-left:60px; line-height:1; }
    .cert-logo .line1 { font-size:18px; font-weight:800; color:#fff; letter-spacing:1px; text-transform:uppercase; }
    .cert-logo .line2 { font-size:48px; font-weight:900; color:#f0e000; text-transform:uppercase; letter-spacing:2px; line-height:.9; margin-top:2px; }

    .cert-header-logo {
      position:absolute; right:10px; top:50%; transform:translateY(-50%);
      z-index:3; width:340px; height:auto;
    }

    /* ── FOOTER BAR ── */
    .cert-footer-bar {
      position:absolute; bottom:0; left:0; width:100%; height:48px; background:#e8621a;
    }

    /* ── BODY ── */
    .cert-body {
      position:absolute; top:175px; bottom:48px; left:0; right:0;
      padding: 0 90px;
      display:flex; flex-direction:column; justify-content:space-evenly; align-items:stretch;
    }

    .cert-title {
      text-align:center; font-size:46px; font-weight:900;
      color:#2e7d32; letter-spacing:3px; text-transform:uppercase;
    }

    .cert-text { font-size:17px; line-height:1.8; color:#555; font-weight:400; text-align:justify; }
    .cert-text strong, .cert-text .highlight { color:#2e7d32; font-weight:700; }

    /* ── SIGNATURES + QR ── */
    .cert-bottom {
      display:flex; justify-content:space-between; align-items:flex-end;
    }
    .cert-signatures { display:flex; gap:80px; }
    .signature { text-align:center; }
    .signature::before {
      content:''; display:block; width:220px; height:1.5px;
      background:#2e7d32; margin:0 auto 8px;
    }
    .signature .sig-name { font-size:14px; font-weight:700; color:#2e7d32; }
    .signature .sig-role { font-size:12px; font-weight:600; color:#2e7d32; margin-top:2px; }

    /* ── QR CODE ── */
    .cert-qr {
      display:flex; flex-direction:column; align-items:center; gap:6px;
      padding-bottom: 4px;
    }
    .cert-qr img { width:90px; height:90px; border:1px solid #ddd; border-radius:4px; }
    .cert-qr span { font-size:8px; color:#888; text-align:center; font-family:monospace; max-width:100px; word-break:break-all; }
  </style>
</head>
<body>
<div id="certificate">

  <div class="cert-header">
    <div class="circle c1"></div>
    <div class="circle c2"></div>
    <div class="circle c3"></div>
    <img class="cert-header-logo" src="${LOGO_DATA_URL}" alt="Prefeitura de Niterói Educação" />
    <div class="cert-logo">
      <div class="line1">CENTRO DE<br>FORMAÇÃO</div>
      <div class="line2">DARCY<br>RIBEIRO</div>
    </div>
  </div>

  <div class="cert-body">
    <div class="cert-title">CERTIFICADO</div>

    <p class="cert-text">
      Certificamos que <span class="highlight">${nome_completo}</span>
      participou do(a) <span class="highlight">${tipo}
      ${titulo}</span>,
      realizado(a) no <strong>Centro de Formação Darcy Ribeiro</strong>,
      promovido(a) pela <strong>Secretaria Municipal de Educação</strong>
      e pela <strong>Fundação Municipal de Educação</strong>,
      no dia ${dia} de ${mes} de ${ano},
      com carga horária de <strong>${horas}</strong> horas.
    </p>

    <div class="cert-bottom">
      <div class="cert-signatures">
        <div class="signature">
          <div class="sig-name">Ana Schilke</div>
          <div class="sig-role">Diretora do Centro de Formação Darcy Ribeiro</div>
        </div>
        <div class="signature">
          <div class="sig-name">Bira Marques</div>
          <div class="sig-role">Secretário Municipal de Educação de Niterói</div>
        </div>
      </div>

      <div class="cert-qr">
        <img src="${qr_code_data_url}" alt="QR Code de autenticidade" />
        <span>Autenticidade: ${hash_unico ? hash_unico.slice(0,18) + '...' : ''}</span>
      </div>
    </div>
  </div>

  <div class="cert-footer-bar"></div>
</div>
</body>
</html>`;
}

module.exports = { gerarHTMLCertificado };