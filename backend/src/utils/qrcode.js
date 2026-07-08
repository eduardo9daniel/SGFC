/**
 * utils/qrcode.js
 * Gerador de QR Code para certificados
 * Dependência: npm install qrcode
 */

const QRCode = require('qrcode');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Gera o QR Code como Data URL (base64 PNG) — pronto para embutir em HTML/PDF.
 * @param {string} hash - hash_unico do certificado
 * @returns {Promise<string>} data:image/png;base64,...
 */
async function gerarQRCodeDataURL(hash) {
  const url = `${BASE_URL}/validar/${hash}`;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',   // máxima correção (suporta até 30% de dano)
    type: 'image/png',
    width: 220,
    margin: 2,
    color: {
      dark:  '#1a1a2e',          // cor dos módulos (escuro)
      light: '#ffffff',          // fundo branco
    },
  });
}

/**
 * Gera o QR Code como Buffer PNG — para enviar como resposta binária ou salvar em disco.
 * @param {string} hash
 * @returns {Promise<Buffer>}
 */
async function gerarQRCodeBuffer(hash) {
  const url = `${BASE_URL}/validar/${hash}`;
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    type: 'png',
    width: 400,
    margin: 2,
  });
}

/**
 * Retorna apenas a URL de validação correspondente ao hash.
 * @param {string} hash
 * @returns {string}
 */
function urlValidacao(hash) {
  return `${BASE_URL}/validar/${hash}`;
}

module.exports = { gerarQRCodeDataURL, gerarQRCodeBuffer, urlValidacao };

