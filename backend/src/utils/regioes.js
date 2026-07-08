const db = require('../config/db');

function limparNomeRegiao(nome) {
  return String(nome || '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function obterOuCriarRegiaoId({ regiao_id, regiao_nome }) {
  const idNumerico = Number(regiao_id);

  if (idNumerico > 0) {
    const [rows] = await db.query(
      'SELECT id FROM regioes WHERE id = ? LIMIT 1',
      [idNumerico]
    );

    if (rows.length) {
      return idNumerico;
    }
  }

  const nomeRegiao = limparNomeRegiao(regiao_nome);

  if (!nomeRegiao) {
    return null;
  }

  const [existente] = await db.query(
    `
    SELECT id 
    FROM regioes 
    WHERE TRIM(nome) = TRIM(?)
    LIMIT 1
    `,
    [nomeRegiao]
  );

  if (existente.length) {
    return existente[0].id;
  }

  const [result] = await db.query(
    'INSERT INTO regioes (nome) VALUES (?)',
    [nomeRegiao]
  );

  return result.insertId;
}

module.exports = {
  obterOuCriarRegiaoId
};