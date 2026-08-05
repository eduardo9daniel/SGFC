/**
 * backend/src/utils/certificadoTemplate.js
 * Gera o HTML do certificado com frente e verso.
 * Usado pela rota GET /api/certificados/:codigo/pdf
 */

const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../../assets/logo_niteroi_transparente.png');
const assinaturaAnaPath = path.join(__dirname, '../../assets/assinatura_ana_schilke.png');
const assinaturaBiraPath = path.join(__dirname, '../../assets/assinatura_bira_marques.png');

const LOGO_DATA_URL = `data:image/png;base64,${fs.readFileSync(logoPath, 'base64')}`;
const ASSINATURA_ANA_DATA_URL = `data:image/png;base64,${fs.readFileSync(assinaturaAnaPath, 'base64')}`;
const ASSINATURA_BIRA_DATA_URL = `data:image/png;base64,${fs.readFileSync(assinaturaBiraPath, 'base64')}`;

function normalizarNomeCertificado(valor) {
  return String(valor || '')
    .trim()
    .toLocaleUpperCase('pt-BR');
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtDataPartes(valor) {
  const meses = [
    '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  if (!valor) return { dia: '—', mes: '—', ano: '—', completa: '—' };

  let ano;
  let mesNumero;
  let dia;

  if (valor instanceof Date) {
    dia = String(valor.getUTCDate()).padStart(2, '0');
    mesNumero = valor.getUTCMonth() + 1;
    ano = String(valor.getUTCFullYear());
  } else {
    const texto = String(valor);
    const iso = texto.includes('-') && texto.length >= 10
      ? texto.slice(0, 10)
      : new Date(valor).toISOString().slice(0, 10);

    [ano, mesNumero, dia] = iso.split('-');
    mesNumero = Number(mesNumero);
  }

  return {
    dia,
    mes: meses[mesNumero] || '—',
    ano,
    completa: `${dia}/${String(mesNumero).padStart(2, '0')}/${ano}`
  };
}

function montarPeriodo(dataInicio, dataFim) {
  const inicio = fmtDataPartes(dataInicio);
  const fim = fmtDataPartes(dataFim || dataInicio);

  if (inicio.completa === '—') return '—';
  if (inicio.completa === fim.completa) return inicio.completa;
  return `${inicio.completa} a ${fim.completa}`;
}

function montarItensConteudo(conteudo) {
  const texto = String(conteudo || '').trim();
  if (!texto) return [];

  let itens = texto
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);

  // Permite colar uma lista separada por ponto e vírgula em uma única linha.
  if (itens.length === 1 && itens[0].includes(';')) {
    itens = itens[0]
      .split(';')
      .map(item => item.trim())
      .filter(Boolean);
  }

  return itens.map(item => item.replace(/^[-•▪◦*\d.)\s]+/, '').trim());
}

/**
 * @param {object} dados
 * @param {string} dados.nome_completo
 * @param {string} dados.titulo
 * @param {string} dados.tipo
 * @param {string|Date} dados.data_inicio
 * @param {string|Date} dados.data_fim
 * @param {number} dados.carga_horaria
 * @param {number} dados.carga_horaria_cursada
 * @param {string} dados.proposito
 * @param {string} dados.conteudo_programatico
 * @param {string} dados.publico
 * @param {string} dados.local
 * @param {string} dados.responsavel
 * @param {string} dados.setor_demandante
 * @param {string} dados.qr_code_data_url
 * @param {string} dados.hash_unico
 */

function formatarNome(nome) {
  const palavrasMinusculas = [
    'da',
    'das',
    'de',
    'do',
    'dos',
    'e'
  ];

  return String(nome || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((palavra, indice) => {
      if (
        indice > 0 &&
        palavrasMinusculas.includes(palavra)
      ) {
        return palavra;
      }

      return palavra.charAt(0).toLocaleUpperCase('pt-BR') +
        palavra.slice(1);
    })
    .join(' ');
}

function gerarHTMLCertificado(dados) {
  const {
    nome_completo,
    titulo,
    tipo = 'Curso',
    data_inicio,
    data_fim,
    carga_horaria_cursada,
    carga_horaria,
    proposito,
    conteudo_programatico,
    publico,
    local,
    responsavel,
    setor_demandante,
    qr_code_data_url,
    hash_unico
  } = dados;

  const nomeParticipante = normalizarNomeCertificado(nome_completo);
  const dataFinal = fmtDataPartes(data_fim || data_inicio);
  const horas = carga_horaria_cursada || carga_horaria || '—';
  const periodo = montarPeriodo(data_inicio, data_fim);
  const itensConteudo = montarItensConteudo(conteudo_programatico);
  const totalCaracteres = itensConteudo.join(' ').length;
  const classeConteudo = itensConteudo.length > 14 || totalCaracteres > 1500
    ? 'conteudo-lista compacto'
    : itensConteudo.length > 9 || totalCaracteres > 950
      ? 'conteudo-lista medio'
      : 'conteudo-lista';

  const conteudoHtml = itensConteudo.length
    ? `<ul class="${classeConteudo}">${itensConteudo
        .map(item => `<li>${escaparHtml(item)}</li>`)
        .join('')}</ul>`
    : '<p class="conteudo-vazio">Conteúdo programático não informado.</p>';

  const hashResumido = hash_unico
    ? `${escaparHtml(hash_unico.slice(0, 22))}${hash_unico.length > 22 ? '...' : ''}`
    : '—';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Certificado – ${escaparHtml(nomeParticipante)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: A4 landscape; margin: 0; }

    html, body {
      width: 1122px;
      background: #ffffff;
      font-family: 'Montserrat', Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pagina-certificado {
      width: 1122px;
      height: 794px;
      background: #f9f5f0;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }

    .pagina-certificado:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    /* Elementos institucionais compartilhados */
    .circle { position: absolute; border-radius: 50%; }
    .c1 { width:180px; height:180px; background:#f0a800; left:-50px; top:-50px; }
    .c2 { width:120px; height:120px; background:#2e7d32; left:10px; top:60px; }
    .c3 { width:80px; height:80px; background:#f0a800; left:100px; top:110px; }

    .cert-logo { position:relative; z-index:2; margin-left:60px; line-height:1; }
    .cert-logo .line1 { font-size:18px; font-weight:800; color:#fff; letter-spacing:1px; text-transform:uppercase; }
    .cert-logo .line2 { font-size:48px; font-weight:900; color:#f0e000; text-transform:uppercase; letter-spacing:2px; line-height:.9; margin-top:2px; }

    .header-logo {
      position:absolute; right:10px; top:50%; transform:translateY(-50%);
      z-index:3; width:340px; height:auto;
    }

    .barra-rodape {
      position:absolute; bottom:0; left:0; width:100%; height:48px; background:#e8621a;
    }

    /* Frente */
    .frente-header {
      width:100%; height:175px; background:#e8621a; position:relative;
      overflow:hidden; display:flex; align-items:center;
    }

    .frente-corpo {
      position:absolute; top:175px; bottom:48px; left:0; right:0;
      padding:0 90px; display:flex; flex-direction:column;
      justify-content:space-evenly; align-items:stretch;
    }

    .cert-title {
      text-align:center; font-size:46px; font-weight:900;
      color:#2e7d32; letter-spacing:3px; text-transform:uppercase;
    }

    .cert-text { font-size:17px; line-height:1.8; color:#555; font-weight:400; text-align:justify; }
    .cert-text strong, .cert-text .highlight { color:#2e7d32; font-weight:700; }

    .cert-bottom { display:flex; justify-content:space-between; align-items:flex-end; }
    .cert-signatures { display:flex; gap:56px; align-items:flex-end; }
    .signature { width:240px; text-align:center; }
    .signature .sig-image-area {
      height:78px; display:flex; align-items:flex-end; justify-content:center;
      margin-bottom:-3px;
    }
    .signature .sig-image {
      display:block; max-width:210px; max-height:76px; object-fit:contain;
    }
    .signature .sig-line {
      width:220px; height:1.5px; background:#2e7d32; margin:0 auto 8px;
    }
    .signature .sig-name { font-size:14px; font-weight:700; color:#2e7d32; }
    .signature .sig-role { font-size:12px; font-weight:600; color:#2e7d32; margin-top:2px; }

    .cert-qr { display:flex; flex-direction:column; align-items:center; gap:5px; padding-bottom:4px; }
    .cert-qr img { width:90px; height:90px; border:1px solid #ddd; border-radius:4px; }
    .cert-qr span { font-size:8px; color:#888; text-align:center; font-family:monospace; max-width:110px; word-break:break-all; }

    /* Verso */
    .verso-header {
      height:138px; background:#e8621a; position:relative; overflow:hidden;
      display:flex; align-items:center; justify-content:center;
    }

    .verso-header .mini-logo {
      position:absolute; left:42px; top:50%; transform:translateY(-50%);
      z-index:2; font-weight:900; color:#fff; font-size:17px; line-height:1.05;
      text-transform:uppercase;
    }

    .verso-header .mini-logo strong { color:#f0e000; font-size:28px; }

    .verso-titulo {
      position:relative; z-index:2; color:#fff; text-align:center;
      font-size:30px; font-weight:900; letter-spacing:1px; text-transform:uppercase;
    }

    .verso-corpo {
      position:absolute; top:138px; bottom:48px; left:0; right:0;
      padding:30px 54px 22px;
      display:grid; grid-template-columns:330px 1fr; gap:34px;
    }

    .dados-formacao {
      background:#fff; border:1px solid #eadfd5; border-radius:14px;
      padding:22px 22px 18px; align-self:stretch;
    }

    .dados-formacao h2,
    .conteudo-programatico h2 {
      color:#2e7d32; font-size:18px; font-weight:900;
      text-transform:uppercase; letter-spacing:.5px; margin-bottom:16px;
    }

    .dado { margin-bottom:12px; }
    .dado:last-child { margin-bottom:0; }
    .dado-label {
      display:block; color:#e8621a; font-size:9px; font-weight:800;
      text-transform:uppercase; letter-spacing:.6px; margin-bottom:3px;
    }
    .dado-valor { color:#414141; font-size:11px; line-height:1.4; font-weight:600; }
    .dado-valor.objetivo { font-weight:500; text-align:justify; }

    .conteudo-programatico {
      min-width:0; display:flex; flex-direction:column;
    }

    .conteudo-lista {
      list-style:disc; column-count:2; column-gap:26px; padding-left:18px;
    }

    .conteudo-lista li {
      color:#4d4d4d;
      font-size:12px; line-height:1.34; font-weight:500;
      break-inside:avoid; margin-bottom:8px;
    }

    .conteudo-lista li::marker {
      color:#e8621a; font-size:15px;
    }

    .conteudo-lista.medio li { margin-bottom:6px; }
    .conteudo-lista.medio li { font-size:10.5px; line-height:1.27; }
    .conteudo-lista.compacto { column-gap:20px; }
    .conteudo-lista.compacto li { font-size:9px; line-height:1.2; margin-bottom:4px; }
    .conteudo-lista.compacto li::marker { font-size:12px; }

    .conteudo-vazio {
      border:1px dashed #d7c9bd; border-radius:10px; padding:18px;
      color:#777; font-size:12px; font-style:italic;
    }

    .verso-validacao {
      position:absolute; right:55px; bottom:8px; z-index:2;
      color:#fff; font-size:7px; font-family:monospace;
    }
  </style>
</head>
<body>
  <section class="pagina-certificado frente">
    <div class="frente-header">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
      <div class="circle c3"></div>
      <img class="header-logo" src="${LOGO_DATA_URL}" alt="Prefeitura de Niterói Educação" />
      <div class="cert-logo">
        <div class="line1">CENTRO DE<br>FORMAÇÃO</div>
        <div class="line2">DARCY<br>RIBEIRO</div>
      </div>
    </div>

    <div class="frente-corpo">
      <div class="cert-title">CERTIFICADO</div>
      <p class="cert-text">
        Certificamos que <span class="highlight">${escaparHtml(formatarNome(nome_completo))}</span>
        participou do(a) <span class="highlight">${escaparHtml(tipo)} ${escaparHtml(titulo)}</span>,
        realizado(a) no <strong>Centro de Formação Darcy Ribeiro</strong>,
        promovido(a) pela <strong>Secretaria Municipal de Educação</strong>
        e pela <strong>Fundação Municipal de Educação</strong>,
        no dia ${dataFinal.dia} de ${dataFinal.mes} de ${dataFinal.ano},
        com carga horária de <strong>${escaparHtml(horas)}</strong> horas.
      </p>

      <div class="cert-bottom">
        <div class="cert-signatures">
          <div class="signature">
            <div class="sig-image-area">
              <img class="sig-image" src="${ASSINATURA_ANA_DATA_URL}" alt="Assinatura de Ana Schilke" />
            </div>
            <div class="sig-line"></div>
            <div class="sig-name">Ana Schilke</div>
            <div class="sig-role">Diretora do Centro de Formação Darcy Ribeiro</div>
          </div>
          <div class="signature">
            <div class="sig-image-area">
              <img class="sig-image" src="${ASSINATURA_BIRA_DATA_URL}" alt="Assinatura de Bira Marques" />
            </div>
            <div class="sig-line"></div>
            <div class="sig-name">Bira Marques</div>
            <div class="sig-role">Secretário Municipal de Educação de Niterói</div>
          </div>
        </div>

        <div class="cert-qr">
          <img src="${qr_code_data_url}" alt="QR Code de autenticidade" />
          <span>Autenticidade: ${hashResumido}</span>
        </div>
      </div>
    </div>

    <div class="barra-rodape"></div>
  </section>

  <section class="pagina-certificado verso">
    <div class="verso-header">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
      <div class="circle c3"></div>
      <div class="mini-logo">Centro de Formação<br><strong>Darcy Ribeiro</strong></div>
      <img class="header-logo" src="${LOGO_DATA_URL}" alt="Prefeitura de Niterói Educação" />
    </div>

    <div class="verso-corpo">
      <aside class="dados-formacao">
        <h2>Dados da formação</h2>

        <div class="dado">
          <span class="dado-label">Título</span>
          <div class="dado-valor">${escaparHtml(titulo || '—')}</div>
        </div>

        <div class="dado">
          <span class="dado-label">Período de realização</span>
          <div class="dado-valor">${escaparHtml(periodo)}</div>
        </div>

        <div class="dado">
          <span class="dado-label">Carga horária</span>
          <div class="dado-valor">${escaparHtml(horas)} horas</div>
        </div>

        <div class="dado">
          <span class="dado-label">Público-alvo</span>
          <div class="dado-valor">${escaparHtml(publico || 'Não informado')}</div>
        </div>

        <div class="dado">
          <span class="dado-label">Local</span>
          <div class="dado-valor">${escaparHtml(local || 'Centro de Formação Darcy Ribeiro')}</div>
        </div>

        <div class="dado">
          <span class="dado-label">Responsável</span>
          <div class="dado-valor">${escaparHtml(responsavel || 'Não informado')}</div>
        </div>

        <div class="dado">
          <span class="dado-label">Setor demandante</span>
          <div class="dado-valor">${escaparHtml(setor_demandante || 'Não informado')}</div>
        </div>

        <div class="dado">
          <span class="dado-label">Objetivo</span>
          <div class="dado-valor objetivo">${escaparHtml(proposito || 'Não informado')}</div>
        </div>
      </aside>

      <main class="conteudo-programatico">
        <h2>Conteúdo programático</h2>
        ${conteudoHtml}
      </main>
    </div>

    <div class="barra-rodape"></div>
    <div class="verso-validacao">Código de autenticidade: ${hashResumido}</div>
  </section>
</body>
</html>`;
}

module.exports = { gerarHTMLCertificado };
