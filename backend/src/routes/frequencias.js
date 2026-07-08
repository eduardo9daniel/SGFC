const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// GET /api/frequencias?formacao_id=X&data_aula=Y
router.get('/', auth('admin', 'coordenador', 'equipe'), async (req, res) => {
  const { formacao_id, data_aula } = req.query;
  if (!formacao_id) return res.status(400).json({ ok: false, erro: 'formacao_id obrigatório.' });

  const dataRef = data_aula || new Date().toISOString().slice(0, 10);
  const [inscritos] = await db.query(
    `SELECT i.id AS inscricao_id, u.nome_completo, u.email,
     (SELECT presente FROM frequencias WHERE inscricao_id = i.id AND data_aula = ? LIMIT 1) AS ja_presente,
     (SELECT justificativa FROM frequencias WHERE inscricao_id = i.id AND data_aula = ? LIMIT 1) AS justificativa
     FROM inscricoes i JOIN usuarios u ON u.id = i.usuario_id
     WHERE i.formacao_id = ? AND i.status = 'confirmada'
     ORDER BY u.nome_completo`,
    [dataRef, dataRef, formacao_id]
  );

  const [historico] = await db.query(
    `SELECT f.data_aula, COUNT(*) AS total, SUM(f.presente) AS presentes
     FROM frequencias f JOIN inscricoes i ON i.id = f.inscricao_id
     WHERE i.formacao_id = ?
     GROUP BY f.data_aula ORDER BY f.data_aula DESC LIMIT 15`,
    [formacao_id]
  );

  res.json({ ok: true, data: { inscritos, historico } });
});

// GET /api/frequencias/minha?inscricao_id=X
router.get('/minha', auth('participante'), async (req, res) => {
  const { inscricao_id } = req.query;
  const [rows] = await db.query(
    `SELECT data_aula, presente, justificativa FROM frequencias WHERE inscricao_id = ? ORDER BY data_aula DESC`,
    [inscricao_id]
  );
  const total    = rows.length;
  const presentes = rows.filter(r => r.presente).length;
  const pct      = total > 0 ? Math.round(presentes / total * 100) : 0;
  res.json({ ok: true, data: { rows, pct, total, presentes } });
});

// POST /api/frequencias — salvar lista de presença
router.post('/', auth('admin', 'coordenador'), async (req, res) => {
  const { formacao_id, data_aula, presencas, todos_inscritos } = req.body;
  // presencas = { [inscricao_id]: { presente: bool, justificativa: string } }

  for (const [inscricaoId, dados] of Object.entries(presencas || {})) {
    await db.query(
      `INSERT INTO frequencias (inscricao_id, data_aula, presente, justificativa, registrado_por)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE presente = VALUES(presente), justificativa = VALUES(justificativa)`,
      [inscricaoId, data_aula, dados.presente ? 1 : 0, dados.justificativa || '', req.user.id]
    );
  }

  // Registrar ausências para os não marcados
  const marcados = Object.keys(presencas || {}).map(Number);
  for (const inscId of (todos_inscritos || [])) {
    if (!marcados.includes(Number(inscId))) {
      await db.query(
        `INSERT INTO frequencias (inscricao_id, data_aula, presente, justificativa, registrado_por)
         VALUES (?, ?, 0, '', ?)
         ON DUPLICATE KEY UPDATE presente = 0`,
        [inscId, data_aula, req.user.id]
      );
    }
  }

  res.json({ ok: true });
});

module.exports = router;
