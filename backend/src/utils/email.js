const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function enviarCodigoPrimeiroAcesso({ para, nome, codigo }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: para,
    subject: 'Código de confirmação - Centro de Formação Darcy Ribeiro',
    html: `
      <p>Olá, <strong>${nome}</strong>.</p>

      <p>Seu código de confirmação para o primeiro acesso é:</p>

      <h2 style="letter-spacing:4px;">${codigo}</h2>

      <p>Este código é válido por 10 minutos.</p>

      <p>Se você não solicitou este código, ignore este e-mail.</p>
    `
  });
}

module.exports = {
  enviarCodigoPrimeiroAcesso
};