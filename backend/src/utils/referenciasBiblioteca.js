const PREFIXOS_VALIDOS = new Set(['DISS', 'TESE', 'PESQ']);

function prefixoPorTipoTrabalho(tipoTrabalho = '') {
  const tipo = String(tipoTrabalho).trim().toLowerCase();

  if (tipo === 'dissertação' || tipo === 'dissertacao') {
    return 'DISS';
  }

  if (tipo === 'tese') {
    return 'TESE';
  }

  return null;
}

async function gerarCodigoReferencia(connection, prefixo) {
  if (!PREFIXOS_VALIDOS.has(prefixo)) {
    throw new Error('Prefixo de referência inválido.');
  }

  await connection.query(
    `
    INSERT IGNORE INTO biblioteca_sequencias
      (prefixo, ultimo_numero)
    VALUES (?, 0)
    `,
    [prefixo]
  );

  const [rows] = await connection.query(
    `
    SELECT ultimo_numero
    FROM biblioteca_sequencias
    WHERE prefixo = ?
    FOR UPDATE
    `,
    [prefixo]
  );

  const proximoNumero = Number(rows[0]?.ultimo_numero || 0) + 1;

  await connection.query(
    `
    UPDATE biblioteca_sequencias
    SET ultimo_numero = ?
    WHERE prefixo = ?
    `,
    [proximoNumero, prefixo]
  );

  return `${prefixo}-${String(proximoNumero).padStart(3, '0')}`;
}

module.exports = {
  gerarCodigoReferencia,
  prefixoPorTipoTrabalho
};
