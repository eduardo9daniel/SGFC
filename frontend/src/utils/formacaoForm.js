export const ESPACOS_FORMACAO = [
  'Clube Linguagens',
  'Ateliê Linguagens',
  'Ateliê Linguagens e Sabor',
  'Linguagens e Maker',
  'Clubes e Ateliês',
  'Clubes e Ateliês, Sala de Trabalho 2',
  'Lélia',
  'Carolina',
  'Carolina e Lélia',
  'Carolina e Maker',
  'Inovação e Maker',
  'Sala Maker',
  'Clubes - Sala Maker',
  'Sala de Trabalho 2',
  'Carolina (manhã e tarde)'
];

export const TURNOS_FORMACAO = [
  { id: 'manha', label: 'Manhã' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noite', label: 'Noite' }
];

export function criarFormularioFormacaoVazio() {
  return {
    setor: '',
    titulo: '',
    proposito: '',
    conteudoProgramatico: '',
    carga_horaria: '',
    espaco: '',
    publico: '',
    onibus: 'nao',

    respNome: '',
    respTel: '',
    respEmail: '',

    dataEncontro: '',
    dataFim: '',
    repete: 'nao',
    outrasDatas: '',

    turnos: {
      manha: false,
      tarde: false,
      noite: false
    },

    qtdManha: '',
    qtdTarde: '',
    qtdNoite: '',

    horaInicioManha: '',
    horaFimManha: '',

    horaInicioTarde: '',
    horaFimTarde: '',

    horaInicioNoite: '',
    horaFimNoite: '',

    horaChegada: '',

    equipamentos: {
      datashow: 0,
      som: 0,
      microfone: 0
    },

    layoutCadeiras: '',
    mesas: 'nao',
    qtdMesas: '',
    acessibilidade: '',
    coffee: 'nao',
    convidadosEspeciais: '',
    observacoes: '',
    status: 'aberta'
  };
}

function parseJson(valor, fallback) {
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

function normalizarQuantidadeEquipamento(valor) {
  if (valor === true) {
    return 1;
  }

  if (
    valor === false ||
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return 0;
  }

  const quantidade = Number(valor);

  return Number.isFinite(quantidade) &&
    quantidade >= 0
    ? Math.trunc(quantidade)
    : 0;
}

function normalizarTurno(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function extrairTrechoRotulado(
  texto,
  rotulo
) {
  if (!texto) {
    return '';
  }

  const escapado = rotulo.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const regex = new RegExp(
    `${escapado}:\\s*\\n?([\\s\\S]*?)(?=\\n\\n[^\\n]+:\\s*\\n?|$)`,
    'i'
  );

  return (
    texto.match(regex)?.[1]?.trim() || ''
  );
}

function extrairHorarioLegado(horario) {
  const match = String(
    horario || ''
  ).match(
    /(\d{2}:\d{2})\s*(?:às|a|-)\s*(\d{2}:\d{2})/i
  );

  return match
    ? {
        inicio: match[1],
        fim: match[2]
      }
    : {
        inicio: '',
        fim: ''
      };
}

function turnosDoRegistro(registro) {
  const lista = parseJson(
    registro.turnos,
    []
  );

  const normalizados = Array.isArray(lista)
    ? lista.map(normalizarTurno)
    : [];

  const horario = String(
    registro.horario || ''
  ).toLowerCase();

  return {
    manha:
      normalizados.includes('manha') ||
      horario.includes('manhã') ||
      horario.includes('manha'),

    tarde:
      normalizados.includes('tarde') ||
      horario.includes('tarde'),

    noite:
      normalizados.includes('noite') ||
      horario.includes('noite')
  };
}

export function registroParaFormularioFormacao(
  registro = {}
) {
  const base =
    criarFormularioFormacaoVazio();

  const descricao =
    registro.descricao || '';

  const propositoLegado =
    extrairTrechoRotulado(
      descricao,
      'Propósito / Objetivo'
    );

  const conteudoProgramaticoLegado =
    extrairTrechoRotulado(
      descricao,
      'Conteúdo Programático'
    );

  const responsavelLegado =
    extrairTrechoRotulado(
      descricao,
      'Responsável'
    );

  const telefoneLegado =
    extrairTrechoRotulado(
      descricao,
      'Telefone'
    );

  const emailLegado =
    extrairTrechoRotulado(
      descricao,
      'E-mail'
    );

  const observacoesLegado =
    extrairTrechoRotulado(
      descricao,
      'Observações'
    );

  const outrasDatasLegado =
    extrairTrechoRotulado(
      descricao,
      'Outras datas'
    );

  const turnoSelecionado =
    turnosDoRegistro(registro);

  const horarioLegado =
    extrairHorarioLegado(
      registro.horario
    );

  const equipamentos = parseJson(
    registro.equipamentos,
    base.equipamentos
  );

  const usarHorarioLegado =
    !registro.hora_inicio_manha &&
    !registro.hora_inicio_tarde &&
    !registro.hora_inicio_noite;

  return {
    ...base,

    setor:
      registro.setor_demandante ||
      registro.setor ||
      '',

    titulo: registro.titulo || '',

    proposito:
      registro.proposito ||
      propositoLegado ||
      descricao,

    conteudoProgramatico:
      registro.conteudo_programatico ||
      registro.conteudoProgramatico ||
      conteudoProgramaticoLegado ||
      '',

    carga_horaria:
      registro.carga_horaria ?? '',

    espaco:
      registro.local ||
      registro.espaco ||
      '',

    publico: registro.publico || '',

    onibus:
      registro.onibus || 'nao',

    respNome:
      registro.responsavel_nome ||
      responsavelLegado ||
      registro.instrutor ||
      '',

    respTel:
      registro.responsavel_telefone ||
      telefoneLegado ||
      '',

    respEmail:
      registro.responsavel_email ||
      emailLegado ||
      '',

    dataEncontro:
      registro.data_inicio?.slice?.(
        0,
        10
      ) ||
      registro.data_encontro?.slice?.(
        0,
        10
      ) ||
      '',

    dataFim:
      registro.data_fim?.slice?.(
        0,
        10
      ) || '',

    repete:
      registro.repete ||
      (outrasDatasLegado
        ? 'sim'
        : 'nao'),

    outrasDatas:
      registro.outras_datas ||
      outrasDatasLegado ||
      '',

    turnos: turnoSelecionado,

    qtdManha:
      registro.qtd_manha ?? '',

    qtdTarde:
      registro.qtd_tarde ?? '',

    qtdNoite:
      registro.qtd_noite ?? '',

    horaInicioManha:
      registro.hora_inicio_manha?.slice?.(
        0,
        5
      ) ||
      (usarHorarioLegado &&
      turnoSelecionado.manha
        ? horarioLegado.inicio
        : ''),

    horaFimManha:
      registro.hora_fim_manha?.slice?.(
        0,
        5
      ) ||
      (usarHorarioLegado &&
      turnoSelecionado.manha
        ? horarioLegado.fim
        : ''),

    horaInicioTarde:
      registro.hora_inicio_tarde?.slice?.(
        0,
        5
      ) ||
      (usarHorarioLegado &&
      turnoSelecionado.tarde
        ? horarioLegado.inicio
        : ''),

    horaFimTarde:
      registro.hora_fim_tarde?.slice?.(
        0,
        5
      ) ||
      (usarHorarioLegado &&
      turnoSelecionado.tarde
        ? horarioLegado.fim
        : ''),

    horaInicioNoite:
      registro.hora_inicio_noite?.slice?.(
        0,
        5
      ) ||
      (usarHorarioLegado &&
      turnoSelecionado.noite
        ? horarioLegado.inicio
        : ''),

    horaFimNoite:
      registro.hora_fim_noite?.slice?.(
        0,
        5
      ) ||
      (usarHorarioLegado &&
      turnoSelecionado.noite
        ? horarioLegado.fim
        : ''),

    horaChegada:
      registro.hora_chegada?.slice?.(
        0,
        5
      ) || '',

    equipamentos: {
      datashow:
        normalizarQuantidadeEquipamento(
          equipamentos?.datashow
        ),

      som:
        normalizarQuantidadeEquipamento(
          equipamentos?.som
        ),

      microfone:
        normalizarQuantidadeEquipamento(
          equipamentos?.microfone
        )
    },

    layoutCadeiras:
      registro.layout_cadeiras || '',

    mesas:
      registro.mesas || 'nao',

    qtdMesas:
      registro.qtd_mesas ?? '',

    acessibilidade:
      registro.acessibilidade || '',

    coffee: [
      'sim',
      'inicio',
      'final'
    ].includes(registro.coffee)
      ? 'sim'
      : 'nao',

    convidadosEspeciais:
      registro.convidados_especiais ||
      '',

    observacoes:
      registro.observacoes ||
      observacoesLegado ||
      '',

    status:
      registro.status || 'aberta'
  };
}

export function turnosSelecionados(
  form
) {
  return TURNOS_FORMACAO
    .filter(
      turno =>
        form.turnos?.[turno.id]
    )
    .map(turno => turno.id);
}

function horarioCampo(turno, tipo) {
  const nomeTurno =
    turno.charAt(0).toUpperCase() +
    turno.slice(1);

  return `${tipo}${nomeTurno}`;
}

export function validarFormularioFormacao(
  form
) {
  if (!form.titulo?.trim()) {
    return 'Informe o título do encontro.';
  }

  if (!form.setor?.trim()) {
    return 'Informe o setor demandante.';
  }

  if (!form.proposito?.trim()) {
    return 'Informe o propósito do encontro.';
  }

  if (
    !form.carga_horaria ||
    Number(form.carga_horaria) <= 0
  ) {
    return 'Informe a carga horária.';
  }

  if (!form.respNome?.trim()) {
    return 'Informe o nome do responsável.';
  }

  if (!form.respTel?.trim()) {
    return 'Informe o telefone do responsável.';
  }

  if (!form.respEmail?.trim()) {
    return 'Informe o e-mail do responsável.';
  }

  if (!form.dataEncontro) {
    return 'Informe a data do encontro.';
  }

  const selecionados =
    turnosSelecionados(form);

  if (selecionados.length === 0) {
    return 'Selecione ao menos um turno.';
  }

  for (const turno of selecionados) {
    const inicio =
      form[
        horarioCampo(
          turno,
          'horaInicio'
        )
      ];

    const fim =
      form[
        horarioCampo(
          turno,
          'horaFim'
        )
      ];

    if (!inicio || !fim) {
      const label =
        TURNOS_FORMACAO.find(
          item => item.id === turno
        )?.label || turno;

      return `Informe os horários de início e encerramento do turno da ${label.toLowerCase()}.`;
    }

    if (inicio >= fim) {
      const label =
        TURNOS_FORMACAO.find(
          item => item.id === turno
        )?.label || turno;

      return `O horário de encerramento da ${label.toLowerCase()} deve ser posterior ao início.`;
    }
  }

  return '';
}

export function formularioParaPayload(
  form
) {
  const selecionados =
    turnosSelecionados(form);

  const horarios = selecionados
    .map(turno => ({
      inicio:
        form[
          horarioCampo(
            turno,
            'horaInicio'
          )
        ],

      fim:
        form[
          horarioCampo(
            turno,
            'horaFim'
          )
        ]
    }))
    .filter(
      item =>
        item.inicio &&
        item.fim
    );

  const inicios = horarios
    .map(item => item.inicio)
    .sort();

  const fins = horarios
    .map(item => item.fim)
    .sort();

  return {
    setor: form.setor.trim(),

    titulo: form.titulo.trim(),

    proposito:
      form.proposito.trim(),

    descricao:
      form.proposito.trim(),

    conteudo_programatico:
      form.conteudoProgramatico?.trim() || '',

    carga_horaria: Number(
      form.carga_horaria || 0
    ),

    espaco: form.espaco || '',

    local: form.espaco || '',

    publico: form.publico || '',

    onibus:
      form.onibus || 'nao',

    responsavel: {
      nome: form.respNome.trim(),
      telefone: form.respTel.trim(),
      email: form.respEmail.trim()
    },

    instrutor:
      form.respNome.trim(),

    dataEncontro:
      form.dataEncontro,

    data_inicio:
      form.dataEncontro,

    data_fim:
      form.dataFim ||
      form.dataEncontro,

    repete:
      form.repete || 'nao',

    outrasDatas:
      form.repete === 'sim'
        ? form.outrasDatas
        : '',

    turnos: selecionados,

    convidados: {
      manha: Number(
        form.qtdManha || 0
      ),

      tarde: Number(
        form.qtdTarde || 0
      ),

      noite: Number(
        form.qtdNoite || 0
      )
    },

    horaInicioManha:
      form.horaInicioManha || '',

    horaFimManha:
      form.horaFimManha || '',

    horaInicioTarde:
      form.horaInicioTarde || '',

    horaFimTarde:
      form.horaFimTarde || '',

    horaInicioNoite:
      form.horaInicioNoite || '',

    horaFimNoite:
      form.horaFimNoite || '',

    // Compatibilidade com propostas antigas.
    horaInicio:
      inicios[0] || '',

    horaFim:
      fins[fins.length - 1] || '',

    horaChegada:
      form.horaChegada || '',

    equipamentos: {
      datashow:
        normalizarQuantidadeEquipamento(
          form.equipamentos?.datashow
        ),

      som:
        normalizarQuantidadeEquipamento(
          form.equipamentos?.som
        ),

      microfone:
        normalizarQuantidadeEquipamento(
          form.equipamentos?.microfone
        )
    },

    layoutCadeiras:
      form.layoutCadeiras || '',

    mesas:
      form.mesas || 'nao',

    qtdMesas:
      form.mesas === 'sim'
        ? Number(form.qtdMesas || 0)
        : null,

    acessibilidade:
      form.acessibilidade || '',

    coffee:
      form.coffee === 'sim'
        ? 'sim'
        : 'nao',

    convidadosEspeciais:
      form.convidadosEspeciais || '',

    observacoes:
      form.observacoes || '',

    status:
      form.status || 'aberta'
  };
}