const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

const TURNOS_VALIDOS = ['manha', 'tarde', 'noite'];

function parseJsonCampo(valor, fallback = null) {
  if (valor === null || valor === undefined || valor === '') return fallback;
  if (typeof valor === 'object') return valor;

  try {
    return JSON.parse(valor);
  } catch {
    return fallback;
  }
}

function normalizarProposta(row) {
  if (!row) return row;

  return {
    ...row,
    turnos: parseJsonCampo(row.turnos, []),
    equipamentos: parseJsonCampo(row.equipamentos, {})
  };
}

function numeroNaoNegativo(valor) {
  const numero = Number(valor || 0);
  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function horaOuNull(valor) {
  return valor ? String(valor).slice(0, 5) : null;
}

function dadosDaProposta(body = {}) {
  const responsavel = body.responsavel || {};
  const convidados = body.convidados || {};

  const turnos = Array.isArray(body.turnos)
    ? body.turnos.filter(turno => TURNOS_VALIDOS.includes(turno))
    : [];

  const horaInicioManha = horaOuNull(
    body.horaInicioManha || body.hora_inicio_manha
  );

  const horaFimManha = horaOuNull(
    body.horaFimManha || body.hora_fim_manha
  );

  const horaInicioTarde = horaOuNull(
    body.horaInicioTarde || body.hora_inicio_tarde
  );

  const horaFimTarde = horaOuNull(
    body.horaFimTarde || body.hora_fim_tarde
  );

  const horaInicioNoite = horaOuNull(
    body.horaInicioNoite || body.hora_inicio_noite
  );

  const horaFimNoite = horaOuNull(
    body.horaFimNoite || body.hora_fim_noite
  );

  const inicios = [
    horaInicioManha,
    horaInicioTarde,
    horaInicioNoite
  ]
    .filter(Boolean)
    .sort();

  const fins = [
    horaFimManha,
    horaFimTarde,
    horaFimNoite
  ]
    .filter(Boolean)
    .sort();

  return {
    setor: String(body.setor || '').trim(),
    titulo: String(body.titulo || '').trim(),
    proposito: String(body.proposito || '').trim(),

    conteudoProgramatico: String(
    body.conteudo_programatico ??
    body.conteudoProgramatico ??
    ''
    ).trim(),

    cargaHoraria: numeroNaoNegativo(body.carga_horaria),

    espaco:
      String(body.espaco || body.local || '').trim() || null,

    publico:
      String(body.publico || '').trim() || null,

    onibus:
      body.onibus === 'sim' ? 'sim' : 'nao',

    responsavelNome:
      String(responsavel.nome || '').trim(),

    responsavelTelefone:
      String(responsavel.telefone || '').trim(),

    responsavelEmail:
      String(responsavel.email || '').trim(),

    dataEncontro:
      body.dataEncontro || body.data_inicio || null,

    dataFim:
      body.data_fim ||
      body.dataFim ||
      body.dataEncontro ||
      body.data_inicio ||
      null,

    repete:
      body.repete === 'sim' ? 'sim' : 'nao',

    outrasDatas:
      String(body.outrasDatas || '').trim() || null,

    turnos,

    qtdManha:
      numeroNaoNegativo(convidados.manha),

    qtdTarde:
      numeroNaoNegativo(convidados.tarde),

    qtdNoite:
      numeroNaoNegativo(convidados.noite),

    horaInicioManha,
    horaFimManha,
    horaInicioTarde,
    horaFimTarde,
    horaInicioNoite,
    horaFimNoite,

    horaInicio:
      horaOuNull(body.horaInicio) ||
      inicios[0] ||
      null,

    horaFim:
      horaOuNull(body.horaFim) ||
      fins[fins.length - 1] ||
      null,

    horaChegada:
      horaOuNull(body.horaChegada),

    equipamentos:
      body.equipamentos &&
      typeof body.equipamentos === 'object'
        ? body.equipamentos
        : {},

    layoutCadeiras:
      String(body.layoutCadeiras || '').trim() || null,

    mesas:
      body.mesas === 'sim' ? 'sim' : 'nao',

    qtdMesas:
      body.mesas === 'sim'
        ? numeroNaoNegativo(body.qtdMesas)
        : null,

    acessibilidade:
      String(body.acessibilidade || '').trim() || null,

    coffee:
      String(body.coffee || '').trim() || null,

    convidadosEspeciais:
      String(body.convidadosEspeciais || '').trim() || null,

    observacoes:
      String(body.observacoes || '').trim() || null
  };
}

function validarDados(dados) {
  if (!dados.setor) {
    return 'Informe o setor demandante.';
  }

  if (
    !dados.titulo ||
    !dados.proposito ||
    !dados.dataEncontro
  ) {
    return 'Preencha setor demandante, título, propósito e data do encontro.';
  }

  if (!dados.cargaHoraria) {
    return 'Informe a carga horária.';
  }

  if (
    !dados.responsavelNome ||
    !dados.responsavelTelefone ||
    !dados.responsavelEmail
  ) {
    return 'Preencha os dados do responsável.';
  }

  if (!dados.turnos.length) {
    return 'Selecione ao menos um turno.';
  }

  const horarios = {
    manha: [
      dados.horaInicioManha,
      dados.horaFimManha
    ],

    tarde: [
      dados.horaInicioTarde,
      dados.horaFimTarde
    ],

    noite: [
      dados.horaInicioNoite,
      dados.horaFimNoite
    ]
  };

  for (const turno of dados.turnos) {
    const [inicio, fim] = horarios[turno];

    if (!inicio || !fim) {
      return `Informe os horários do turno ${turno}.`;
    }

    if (inicio >= fim) {
      return `O horário final do turno ${turno} deve ser posterior ao início.`;
    }
  }

  return null;
}

function montarHorarioResumo(proposta) {
  const turnos = parseJsonCampo(
    proposta.turnos,
    []
  );

  const labels = {
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite'
  };

  const horarios = {
    manha: [
      proposta.hora_inicio_manha,
      proposta.hora_fim_manha
    ],

    tarde: [
      proposta.hora_inicio_tarde,
      proposta.hora_fim_tarde
    ],

    noite: [
      proposta.hora_inicio_noite,
      proposta.hora_fim_noite
    ]
  };

  const resumo = turnos
    .map(turno => {
      const [inicio, fim] =
        horarios[turno] || [];

      if (!inicio || !fim) {
        return null;
      }

      return (
        `${labels[turno]}: ` +
        `${String(inicio).slice(0, 5)} às ` +
        `${String(fim).slice(0, 5)}`
      );
    })
    .filter(Boolean)
    .join(' | ');

  if (resumo) {
    return resumo;
  }

  if (
    proposta.hora_inicio &&
    proposta.hora_fim
  ) {
    return (
      `${String(proposta.hora_inicio).slice(0, 5)} às ` +
      `${String(proposta.hora_fim).slice(0, 5)}`
    );
  }

  return '';
}

async function criarNotificacao(
  conn,
  {
    usuario_id,
    tipo,
    titulo,
    mensagem,
    link,
    referencia_tipo,
    referencia_id
  }
) {
  await conn.query(
    `INSERT INTO notificacoes
      (
        usuario_id,
        tipo,
        titulo,
        mensagem,
        link,
        referencia_tipo,
        referencia_id
      )
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      usuario_id,
      tipo,
      titulo,
      mensagem,
      link || null,
      referencia_tipo || null,
      referencia_id || null
    ]
  );
}

// Equipe cria proposta
router.post(
  '/',
  auth('equipe'),
  async (req, res, next) => {
    const conn = await db.getConnection();

    try {
      const dados = dadosDaProposta(req.body);
      const erro = validarDados(dados);

      if (erro) {
        return res.status(400).json({
          ok: false,
          erro
        });
      }

      await conn.beginTransaction();

      const [insert] = await conn.query(
        `INSERT INTO propostas_formacao (
          equipe_id,
          setor,
          titulo,
          proposito,
          conteudo_programatico,
          carga_horaria,
          espaco,
          publico,
          onibus,
          responsavel_nome,
          responsavel_telefone,
          responsavel_email,
          data_encontro,
          data_fim,
          repete,
          outras_datas,
          turnos,
          qtd_manha,
          qtd_tarde,
          qtd_noite,
          hora_inicio,
          hora_fim,
          hora_inicio_manha,
          hora_fim_manha,
          hora_inicio_tarde,
          hora_fim_tarde,
          hora_inicio_noite,
          hora_fim_noite,
          hora_chegada,
          equipamentos,
          layout_cadeiras,
          mesas,
          qtd_mesas,
          acessibilidade,
          coffee,
          convidados_especiais,
          observacoes,
          status
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, 'pendente'
        )`,
        [
          req.user.id,
          dados.setor,
          dados.titulo,
          dados.proposito,
          dados.conteudoProgramatico,
          dados.cargaHoraria,
          dados.espaco,
          dados.publico,
          dados.onibus,
          dados.responsavelNome,
          dados.responsavelTelefone,
          dados.responsavelEmail,
          dados.dataEncontro,
          dados.dataFim,
          dados.repete,
          dados.outrasDatas,
          JSON.stringify(dados.turnos),
          dados.qtdManha,
          dados.qtdTarde,
          dados.qtdNoite,
          dados.horaInicio,
          dados.horaFim,
          dados.horaInicioManha,
          dados.horaFimManha,
          dados.horaInicioTarde,
          dados.horaFimTarde,
          dados.horaInicioNoite,
          dados.horaFimNoite,
          dados.horaChegada,
          JSON.stringify(dados.equipamentos),
          dados.layoutCadeiras,
          dados.mesas,
          dados.qtdMesas,
          dados.acessibilidade,
          dados.coffee,
          dados.convidadosEspeciais,
          dados.observacoes
        ]
      );

      const propostaId = insert.insertId;

      /*
        A proposta é enviada somente aos
        Coordenadores ativos.
      */
      const [destinatarios] =
        await conn.query(
          `SELECT id
           FROM usuarios
           WHERE tipo_usuario = 'coordenador'
             AND status = 1`
        );

      for (const destinatario of destinatarios) {
        await criarNotificacao(conn, {
          usuario_id: destinatario.id,
          tipo: 'nova_proposta_formacao',
          titulo: 'Nova proposta de formação',
          mensagem:
            `A equipe enviou uma nova proposta: ` +
            `${dados.titulo}.`,
          link:
            `/coordenador/propostas-formacao/` +
            `${propostaId}`,
          referencia_tipo: 'proposta_formacao',
          referencia_id: propostaId
        });
      }

      await conn.commit();

      return res.status(201).json({
        ok: true,
        id: propostaId,
        mensagem:
          'Proposta enviada ao coordenador.'
      });
    } catch (err) {
      await conn.rollback();
      return next(err);
    } finally {
      conn.release();
    }
  }
);

// Equipe visualiza as próprias propostas
router.get(
  '/minhas',
  auth('equipe'),
  async (req, res, next) => {
    try {
      const [rows] = await db.query(
        `SELECT *
         FROM propostas_formacao
         WHERE equipe_id = ?
         ORDER BY criado_em DESC`,
        [req.user.id]
      );

      return res.json({
        ok: true,
        data: rows.map(normalizarProposta)
      });
    } catch (err) {
      return next(err);
    }
  }
);

// Coordenação visualiza as propostas recebidas
router.get(
  '/coordenador',
  auth('coordenador'),
  async (req, res, next) => {
    try {
      const [rows] = await db.query(
        `SELECT
          p.*,
          u.nome_completo AS equipe_nome,
          u.email AS equipe_email
         FROM propostas_formacao p
         JOIN usuarios u
           ON u.id = p.equipe_id
         ORDER BY p.criado_em DESC`
      );

      return res.json({
        ok: true,
        data: rows.map(normalizarProposta)
      });
    } catch (err) {
      return next(err);
    }
  }
);

// Detalhar proposta
router.get(
  '/:id',
  auth('coordenador', 'equipe'),
  async (req, res, next) => {
    try {
      const [rows] = await db.query(
        `SELECT
          p.*,
          u.nome_completo AS equipe_nome,
          u.email AS equipe_email
         FROM propostas_formacao p
         JOIN usuarios u
           ON u.id = p.equipe_id
         WHERE p.id = ?
         LIMIT 1`,
        [req.params.id]
      );

      const proposta = rows[0];

      if (!proposta) {
        return res.status(404).json({
          ok: false,
          erro: 'Proposta não encontrada.'
        });
      }

      if (
        req.user.tipo === 'equipe' &&
        proposta.equipe_id !== req.user.id
      ) {
        return res.status(403).json({
          ok: false,
          erro: 'Acesso negado.'
        });
      }

      return res.json({
        ok: true,
        data: normalizarProposta(proposta)
      });
    } catch (err) {
      return next(err);
    }
  }
);

// Coordenação confirma proposta
router.patch(
  '/:id/confirmar',
  auth('coordenador'),
  async (req, res, next) => {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        `SELECT *
         FROM propostas_formacao
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [req.params.id]
      );

      const proposta = rows[0];

      if (!proposta) {
        await conn.rollback();

        return res.status(404).json({
          ok: false,
          erro: 'Proposta não encontrada.'
        });
      }

      if (proposta.status !== 'pendente') {
        await conn.rollback();

        return res.status(400).json({
          ok: false,
          erro: 'Esta proposta já foi analisada.'
        });
      }

      const totalVagas =
        Number(proposta.qtd_manha || 0) +
        Number(proposta.qtd_tarde || 0) +
        Number(proposta.qtd_noite || 0);

      const horario =
        montarHorarioResumo(proposta);

      const [formacaoInsert] =
        await conn.query(
          `INSERT INTO formacoes (
            titulo,
            descricao,
            proposito,
            conteudo_programatico,
            setor_demandante,
            carga_horaria,
            data_inicio,
            data_fim,
            horario,
            local,
            publico,
            onibus,
            vagas,
            vagas_disponiveis,
            instrutor,
            responsavel_nome,
            responsavel_telefone,
            responsavel_email,
            repete,
            outras_datas,
            turnos,
            qtd_manha,
            qtd_tarde,
            qtd_noite,
            hora_inicio_manha,
            hora_fim_manha,
            hora_inicio_tarde,
            hora_fim_tarde,
            hora_inicio_noite,
            hora_fim_noite,
            hora_chegada,
            equipamentos,
            layout_cadeiras,
            mesas,
            qtd_mesas,
            acessibilidade,
            coffee,
            convidados_especiais,
            observacoes,
            status
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, 'aberta'
          )`,
          [
            proposta.titulo,
            proposta.proposito,
            proposta.proposito,
            proposta.conteudo_programatico || '',
            proposta.setor || '',
            proposta.carga_horaria || 0,
            proposta.data_encontro,
            proposta.data_fim ||
              proposta.data_encontro,
            horario,
            proposta.espaco || '',
            proposta.publico || '',
            proposta.onibus || 'nao',
            totalVagas,
            totalVagas,
            proposta.responsavel_nome,
            proposta.responsavel_nome,
            proposta.responsavel_telefone,
            proposta.responsavel_email,
            proposta.repete || 'nao',
            proposta.outras_datas || null,

            typeof proposta.turnos === 'string'
              ? proposta.turnos
              : JSON.stringify(
                  proposta.turnos || []
                ),

            Number(proposta.qtd_manha || 0),
            Number(proposta.qtd_tarde || 0),
            Number(proposta.qtd_noite || 0),

            proposta.hora_inicio_manha ||
              null,

            proposta.hora_fim_manha ||
              null,

            proposta.hora_inicio_tarde ||
              null,

            proposta.hora_fim_tarde ||
              null,

            proposta.hora_inicio_noite ||
              null,

            proposta.hora_fim_noite ||
              null,

            proposta.hora_chegada || null,

            typeof proposta.equipamentos ===
              'string'
              ? proposta.equipamentos
              : JSON.stringify(
                  proposta.equipamentos || {}
                ),

            proposta.layout_cadeiras || null,
            proposta.mesas || 'nao',
            proposta.qtd_mesas || null,
            proposta.acessibilidade || null,
            proposta.coffee || null,

            proposta.convidados_especiais ||
              null,

            proposta.observacoes || null
          ]
        );

      await conn.query(
        `UPDATE propostas_formacao
         SET
           status = 'confirmada',
           decidido_por = ?,
           decidido_em = NOW(),
           formacao_id = ?
         WHERE id = ?`,
        [
          req.user.id,
          formacaoInsert.insertId,
          req.params.id
        ]
      );

      await criarNotificacao(conn, {
        usuario_id: proposta.equipe_id,
        tipo: 'proposta_confirmada',
        titulo:
          'Proposta de formação confirmada',
        mensagem:
          `Sua proposta "${proposta.titulo}" ` +
          `foi confirmada pela coordenação.`,
        link: '/equipe/minhas-propostas',
        referencia_tipo: 'proposta_formacao',
        referencia_id: proposta.id
      });

      await conn.commit();

      return res.json({
        ok: true,
        mensagem:
          'Proposta confirmada e formação criada.'
      });
    } catch (err) {
      await conn.rollback();
      return next(err);
    } finally {
      conn.release();
    }
  }
);

// Coordenação recusa proposta
router.patch(
  '/:id/recusar',
  auth('coordenador'),
  async (req, res, next) => {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const { justificativa } = req.body;

      if (
        !justificativa ||
        !justificativa.trim()
      ) {
        await conn.rollback();

        return res.status(400).json({
          ok: false,
          erro:
            'Informe uma justificativa para recusar a proposta.'
        });
      }

      const [rows] = await conn.query(
        `SELECT *
         FROM propostas_formacao
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [req.params.id]
      );

      const proposta = rows[0];

      if (!proposta) {
        await conn.rollback();

        return res.status(404).json({
          ok: false,
          erro: 'Proposta não encontrada.'
        });
      }

      if (proposta.status !== 'pendente') {
        await conn.rollback();

        return res.status(400).json({
          ok: false,
          erro: 'Esta proposta já foi analisada.'
        });
      }

      await conn.query(
        `UPDATE propostas_formacao
         SET
           status = 'recusada',
           justificativa_recusa = ?,
           decidido_por = ?,
           decidido_em = NOW()
         WHERE id = ?`,
        [
          justificativa.trim(),
          req.user.id,
          req.params.id
        ]
      );

      await criarNotificacao(conn, {
        usuario_id: proposta.equipe_id,
        tipo: 'proposta_recusada',
        titulo:
          'Proposta de formação recusada',
        mensagem:
          `Sua proposta "${proposta.titulo}" ` +
          `foi recusada pela coordenação.`,
        link: '/equipe/minhas-propostas',
        referencia_tipo: 'proposta_formacao',
        referencia_id: proposta.id
      });

      await conn.commit();

      return res.json({
        ok: true,
        mensagem: 'Proposta recusada.'
      });
    } catch (err) {
      await conn.rollback();
      return next(err);
    } finally {
      conn.release();
    }
  }
);

module.exports = router;