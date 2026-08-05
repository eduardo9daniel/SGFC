const db = require('../config/db');

const INTERVALO_PADRAO_MS = 60 * 1000;
const FUSO_HORARIO =
  process.env.APP_TIMEZONE || 'America/Sao_Paulo';

const TURNOS_VALIDOS = [
  'manha',
  'tarde',
  'noite'
];

/**
 * Retorna a data e a hora atuais no formato:
 * YYYY-MM-DD HH:mm:ss
 *
 * O horário considerado é o de Niterói/Rio de Janeiro.
 */
function obterDataHoraAtual() {
  const partes = new Intl.DateTimeFormat(
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

  const valores = Object.fromEntries(
    partes.map((parte) => [
      parte.type,
      parte.value
    ])
  );

  return (
    `${valores.year}-${valores.month}-${valores.day} ` +
    `${valores.hour}:${valores.minute}:${valores.second}`
  );
}

/**
 * Converte o campo turnos do banco em uma lista.
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
    const turnos = JSON.parse(
      String(valor)
    );

    return Array.isArray(turnos)
      ? turnos.filter((turno) =>
          TURNOS_VALIDOS.includes(turno)
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Descobre o primeiro horário de início,
 * o último horário de encerramento e os
 * períodos individuais de cada turno.
 *
 * Exemplo:
 *
 * Manhã: 08:00 até 12:00
 * Tarde: 14:00 até 17:00
 *
 * Início considerado: 08:00
 * Encerramento considerado: 17:00
 *
 * O intervalo entre 12:00 e 14:00 não será
 * considerado como formação em andamento.
 */
function obterPeriodoDaFormacao(formacao) {
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
    lerTurnos(formacao.turnos);

  /*
   * Caso o registro seja antigo e não possua
   * o campo turnos preenchido, considera todos
   * os horários que estiverem disponíveis.
   */
  const turnosConsiderados =
    turnosCadastrados.length
      ? turnosCadastrados
      : TURNOS_VALIDOS;

  /*
   * Mantém apenas turnos que possuem
   * horário inicial e final válidos.
   */
  const periodosTurnos =
    turnosConsiderados
      .map((turno) => ({
        inicio:
          horarios[turno]?.inicio,

        fim:
          horarios[turno]?.fim
      }))
      .filter(
        (periodo) =>
          periodo.inicio &&
          periodo.fim &&
          periodo.inicio <
            periodo.fim
      );

  /*
   * Caso uma formação antiga não possua horário,
   * considera o início e o final do dia.
   */
  const periodosConsiderados =
    periodosTurnos.length
      ? periodosTurnos
      : [
          {
            inicio: '00:00:00',
            fim: '23:59:59'
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

  const dataInicio =
    formacao.data_inicio;

  const dataFimOriginal =
    formacao.data_fim ||
    dataInicio;

  /*
   * Evita erro caso exista algum registro antigo
   * com data final anterior à data inicial.
   */
  const dataFim =
    dataFimOriginal < dataInicio
      ? dataInicio
      : dataFimOriginal;

  return {
    dataInicio,
    dataFim,
    primeiroHorario,
    ultimoHorario,
    periodosTurnos:
      periodosConsiderados
  };
}

/**
 * Verifica se o horário atual está dentro
 * de algum turno cadastrado na formação.
 */
function estaDentroDeUmTurno(
  horaAtual,
  periodosTurnos
) {
  return periodosTurnos.some(
    (periodo) =>
      horaAtual >= periodo.inicio &&
      horaAtual < periodo.fim
  );
}

/**
 * Atualiza um grupo de formações para
 * um determinado status.
 */
async function atualizarGrupo(
  status,
  ids
) {
  if (!ids.length) {
    return 0;
  }

  const marcadores = ids
    .map(() => '?')
    .join(', ');

  const [resultado] =
    await db.query(
      `
        UPDATE formacoes
        SET status = ?
        WHERE id IN (${marcadores})
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
    resultado.affectedRows || 0
  );
}

/**
 * Atualiza automaticamente o status das formações.
 *
 * Regras:
 *
 * 1. Antes da data e do horário inicial:
 *    aberta.
 *
 * 2. Durante um dos turnos cadastrados:
 *    andamento.
 *
 * 3. Nos intervalos entre turnos ou entre
 *    os dias da formação:
 *    aberta.
 *
 * 4. A partir do último horário de encerramento
 *    da última data:
 *    concluída.
 *
 * 5. Formações canceladas ou já concluídas
 *    não são alteradas.
 */
async function atualizarStatusFormacoesAutomaticamente() {
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
    if (!formacao.data_inicio) {
      continue;
    }

    const periodo =
      obterPeriodoDaFormacao(
        formacao
      );

    const emHorarioDeTurno =
      estaDentroDeUmTurno(
        horaAtual,
        periodo.periodosTurnos
      );

    let novoStatus;

    /*
     * Ainda não chegou à primeira data.
     */
    if (
      dataAtual < periodo.dataInicio
    ) {
      novoStatus = 'aberta';
    }

    /*
     * A última data já passou.
     */
    else if (
      dataAtual > periodo.dataFim
    ) {
      novoStatus = 'concluida';
    }

    /*
     * No último dia, depois do último
     * horário, a formação é concluída.
     */
    else if (
      dataAtual === periodo.dataFim &&
      horaAtual >= periodo.ultimoHorario
    ) {
      novoStatus = 'concluida';
    }

    /*
     * Durante qualquer dia compreendido
     * entre a data inicial e a data final,
     * fica em andamento somente dentro
     * de um dos turnos cadastrados.
     */
    else if (
      emHorarioDeTurno
    ) {
      novoStatus = 'andamento';
    }

    /*
     * Antes do horário diário, no intervalo
     * entre turnos, depois do encontro de um
     * dia intermediário ou durante a madrugada.
     */
    else {
      novoStatus = 'aberta';
    }

    if (
      novoStatus !==
      formacao.status
    ) {
      grupos[novoStatus].push(
        formacao.id
      );
    }
  }

  const [
    totalAbertas,
    totalAndamento,
    totalConcluidas
  ] = await Promise.all([
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
 * Executa imediatamente quando o servidor inicia
 * e depois repete a verificação a cada minuto.
 */
function iniciarAtualizacaoAutomaticaFormacoes(
  intervaloMs =
    INTERVALO_PADRAO_MS
) {
  let verificacaoEmAndamento =
    false;

  const executar = async () => {
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
        resultado.total > 0
      ) {
        console.log(
          '✅ Status das formações atualizados automaticamente:',
          resultado
        );
      }
    } catch (erro) {
      console.error(
        '❌ Erro ao atualizar os status das formações:',
        erro
      );
    } finally {
      verificacaoEmAndamento =
        false;
    }
  };

  /*
   * Primeira verificação imediatamente.
   */
  executar();

  /*
   * Próximas verificações a cada minuto.
   */
  const temporizador =
    setInterval(
      executar,
      intervaloMs
    );

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

  /*
   * Mantém compatibilidade com o nome
   * utilizado atualmente em formacoes.js.
   */
  atualizarStatusFormacoesVencidas:
    atualizarStatusFormacoesAutomaticamente,

  iniciarAtualizacaoAutomaticaFormacoes
};