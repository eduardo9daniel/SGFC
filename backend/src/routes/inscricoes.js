const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────
// GET /api/inscricoes?formacao_id=X — admin e coordenador (inalterado)
// ─────────────────────────────────────────────────────────────
router.get('/', auth('admin', 'coordenador','equipe'), async (req, res) => {
  const { formacao_id } = req.query;
  let sql = `SELECT i.id, i.data_inscricao, i.status, i.presenca,
              u.nome_completo, u.email, u.cpf, u.telefone,
              f.titulo AS formacao_titulo, f.id AS formacao_id,
              (SELECT COUNT(*) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS total_aulas,
              (SELECT IFNULL(SUM(presente),0) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS presentes
             FROM inscricoes i
             JOIN usuarios u ON u.id = i.usuario_id
             JOIN formacoes f ON f.id = i.formacao_id WHERE 1=1`;
  const params = [];
  if (formacao_id) { sql += ' AND i.formacao_id = ?'; params.push(formacao_id); }
  sql += ' ORDER BY i.data_inscricao DESC';
  const [rows] = await db.query(sql, params);
  res.json({ ok: true, data: rows });
});

// ─────────────────────────────────────────────────────────────
// GET /api/inscricoes/minhas — participante (inalterado)
// ─────────────────────────────────────────────────────────────
router.get('/minhas', auth('participante'), async (req, res) => {
  const [rows] = await db.query(
    `SELECT i.*, f.titulo, f.data_inicio, f.data_fim, f.carga_horaria, f.local, f.status AS status_formacao,
     (SELECT COUNT(*) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS total_aulas,
     (SELECT IFNULL(SUM(presente),0) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS presentes
     FROM inscricoes i JOIN formacoes f ON f.id = i.formacao_id
     WHERE i.usuario_id = ? ORDER BY f.data_inicio DESC`,
    [req.user.id]
  );
  res.json({ ok: true, data: rows });
});

// ─────────────────────────────────────────────────────────────
// POST /api/inscricoes/admin — admin e coordenador
// NOVO: inscreve um participante específico em nome do gestor
// Body: { usuario_id, formacao_id }
// ─────────────────────────────────────────────────────────────
router.post('/admin', auth('admin', 'coordenador'), async (req, res) => {
  const { usuario_id, formacao_id } = req.body;

  if (!usuario_id || !formacao_id)
    return res.status(400).json({ ok: false, erro: 'usuario_id e formacao_id são obrigatórios.' });

  // Verifica se o usuário alvo é participante
  const [[alvo]] = await db.query(
    "SELECT id, tipo_usuario FROM usuarios WHERE id = ? AND status = 1", [usuario_id]
  );
  if (!alvo)
    return res.status(404).json({ ok: false, erro: 'Participante não encontrado ou inativo.' });
  if (alvo.tipo_usuario !== 'participante')
    return res.status(400).json({ ok: false, erro: 'Apenas participantes podem ser inscritos.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[f]] = await conn.query(
      'SELECT vagas_disponiveis, status FROM formacoes WHERE id = ? FOR UPDATE', [formacao_id]
    );
    if (!f || f.status !== 'aberta') {
      await conn.rollback();
      return res.status(400).json({ ok: false, erro: 'Formação não está disponível para inscrições.' });
    }
    if (f.vagas_disponiveis <= 0) {
      await conn.rollback();
      return res.status(400).json({ ok: false, erro: 'Sem vagas disponíveis nesta formação.' });
    }

    const [[dup]] = await conn.query(
      'SELECT id FROM inscricoes WHERE usuario_id = ? AND formacao_id = ?', [usuario_id, formacao_id]
    );
    if (dup) {
      await conn.rollback();
      return res.status(409).json({ ok: false, erro: 'Participante já está inscrito nesta formação.' });
    }

    const [ins] = await conn.query(
      "INSERT INTO inscricoes (usuario_id, formacao_id, status) VALUES (?, ?, 'confirmada')",
      [usuario_id, formacao_id]
    );
    await conn.query(
      'UPDATE formacoes SET vagas_disponiveis = vagas_disponiveis - 1 WHERE id = ?', [formacao_id]
    );

    await conn.query(
      'INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?,?,?,?)',
      [req.user.id, 'inscrever_participante',
       `Participante #${usuario_id} inscrito na formação #${formacao_id} por ${req.user.tipo} #${req.user.id}`,
       req.ip]
    );

    await conn.commit();
    res.status(201).json({ ok: true, id: ins.insertId });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ ok: false, erro: 'Erro ao realizar inscrição.' });
  } finally { conn.release(); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/inscricoes — participante (auto-inscrição, inalterado)
// ─────────────────────────────────────────────────────────────
router.post('/', auth('participante'), async (req, res) => {
  const { formacao_id } = req.body;
  const usuario_id = req.user.id;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[f]] = await conn.query(
      'SELECT vagas_disponiveis, status FROM formacoes WHERE id = ? FOR UPDATE', [formacao_id]
    );
    if (!f || f.status !== 'aberta') {
      await conn.rollback();
      return res.status(400).json({ ok: false, erro: 'Formação não está disponível.' });
    }
    if (f.vagas_disponiveis <= 0) {
      await conn.rollback();
      return res.status(400).json({ ok: false, erro: 'Sem vagas disponíveis.' });
    }
    const [[dup]] = await conn.query(
      'SELECT id FROM inscricoes WHERE usuario_id = ? AND formacao_id = ?', [usuario_id, formacao_id]
    );
    if (dup) {
      await conn.rollback();
      return res.status(409).json({ ok: false, erro: 'Você já está inscrito.' });
    }
    await conn.query('INSERT INTO inscricoes (usuario_id, formacao_id) VALUES (?, ?)', [usuario_id, formacao_id]);
    await conn.query('UPDATE formacoes SET vagas_disponiveis = vagas_disponiveis - 1 WHERE id = ?', [formacao_id]);
    await conn.commit();
    res.status(201).json({ ok: true });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ ok: false, erro: 'Erro ao realizar inscrição.' });
  } finally { conn.release(); }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/inscricoes/:id — participante, admin, coordenador (inalterado)
// ─────────────────────────────────────────────────────────────
router.delete('/:id', auth('participante', 'admin', 'coordenador'), async (req, res) => {
  const [rows] = await db.query(
    `SELECT i.*, f.data_inicio FROM inscricoes i JOIN formacoes f ON f.id = i.formacao_id WHERE i.id = ?`,
    [req.params.id]
  );
  const insc = rows[0];
  if (!insc) return res.status(404).json({ ok: false, erro: 'Inscrição não encontrada.' });

  if (req.user.tipo === 'participante' && insc.usuario_id !== req.user.id)
    return res.status(403).json({ ok: false, erro: 'Acesso negado.' });

  const horasAteInicio = (new Date(insc.data_inicio) - new Date()) / 3600000;
  if (req.user.tipo === 'participante' && horasAteInicio < 24)
    return res.status(400).json({ ok: false, erro: 'Cancelamento exige 24h de antecedência.' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE inscricoes SET status = 'cancelada' WHERE id = ?", [req.params.id]);
    await conn.query('UPDATE formacoes SET vagas_disponiveis = vagas_disponiveis + 1 WHERE id = ?', [insc.formacao_id]);
    await conn.commit();
    res.json({ ok: true });
  } catch {
    await conn.rollback();
    res.status(500).json({ ok: false, erro: 'Erro ao cancelar.' });
  } finally { conn.release(); }
});

module.exports = router;