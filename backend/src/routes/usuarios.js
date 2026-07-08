const router = require('express').Router();
const { obterOuCriarRegiaoId } = require('../utils/regioes');
const db = require('../config/db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// GET /api/usuarios
router.get('/', auth('admin', 'coordenador', 'equipe'), async (req, res) => {
  try {
    const { busca, tipo, regiao_id, p = 1 } = req.query;

    const pagina = Math.max(1, parseInt(p, 10) || 1);
    const porPagina = 20;
    const offset = (pagina - 1) * porPagina;

    let sql = `
      SELECT 
        u.id,
        u.nome_completo,
        u.email,
        u.cpf,
        u.telefone,
        u.tipo_usuario,
        u.status,
        u.data_cadastro,
        u.primeiro_acesso,
        u.regiao_id,
        r.nome AS regiao_nome
      FROM usuarios u
      LEFT JOIN regioes r ON r.id = u.regiao_id
      WHERE 1=1
    `;

    const params = [];

    let sqlCount = `
      SELECT COUNT(*) AS total 
      FROM usuarios u
      LEFT JOIN regioes r ON r.id = u.regiao_id
      WHERE 1=1
    `;

    const paramsCount = [];

    if (req.user.tipo === 'coordenador') {
      sql += ' AND u.tipo_usuario = ?';
      params.push('participante');

      sqlCount += ' AND u.tipo_usuario = ?';
      paramsCount.push('participante');
    } else if (tipo) {
      sql += ' AND u.tipo_usuario = ?';
      params.push(tipo);

      sqlCount += ' AND u.tipo_usuario = ?';
      paramsCount.push(tipo);
    }

    if (busca) {
      sql += ' AND (u.nome_completo LIKE ? OR u.email LIKE ? OR u.cpf LIKE ?)';
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);

      sqlCount += ' AND (u.nome_completo LIKE ? OR u.email LIKE ? OR u.cpf LIKE ?)';
      paramsCount.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
    }

    if (regiao_id) {
      sql += ' AND u.regiao_id = ?';
      params.push(regiao_id);

      sqlCount += ' AND u.regiao_id = ?';
      paramsCount.push(regiao_id);
    }

    const [[{ total }]] = await db.query(sqlCount, paramsCount);

    const [rows] = await db.query(
      sql + ' ORDER BY u.nome_completo LIMIT ? OFFSET ?',
      [...params, porPagina, offset]
    );

    res.json({
      ok: true,
      data: rows,
      total,
      pagina,
      totalPaginas: Math.ceil(total / porPagina)
    });

  } catch (err) {
    console.error('Erro ao listar usuários:', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao listar usuários.'
    });
  }
});

// POST /api/usuarios
router.post('/', auth('admin', 'coordenador'), async (req, res) => {
  try {
    const {
      nome_completo,
      email,
      cpf,
      telefone,
      data_nascimento,
      senha,
      tipo_usuario,
      primeiro_acesso,
      regiao_id,
      regiao_nome
    } = req.body;

    if (!nome_completo || !email || !cpf || !senha) {
      return res.status(400).json({
        ok: false,
        erro: 'Campos obrigatórios: nome, e-mail, CPF e senha.'
      });
    }

    if (senha.length < 8) {
      return res.status(400).json({
        ok: false,
        erro: 'Senha deve ter ao menos 8 caracteres.'
      });
    }

    const tiposPermitidos = ['admin', 'coordenador', 'equipe', 'participante'];
    const tipoFinal = tipo_usuario || 'participante';

    if (!tiposPermitidos.includes(tipoFinal)) {
      return res.status(400).json({
        ok: false,
        erro: 'Tipo de usuário inválido.'
      });
    }

    if (req.user.tipo === 'coordenador' && tipoFinal === 'admin') {
      return res.status(403).json({
        ok: false,
        erro: 'Coordenador não pode criar Admin.'
      });
    }

    if (req.user.tipo === 'coordenador' && tipoFinal === 'coordenador') {
      return res.status(403).json({
        ok: false,
        erro: 'Coordenador não pode criar outro Coordenador.'
      });
    }

    let regiaoIdFinal = null;

    if (tipoFinal === 'participante') {
      regiaoIdFinal = await obterOuCriarRegiaoId({
        regiao_id,
        regiao_nome
      });

      if (!regiaoIdFinal) {
        return res.status(400).json({
          ok: false,
          erro: 'Informe uma região válida para o participante.'
        });
      }
    }

    const emailNormalizado = normalizarEmail(email);

    const [dup] = await db.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = ? OR cpf = ?',
      [emailNormalizado, cpf]
    );

    if (dup.length) {
      return res.status(409).json({
        ok: false,
        erro: 'E-mail ou CPF já cadastrado.'
      });
    }

    const hash = await bcrypt.hash(senha, 12);

    const primeiroAcessoFinal =
      primeiro_acesso === true ||
      primeiro_acesso === 1 ||
      primeiro_acesso === '1' ||
      tipoFinal === 'equipe'
        ? 1
        : 0;

    const [result] = await db.query(
      `INSERT INTO usuarios 
       (
        nome_completo, 
        email, 
        cpf, 
        telefone, 
        data_nascimento,
        regiao_id,
        tipo_usuario, 
        senha_hash,
        primeiro_acesso
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome_completo.trim(),
        emailNormalizado,
        cpf,
        telefone || null,
        data_nascimento || null,
        regiaoIdFinal,
        tipoFinal,
        hash,
        primeiroAcessoFinal
      ]
    );

    await db.query(
      'INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?,?,?,?)',
      [
        req.user.id,
        'criar_usuario',
        `Usuário #${result.insertId} (${tipoFinal}) criado por ${req.user.tipo} #${req.user.id}`,
        req.ip
      ]
    );

    res.status(201).json({
      ok: true,
      id: result.insertId,
      primeiro_acesso: !!primeiroAcessoFinal,
      regiao_id: regiaoIdFinal
    });

  } catch (err) {
    console.error('Erro ao criar usuário:', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao criar usuário.'
    });
  }
});

// PUT /api/usuarios/me
router.put('/me', auth('participante'), async (req, res) => {
  try {
    const {
      nome_completo,
      telefone,
      data_nascimento,
      regiao_id,
      regiao_nome
    } = req.body;

    if (!nome_completo || !nome_completo.trim()) {
      return res.status(400).json({
        ok: false,
        erro: 'Nome completo é obrigatório.'
      });
    }

    const regiaoIdFinal = await obterOuCriarRegiaoId({
      regiao_id,
      regiao_nome
    });

    if (!regiaoIdFinal) {
      return res.status(400).json({
        ok: false,
        erro: 'Informe uma região válida para o participante.'
      });
    }

    await db.query(
      `UPDATE usuarios
       SET nome_completo = ?,
           telefone = ?,
           data_nascimento = ?,
           regiao_id = ?
       WHERE id = ? 
       AND tipo_usuario = 'participante'`,
      [
        nome_completo.trim(),
        telefone || null,
        data_nascimento || null,
        regiaoIdFinal,
        req.user.id
      ]
    );

    res.json({
      ok: true,
      mensagem: 'Perfil atualizado com sucesso.',
      regiao_id: regiaoIdFinal
    });

  } catch (err) {
    console.error('Erro ao atualizar perfil do participante:', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao atualizar perfil.'
    });
  }
});

// PUT /api/usuarios/:id/toggle-status
router.put('/:id/toggle-status', auth('admin'), async (req, res) => {
  try {
    await db.query(
      "UPDATE usuarios SET status = 1 - status WHERE id = ? AND tipo_usuario != 'admin'",
      [req.params.id]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error('Erro ao alterar status do usuário:', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao alterar status do usuário.'
    });
  }
});

// PUT /api/usuarios/:id/resetar-senha
router.put('/:id/resetar-senha', auth('admin'), async (req, res) => {
  try {
    const nova = 'Darcy@' + Math.floor(1000 + Math.random() * 9000);
    const hash = await bcrypt.hash(nova, 12);

    await db.query(
      'UPDATE usuarios SET senha_hash = ?, primeiro_acesso = 1 WHERE id = ?',
      [hash, req.params.id]
    );

    res.json({
      ok: true,
      novaSenha: nova,
      primeiro_acesso: true
    });

  } catch (err) {
    console.error('Erro ao resetar senha:', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao resetar senha.'
    });
  }
});

// GET /api/usuarios/dashboard
router.get('/dashboard', auth('admin', 'coordenador', 'equipe'), async (req, res) => {
  try {
    const [[tp]] = await db.query(
      "SELECT COUNT(*) AS v FROM usuarios WHERE tipo_usuario='participante' AND status=1"
    );

    const [[tf]] = await db.query(
      "SELECT COUNT(*) AS v FROM formacoes"
    );

    const [[fa]] = await db.query(
      "SELECT COUNT(*) AS v FROM formacoes WHERE status='aberta'"
    );

    const [[ti]] = await db.query(
      "SELECT COUNT(*) AS v FROM inscricoes WHERE status='confirmada'"
    );

    const [[tc]] = await db.query(
      "SELECT COUNT(*) AS v FROM certificados"
    );

    const [[tpc]] = await db.query(
    `SELECT COUNT(*) AS v
    FROM propostas_formacao
    WHERE status = 'confirmada'`
   );

    const [[tb]] = await db.query(
      `SELECT COUNT(*) AS v
       FROM biblioteca_itens
       WHERE ativo = 1`
    );

    const [[ta]] = await db.query(
      `SELECT COUNT(DISTINCT autor) AS v
       FROM biblioteca_itens
       WHERE ativo = 1`
    );

    const [[tm]] = await db.query(
      `SELECT COUNT(*) AS v
       FROM biblioteca_itens
       WHERE ativo = 1
       AND criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    const [fr] = await db.query(
      "SELECT * FROM formacoes ORDER BY criado_em DESC LIMIT 5"
    );

    const [acessosPorRegiao] = await db.query(`
      SELECT 
        COALESCE(r.nome, 'Sem região') AS regiao,
        COUNT(l.id) AS acessos,
        COUNT(DISTINCT u.id) AS pessoas
      FROM logs_atividades l
      JOIN usuarios u ON u.id = l.usuario_id
      LEFT JOIN regioes r ON r.id = u.regiao_id
      WHERE l.acao = 'login'
        AND u.tipo_usuario = 'participante'
      GROUP BY COALESCE(r.nome, 'Sem região')
      ORDER BY acessos DESC, pessoas DESC, regiao ASC
    `);

    res.json({
      ok: true,
      data: {
        total_participantes: tp.v,
        total_formacoes: tf.v,
        formacoes_abertas: fa.v,
        propostas_confirmadas: tpc.v,
        total_inscricoes: ti.v,
        certificados_emitidos: tc.v,

        totalItensBiblioteca: tb.v,
        totalAutoresBiblioteca: ta.v,
        itensBibliotecaMes: tm.v,

        formacoes_recentes: fr,
        acessos_por_regiao: acessosPorRegiao
      }
    });

  } catch (err) {
    console.error('Erro no dashboard de usuários:', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao carregar dashboard.'
    });
  }
});

// GET /api/usuarios/dashboard/participante
router.get('/dashboard/participante', auth('participante'), async (req, res) => {
  try {
    const uid = req.user.id;

    const [inscricoes] = await db.query(
      `SELECT 
        i.*, 
        f.titulo, 
        f.data_inicio, 
        f.data_fim, 
        f.carga_horaria, 
        f.local, 
        f.status AS status_formacao
       FROM inscricoes i 
       JOIN formacoes f ON f.id = i.formacao_id
       WHERE i.usuario_id = ? 
       ORDER BY f.data_inicio DESC`,
      [uid]
    );

    const [[{ tc }]] = await db.query(
      `SELECT COUNT(*) AS tc 
       FROM certificados c 
       JOIN inscricoes i ON i.id = c.inscricao_id 
       WHERE i.usuario_id = ?`,
      [uid]
    );

    res.json({
      ok: true,
      data: {
        inscricoes,
        total_certificados: tc
      }
    });

  } catch (err) {
    console.error('Erro no dashboard do participante:', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao carregar dashboard do participante.'
    });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const [[usuario]] = await db.query(
      'SELECT tipo_usuario FROM usuarios WHERE id = ?',
      [id]
    );

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        erro: 'Usuário não encontrado.'
      });
    }

    if (usuario.tipo_usuario === 'admin') {
      return res.status(400).json({
        ok: false,
        erro: 'Não é permitido excluir admin.'
      });
    }

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({
        ok: false,
        erro: 'Você não pode excluir seu próprio usuário.'
      });
    }

    await db.query(
      'DELETE FROM usuarios WHERE id = ?',
      [id]
    );

    await db.query(
      'INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?,?,?,?)',
      [
        req.user.id,
        'excluir_usuario',
        `Usuário #${id} excluído por ${req.user.tipo} #${req.user.id}`,
        req.ip
      ]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error('Erro ao excluir usuário:', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao excluir usuário.'
    });
  }
});

module.exports = router;