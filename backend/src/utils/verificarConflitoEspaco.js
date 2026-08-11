const TURNOS_VALIDOS = [
  'manha',
  'tarde',
  'noite'
];

const LABELS_TURNO = {
  manha: 'manhã',
  tarde: 'tarde',
  noite: 'noite'
};

function parseJsonCampo(valor, fallback) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return fallback;
  }

  if (typeof valor === 'object') {
    return valor;
  }

  try {
    return JSON.parse(valor);
  } catch {
    return fallback;
  }
}

function dataIsoSegura(valor) {
  if (!valor) {
    return null;
  }

  if (
    valor instanceof Date &&
    !Number.isNaN(valor.getTime())
  ) {
    const ano = valor.getFullYear();

    const mes = String(
      valor.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      valor.getDate()
    ).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  const texto = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return texto.slice(0, 10);
  }

  const brasileira = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (brasileira) {
    return (
      `${brasileira[3]}-` +
      `${brasileira[2]}-` +
      `${brasileira[1]}`
    );
  }

  return null;
}

function dataParaNumero(data) {
  const [ano, mes, dia] =
    data.split('-').map(Number);

  return Date.UTC(
    ano,
    mes - 1,
    dia
  );
}

function numeroParaData(numero) {
  return new Date(numero)
    .toISOString()
    .slice(0, 10);
}

function datasNoIntervalo(inicio, fim) {
  const inicioValido =
    dataIsoSegura(inicio);

  const fimValido =
    dataIsoSegura(fim) ||
    inicioValido;

  if (
    !inicioValido ||
    !fimValido
  ) {
    return [];
  }

  const primeiro =
    dataParaNumero(inicioValido);

  const ultimo =
    dataParaNumero(fimValido);

  if (primeiro > ultimo) {
    return [];
  }

  const datas = [];

  const umDia =
    24 * 60 * 60 * 1000;

  for (
    let atual = primeiro;
    atual <= ultimo;
    atual += umDia
  ) {
    datas.push(
      numeroParaData(atual)
    );
  }

  return datas;
}

function extrairOutrasDatas(valor) {
  if (!valor) {
    return [];
  }

  return String(valor)
    .split(/[;,\n|]+/)
    .map(parte => parte.trim())
    .filter(Boolean)
    .map(dataIsoSegura)
    .filter(Boolean);
}

function datasDaReserva({
  dataInicio,
  dataFim,
  repete,
  outrasDatas
}) {
  const datas = new Set(
    datasNoIntervalo(
      dataInicio,
      dataFim
    )
  );

  if (repete === 'sim') {
    for (
      const data of
      extrairOutrasDatas(outrasDatas)
    ) {
      datas.add(data);
    }
  }

  return datas;
}

function turnosDaReserva({
  turnos,
  horaInicioManha,
  horaFimManha,
  horaInicioTarde,
  horaFimTarde,
  horaInicioNoite,
  horaFimNoite
}) {
  const informados =
    parseJsonCampo(turnos, []);

  const resultado =
    Array.isArray(informados)
      ? informados.filter(turno =>
          TURNOS_VALIDOS.includes(turno)
        )
      : [];

  if (resultado.length) {
    return new Set(resultado);
  }

  if (
    horaInicioManha ||
    horaFimManha
  ) {
    resultado.push('manha');
  }

  if (
    horaInicioTarde ||
    horaFimTarde
  ) {
    resultado.push('tarde');
  }

  if (
    horaInicioNoite ||
    horaFimNoite
  ) {
    resultado.push('noite');
  }

  return new Set(resultado);
}

function formatarData(data) {
  const [ano, mes, dia] =
    data.split('-');

  return `${dia}/${mes}/${ano}`;
}

async function verificarConflitoEspaco(
  executor,
  {
    espaco,
    dataInicio,
    dataFim,
    repete = 'nao',
    outrasDatas = null,
    turnos = [],
    status = 'aberta',
    ignorarFormacaoId = null
  }
) {
  const espacoNormalizado =
    String(espaco || '').trim();

  if (
    !espacoNormalizado ||
    status === 'cancelada'
  ) {
    return null;
  }

  const novasDatas =
    datasDaReserva({
      dataInicio,
      dataFim,
      repete,
      outrasDatas
    });

  const novosTurnos =
    turnosDaReserva({
      turnos
    });

  if (
    !novasDatas.size ||
    !novosTurnos.size
  ) {
    return null;
  }

  let sql = `
    SELECT
      id,
      titulo,
      local,
      status,
      data_inicio,
      data_fim,
      repete,
      outras_datas,
      turnos,
      hora_inicio_manha,
      hora_fim_manha,
      hora_inicio_tarde,
      hora_fim_tarde,
      hora_inicio_noite,
      hora_fim_noite
    FROM formacoes
    WHERE status <> 'cancelada'
      AND LOWER(TRIM(local)) =
          LOWER(TRIM(?))
  `;

  const params = [
    espacoNormalizado
  ];

  if (ignorarFormacaoId) {
    sql += ' AND id <> ?';

    params.push(
      ignorarFormacaoId
    );
  }

  const [formacoes] =
    await executor.query(
      sql,
      params
    );

  for (const formacao of formacoes) {
    const datasExistentes =
      datasDaReserva({
        dataInicio:
          formacao.data_inicio,

        dataFim:
          formacao.data_fim,

        repete:
          formacao.repete,

        outrasDatas:
          formacao.outras_datas
      });

    const dataConflito =
      [...novasDatas]
        .sort()
        .find(data =>
          datasExistentes.has(data)
        );

    if (!dataConflito) {
      continue;
    }

    const turnosExistentes =
      turnosDaReserva({
        turnos:
          formacao.turnos,

        horaInicioManha:
          formacao.hora_inicio_manha,

        horaFimManha:
          formacao.hora_fim_manha,

        horaInicioTarde:
          formacao.hora_inicio_tarde,

        horaFimTarde:
          formacao.hora_fim_tarde,

        horaInicioNoite:
          formacao.hora_inicio_noite,

        horaFimNoite:
          formacao.hora_fim_noite
      });

    const turnoConflito =
      [...novosTurnos]
        .find(turno =>
          turnosExistentes.has(turno)
        );

    if (!turnoConflito) {
      continue;
    }

    return {
      formacaoId:
        formacao.id,

      titulo:
        formacao.titulo,

      espaco:
        espacoNormalizado,

      data:
        dataConflito,

      turno:
        turnoConflito,

      mensagem:
        `O espaço "${espacoNormalizado}" ` +
        `já está reservado em ` +
        `${formatarData(dataConflito)}, ` +
        `no turno da ` +
        `${LABELS_TURNO[turnoConflito]}, ` +
        `para a formação ` +
        `"${formacao.titulo}". ` +
        `Escolha outro espaço, data ou turno.`
    };
  }

  return null;
}

module.exports = {
  verificarConflitoEspaco
};