const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// GET /api/relatorios
router.get('/', auth('admin', 'coordenador','equipe'), async (req, res) => {
  const { formacao_id, data_inicio, data_fim } = req.query;
  const di = data_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const df = data_fim    || new Date().toISOString().slice(0,10);

  const [[ep]] = await db.query(
    `SELECT COUNT(*) AS inscricoes, COUNT(DISTINCT i.usuario_id) AS participantes,
     COUNT(DISTINCT i.formacao_id) AS formacoes
     FROM inscricoes i JOIN formacoes f ON f.id = i.formacao_id
     WHERE i.data_inscricao BETWEEN ? AND ? AND i.status='confirmada'`,
    [di+' 00:00:00', df+' 23:59:59']
  );

  const [topFormacoes] = await db.query(
    `SELECT f.titulo, f.carga_horaria, COUNT(i.id) AS total_inscritos, f.vagas, f.status
     FROM inscricoes i JOIN formacoes f ON f.id = i.formacao_id
     WHERE i.data_inscricao BETWEEN ? AND ? AND i.status='confirmada'
     GROUP BY i.formacao_id ORDER BY total_inscritos DESC LIMIT 10`,
    [di+' 00:00:00', df+' 23:59:59']
  );

  const [distStatus] = await db.query('SELECT status, COUNT(*) AS total FROM formacoes GROUP BY status');

  let relInscricoes = [];
  if (formacao_id) {
    [relInscricoes] = await db.query(
      `SELECT u.nome_completo, u.cpf, u.email, u.telefone,
       i.data_inscricao, i.status,
       (SELECT COUNT(*) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS total_aulas,
       (SELECT IFNULL(SUM(fq.presente),0) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS presentes,
       c.codigo_validacao
       FROM inscricoes i
       JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN certificados c ON c.inscricao_id = i.id
       WHERE i.formacao_id = ? ORDER BY u.nome_completo`,
      [formacao_id]
    );
  }

  res.json({ ok: true, data: { estatsPeriodo: ep, topFormacoes, distStatus, relInscricoes } });
});

// GET /api/logs — admin
router.get('/logs', auth('admin'), async (req, res) => {
  const { p = 1 } = req.query;
  const offset = (Math.max(1, parseInt(p)) - 1) * 50;
  const [rows] = await db.query(
    `SELECT l.*, u.nome_completo FROM logs_atividades l
     LEFT JOIN usuarios u ON u.id = l.usuario_id
     ORDER BY l.criado_em DESC LIMIT 50 OFFSET ?`,
    [offset]
  );
  const [[{total}]] = await db.query('SELECT COUNT(*) AS total FROM logs_atividades');
  res.json({ ok: true, data: rows, total });
});

module.exports = router;
