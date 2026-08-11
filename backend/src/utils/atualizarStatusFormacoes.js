const db = require('../config/db');

const INTERVALO_PADRAO_MS = 60 * 1000;

const FUSO_HORARIO =
  process.env.APP_TIMEZONE ||
  'America/Sao_Paulo';

const TURNOS_VALIDOS = [
  'manha',
  'tarde',
  'noite'
];

/**
 * Retorna a data e a hora atuais no formato:
 * YYYY-MM-DD HH:mm:ss
 *
 * O horário considerado é o de
 * Niterói/Rio de Janeiro.
 */
function obterDataHoraAtual() {
  const partes =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: FUSO_HORARIO,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }
    ).formatToParts(new Date());

  const valores =
    Object.fromEntries(
      partes.map((parte) => [
        parte.type,
        parte.value
      ])
    );

  return (
    `${valores.year}-` +
    `${valores.month}-` +
    `${valores.day} ` +
    `${valores.hour}:` +
    `${valores.minute}:` +
    `${valores.second}`
  );
}

/**
 * Converte o campo turnos do banco
 * em uma lista.
 */
function lerTurnos(valor) {
  if (Array.isArray(valor)) {
    return valor.filter((turno) =>
      TURNOS_VALIDOS.includes(turno)
    );
  }

  if (!valor) {
    return [];
  }

  try {
    const turnos =
      JSON.parse(
        String(valor)
      );

    return Array.isArray(turnos)
      ? turnos.filter((turno) =>
          TURNOS_VALIDOS.includes(
            turno
          )
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Converte datas do banco ou
 * do formulário para YYYY-MM-DD.
 */
function normalizarData(valor) {
  if (!valor) {
    return null;
  }

  if (
    valor instanceof Date &&
    !Number.isNaN(valor.getTime())
  ) {
    const ano =
      valor.getFullYear();

    const mes =
      String(
        valor.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        valor.getDate()
      ).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  const texto =
    String(valor).trim();

  if (
    /^\d{4}-\d{2}-\d{2}/.test(
      texto
    )
  ) {
    return texto.slice(0, 10);
  }

  const brasileira =
    texto.match(
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

/**
 * Converte outras_datas em uma
 * lista de datas válidas e sem
 * duplicidade.
 */
function extrairOutrasDatas(valor) {
  if (!valor) {
    return [];
  }

  return [
    ...new Set(
      String(valor)
        .split(/[;,\n|]+/)
        .map((parte) =>
          normalizarData(
            parte.trim()
          )
        )
        .filter(Boolean)
    )
  ];
}

/**
 * Descobre:
 *
 * - primeiro horário;
 * - último horário;
 * - períodos dos turnos;
 * - data inicial principal;
 * - data final principal;
 * - datas adicionais;
 * - última data real da formação.
 */
function obterPeriodoDaFormacao(
  formacao
) {
  const horarios = {
    manha: {
      inicio:
        formacao.hora_inicio_manha,

      fim:
        formacao.hora_fim_manha
    },

    tarde: {
      inicio:
        formacao.hora_inicio_tarde,

      fim:
        formacao.hora_fim_tarde
    },

    noite: {
      inicio:
        formacao.hora_inicio_noite,

      fim:
        formacao.hora_fim_noite
    }
  };

  const turnosCadastrados =
    lerTurnos(
      formacao.turnos
    );

  /*
   * Caso o registro seja antigo e não
   * possua turnos cadastrados, verifica
   * todos os horários disponíveis.
   */
  const turnosConsiderados =
    turnosCadastrados.length
      ? turnosCadastrados
      : TURNOS_VALIDOS;

  /*
   * Mantém apenas turnos que possuem
   * início e fim válidos.
   */
  const periodosTurnos =
    turnosConsiderados
      .map((turno) => ({
        inicio:
          horarios[turno]
            ?.inicio,

        fim:
          horarios[turno]
            ?.fim
      }))
      .filter(
        (periodo) =>
          periodo.inicio &&
          periodo.fim &&
          periodo.inicio <
            periodo.fim
      );

  /*
   * Formação antiga sem horários:
   * considera o dia inteiro.
   */
  const periodosConsiderados =
    periodosTurnos.length
      ? periodosTurnos
      : [
          {
            inicio:
              '00:00:00',

            fim:
              '23:59:59'
          }
        ];

  const horariosInicio =
    periodosConsiderados
      .map((periodo) =>
        periodo.inicio
      )
      .sort();

  const horariosFim =
    periodosConsiderados
      .map((periodo) =>
        periodo.fim
      )
      .sort();

  const primeiroHorario =
    horariosInicio[0];

  const ultimoHorario =
    horariosFim[
      horariosFim.length - 1
    ];

  const dataInicioPrincipal =
    normalizarData(
      formacao.data_inicio
    );

  if (!dataInicioPrincipal) {
    return null;
  }

  const dataFimInformada =
    normalizarData(
      formacao.data_fim
    ) ||
    dataInicioPrincipal;

  /*
   * Protege registros antigos com
   * data final anterior à inicial.
   */
  const dataFimPrincipal =
    dataFimInformada <
    dataInicioPrincipal
      ? dataInicioPrincipal
      : dataFimInformada;

  /*
   * Datas adicionais somente fazem
   * parte da formação quando repete
   * estiver marcado como sim.
   */
  const outrasDatas =
    formacao.repete === 'sim'
      ? extrairOutrasDatas(
          formacao.outras_datas
        )
      : [];

  /*
   * Junta as datas para descobrir
   * o primeiro e o último encontro
   * real da formação.
   */
  const datasConsideradas = [
    dataInicioPrincipal,
    dataFimPrincipal,
    ...outrasDatas
  ]
    .filter(Boolean)
    .sort();

  const dataInicio =
    datasConsideradas[0] ||
    dataInicioPrincipal;

  const ultimaData =
    datasConsideradas[
      datasConsideradas.length - 1
    ] ||
    dataFimPrincipal;

  return {
    dataInicioPrincipal,
    dataFimPrincipal,

    dataInicio,

    dataFim:
      dataFimPrincipal,

    ultimaData,

    outrasDatas,

    primeiroHorario,
    ultimoHorario,

    periodosTurnos:
      periodosConsiderados
  };
}

/**
 * Verifica se hoje é realmente uma
 * data de encontro da formação.
 *
 * O período principal compreende
 * data_inicio até data_fim.
 *
 * outras_datas são encontros
 * adicionais.
 */
function ehDataDeEncontro(
  dataAtual,
  periodo
) {
  const dentroDoPeriodoPrincipal =
    dataAtual >=
      periodo.dataInicioPrincipal &&
    dataAtual <=
      periodo.dataFimPrincipal;

  const ehDataAdicional =
    periodo.outrasDatas.includes(
      dataAtual
    );

  return (
    dentroDoPeriodoPrincipal ||
    ehDataAdicional
  );
}

/**
 * Verifica se o horário atual está
 * dentro de algum turno cadastrado.
 */
function estaDentroDeUmTurno(
  horaAtual,
  periodosTurnos
) {
  return periodosTurnos.some(
    (periodo) =>
      horaAtual >=
        periodo.inicio &&
      horaAtual <
        periodo.fim
  );
}

/**
 * Atualiza um grupo de formações
 * para determinado status.
 */
async function atualizarGrupo(
  status,
  ids
) {
  if (!ids.length) {
    return 0;
  }

  const marcadores =
    ids
      .map(() => '?')
      .join(', ');

  const [resultado] =
    await db.query(
      `
        UPDATE formacoes

        SET status = ?

        WHERE id IN (
          ${marcadores}
        )

        AND status IN (
          'aberta',
          'andamento'
        )
      `,
      [
        status,
        ...ids
      ]
    );

  return Number(
    resultado.affectedRows ||
      0
  );
}

/**
 * Atualiza automaticamente o status
 * das formações.
 *
 * REGRAS
 *
 * 1. Antes da primeira data:
 *    aberta.
 *
 * 2. Durante um turno cadastrado em
 *    uma data real de encontro:
 *    andamento.
 *
 * 3. Entre turnos:
 *    aberta.
 *
 * 4. Entre uma data principal e uma
 *    outra_data futura:
 *    aberta.
 *
 * 5. Depois do último horário da
 *    última data real:
 *    concluída.
 *
 * 6. Formações canceladas ou já
 *    concluídas não são alteradas.
 */
async function
atualizarStatusFormacoesAutomaticamente() {
  const agora =
    obterDataHoraAtual();

  const [
    dataAtual,
    horaAtual
  ] = agora.split(' ');

  const [formacoes] =
    await db.query(
      `
        SELECT
          id,
          status,

          DATE_FORMAT(
            data_inicio,
            '%Y-%m-%d'
          ) AS data_inicio,

          DATE_FORMAT(
            COALESCE(
              data_fim,
              data_inicio
            ),
            '%Y-%m-%d'
          ) AS data_fim,

          repete,

          outras_datas,

          turnos,

          TIME_FORMAT(
            hora_inicio_manha,
            '%H:%i:%s'
          ) AS hora_inicio_manha,

          TIME_FORMAT(
            hora_fim_manha,
            '%H:%i:%s'
          ) AS hora_fim_manha,

          TIME_FORMAT(
            hora_inicio_tarde,
            '%H:%i:%s'
          ) AS hora_inicio_tarde,

          TIME_FORMAT(
            hora_fim_tarde,
            '%H:%i:%s'
          ) AS hora_fim_tarde,

          TIME_FORMAT(
            hora_inicio_noite,
            '%H:%i:%s'
          ) AS hora_inicio_noite,

          TIME_FORMAT(
            hora_fim_noite,
            '%H:%i:%s'
          ) AS hora_fim_noite

        FROM formacoes

        WHERE status IN (
          'aberta',
          'andamento'
        )
      `
    );

  const grupos = {
    aberta: [],
    andamento: [],
    concluida: []
  };

  for (
    const formacao of formacoes
  ) {
    if (
      !formacao.data_inicio
    ) {
      continue;
    }

    const periodo =
      obterPeriodoDaFormacao(
        formacao
      );

    if (!periodo) {
      continue;
    }

    const emDataDeEncontro =
      ehDataDeEncontro(
        dataAtual,
        periodo
      );

    const emHorarioDeTurno =
      estaDentroDeUmTurno(
        horaAtual,
        periodo.periodosTurnos
      );

    let novoStatus;

    /*
     * Ainda não chegou à primeira
     * data real da formação.
     */
    if (
      dataAtual <
      periodo.dataInicio
    ) {
      novoStatus =
        'aberta';
    }

    /*
     * Já passou da última data real,
     * incluindo outras_datas.
     */
    else if (
      dataAtual >
      periodo.ultimaData
    ) {
      novoStatus =
        'concluida';
    }

    /*
     * Estamos na última data real e
     * o último turno já terminou.
     */
    else if (
      dataAtual ===
        periodo.ultimaData &&
      horaAtual >=
        periodo.ultimoHorario
    ) {
      novoStatus =
        'concluida';
    }

    /*
     * É uma data real de encontro
     * e estamos dentro de um dos
     * turnos cadastrados.
     */
    else if (
      emDataDeEncontro &&
      emHorarioDeTurno
    ) {
      novoStatus =
        'andamento';
    }

    /*
     * Antes do horário inicial,
     * entre turnos, após encontro
     * intermediário ou entre datas
     * repetidas.
     */
    else {
      novoStatus =
        'aberta';
    }

    if (
      novoStatus !==
      formacao.status
    ) {
      grupos[
        novoStatus
      ].push(
        formacao.id
      );
    }
  }

  const [
    totalAbertas,
    totalAndamento,
    totalConcluidas
  ] =
    await Promise.all([
      atualizarGrupo(
        'aberta',
        grupos.aberta
      ),

      atualizarGrupo(
        'andamento',
        grupos.andamento
      ),

      atualizarGrupo(
        'concluida',
        grupos.concluida
      )
    ]);

  return {
    aberta:
      totalAbertas,

    andamento:
      totalAndamento,

    concluida:
      totalConcluidas,

    total:
      totalAbertas +
      totalAndamento +
      totalConcluidas
  };
}

/**
 * Inicia a verificação automática.
 *
 * Executa uma vez imediatamente
 * quando o servidor inicia e depois
 * repete a cada minuto.
 */
function
iniciarAtualizacaoAutomaticaFormacoes(
  intervaloMs =
    INTERVALO_PADRAO_MS
) {
  let verificacaoEmAndamento =
    false;

  const executar =
    async () => {
      if (
        verificacaoEmAndamento
      ) {
        return;
      }

      verificacaoEmAndamento =
        true;

      try {
        const resultado =
          await atualizarStatusFormacoesAutomaticamente();

        if (
          resultado.total >
          0
        ) {
          console.log(
            '✅ Status das formações ' +
            'atualizados automaticamente:',
            resultado
          );
        }
      } catch (erro) {
        console.error(
          '❌ Erro ao atualizar ' +
          'os status das formações:',
          erro
        );
      } finally {
        verificacaoEmAndamento =
          false;
      }
    };

  /*
   * Primeira verificação
   * imediatamente.
   */
  executar();

  /*
   * Próximas verificações
   * automaticamente.
   */
  const temporizador =
    setInterval(
      executar,
      intervaloMs
    );

  /*
   * Não impede o encerramento
   * normal do processo Node.
   */
  if (
    typeof temporizador.unref ===
    'function'
  ) {
    temporizador.unref();
  }

  return temporizador;
}

module.exports = {
  atualizarStatusFormacoesAutomaticamente,
  iniciarAtualizacaoAutomaticaFormacoes
};