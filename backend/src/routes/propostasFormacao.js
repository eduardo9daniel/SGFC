const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

function parseJsonCampo(valor) {
  if (!valor) return null;
  if (typeof valor === 'object') return valor;
  try {
    return JSON.parse(valor);
  } catch {
    return valor;
  }
}

function normalizarProposta(row) {
  if (!row) return row;

  return {
    ...row,
    turnos: parseJsonCampo(row.turnos),
    equipamentos: parseJsonCampo(row.equipamentos)
  };
}

async function criarNotificacao(conn, {
  usuario_id,
  tipo,
  titulo,
  mensagem,
  link,
  referencia_tipo,
  referencia_id
}) {
  await conn.query(
    `INSERT INTO notificacoes 
      (usuario_id, tipo, titulo, mensagem, link, referencia_tipo, referencia_id)
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
router.post('/', auth('equipe'), async (req, res, next) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const {
      setor,
      titulo,
      proposito,
      carga_horaria,
      espaco,
      publico,
      onibus,
      responsavel,
      dataEncontro,
      repete,
      outrasDatas,
      turnos,
      convidados,
      horaInicio,
      horaFim,
      horaChegada,
      equipamentos,
      layoutCadeiras,
      mesas,
      qtdMesas,
      acessibilidade,
      coffee,
      convidadosEspeciais,
      observacoes
    } = req.body;

    if (!titulo || !proposito || !dataEncontro || !horaInicio || !horaFim) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        erro: 'Preencha título, propósito, data, horário de início e horário de encerramento.'
      });
    }

    if (!responsavel?.nome || !responsavel?.telefone || !responsavel?.email) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        erro: 'Preencha os dados do responsável.'
      });
    }

    const [insert] = await conn.query(
      `INSERT INTO propostas_formacao (
        equipe_id,
        setor,
        titulo,
        proposito,
        carga_horaria,
        espaco,
        publico,
        onibus,
        responsavel_nome,
        responsavel_telefone,
        responsavel_email,
        data_encontro,
        repete,
        outras_datas,
        turnos,
        qtd_manha,
        qtd_tarde,
        qtd_noite,
        hora_inicio,
        hora_fim,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
      [
        req.user.id,
        setor || null,
        titulo,
        proposito,
        Number(carga_horaria || 0),
        espaco || null,
        publico || null,
        onibus || 'nao',
        responsavel.nome,
        responsavel.telefone,
        responsavel.email,
        dataEncontro,
        repete || 'nao',
        outrasDatas || null,
        JSON.stringify(turnos || []),
        Number(convidados?.manha || 0),
        Number(convidados?.tarde || 0),
        Number(convidados?.noite || 0),
        horaInicio,
        horaFim,
        horaChegada || null,
        JSON.stringify(equipamentos || {}),
        layoutCadeiras || null,
        mesas || 'nao',
        qtdMesas ? Number(qtdMesas) : null,
        acessibilidade || null,
        coffee || null,
        convidadosEspeciais || null,
        observacoes || null
      ]
    );

    const propostaId = insert.insertId;

    const [coordenadores] = await conn.query(
      `SELECT id FROM usuarios 
       WHERE tipo_usuario = 'coordenador' AND status = 1`
    );

    for (const coord of coordenadores) {
      await criarNotificacao(conn, {
        usuario_id: coord.id,
        tipo: 'nova_proposta_formacao',
        titulo: 'Nova proposta de formação',
        mensagem: `A equipe enviou uma nova proposta: ${titulo}.`,
        link: `/coordenador/propostas-formacao/${propostaId}`,
        referencia_tipo: 'proposta_formacao',
        referencia_id: propostaId
      });
    }

    await conn.commit();

    res.status(201).json({
      ok: true,
      id: propostaId,
      mensagem: 'Proposta enviada ao coordenador.'
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// Equipe visualiza as próprias propostas
router.get('/minhas', auth('equipe'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM propostas_formacao
       WHERE equipe_id = ?
       ORDER BY criado_em DESC`,
      [req.user.id]
    );

    res.json({
      ok: true,
      data: rows.map(normalizarProposta)
    });
  } catch (err) {
    next(err);
  }
});

// Coordenador visualiza propostas
router.get('/coordenador', auth('admin', 'coordenador'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        p.*,
        u.nome_completo AS equipe_nome,
        u.email AS equipe_email
       FROM propostas_formacao p
       JOIN usuarios u ON u.id = p.equipe_id
       ORDER BY p.criado_em DESC`
    );

    res.json({
      ok: true,
      data: rows.map(normalizarProposta)
    });
  } catch (err) {
    next(err);
  }
});

// Detalhar proposta
router.get('/:id', auth('admin', 'coordenador', 'equipe'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        p.*,
        u.nome_completo AS equipe_nome,
        u.email AS equipe_email
       FROM propostas_formacao p
       JOIN usuarios u ON u.id = p.equipe_id
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

    if (req.user.tipo === 'equipe' && proposta.equipe_id !== req.user.id) {
      return res.status(403).json({
        ok: false,
        erro: 'Acesso negado.'
      });
    }

    res.json({
      ok: true,
      data: normalizarProposta(proposta)
    });
  } catch (err) {
    next(err);
  }
});

// Coordenador confirma proposta
router.patch('/:id/confirmar', auth('admin', 'coordenador'), async (req, res, next) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM propostas_formacao WHERE id = ? LIMIT 1`,
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

    const horario = `${proposta.hora_inicio} às ${proposta.hora_fim}`;

    const [formacaoInsert] = await conn.query(
      `INSERT INTO formacoes (
        titulo,
        descricao,
        carga_horaria,
        data_inicio,
        data_fim,
        horario,
        local,
        vagas,
        vagas_disponiveis,
        instrutor,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aberta')`,
      [
        proposta.titulo,
        proposta.proposito,
        proposta.carga_horaria || 0,
        proposta.data_encontro,
        proposta.data_encontro,
        horario,
        proposta.espaco || '',
        totalVagas,
        totalVagas,
        proposta.responsavel_nome
      ]
    );

    await conn.query(
      `UPDATE propostas_formacao
       SET status = 'confirmada',
           decidido_por = ?,
           decidido_em = NOW(),
           formacao_id = ?
       WHERE id = ?`,
      [req.user.id, formacaoInsert.insertId, req.params.id]
    );

    await criarNotificacao(conn, {
      usuario_id: proposta.equipe_id,
      tipo: 'proposta_confirmada',
      titulo: 'Proposta de formação confirmada',
      mensagem: `Sua proposta "${proposta.titulo}" foi confirmada pelo coordenador.`,
      link: `/equipe/minhas-propostas`,
      referencia_tipo: 'proposta_formacao',
      referencia_id: proposta.id
    });

    await conn.commit();

    res.json({
      ok: true,
      mensagem: 'Proposta confirmada e formação criada.'
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// Coordenador recusa proposta
router.patch('/:id/recusar', auth('admin', 'coordenador'), async (req, res, next) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { justificativa } = req.body;

    if (!justificativa || !justificativa.trim()) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        erro: 'Informe uma justificativa para recusar a proposta.'
      });
    }

    const [rows] = await conn.query(
      `SELECT * FROM propostas_formacao WHERE id = ? LIMIT 1`,
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
       SET status = 'recusada',
           justificativa_recusa = ?,
           decidido_por = ?,
           decidido_em = NOW()
       WHERE id = ?`,
      [justificativa.trim(), req.user.id, req.params.id]
    );

    await criarNotificacao(conn, {
      usuario_id: proposta.equipe_id,
      tipo: 'proposta_recusada',
      titulo: 'Proposta de formação recusada',
      mensagem: `Sua proposta "${proposta.titulo}" foi recusada pelo coordenador.`,
      link: `/equipe/minhas-propostas`,
      referencia_tipo: 'proposta_formacao',
      referencia_id: proposta.id
    });

    await conn.commit();

    res.json({
      ok: true,
      mensagem: 'Proposta recusada.'
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;