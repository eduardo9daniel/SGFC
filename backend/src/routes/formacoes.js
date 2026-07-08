const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// GET /api/formacoes — público
router.get('/', async (req, res) => {
  const { status, disponiveis } = req.query;
  let sql = 'SELECT * FROM formacoes WHERE 1=1';
  const params = [];
  if (status)      { sql += ' AND status = ?'; params.push(status); }
  if (disponiveis) { sql += " AND vagas_disponiveis > 0 AND status = 'aberta'"; }
  sql += ' ORDER BY data_inicio DESC';
  const [rows] = await db.query(sql, params);
  res.json({ ok: true, data: rows });
});

// GET /api/formacoes/:id — público
router.get('/:id', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM formacoes WHERE id = ? LIMIT 1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ ok: false, erro: 'Formação não encontrada.' });
  res.json({ ok: true, data: rows[0] });
});

// POST /api/formacoes — admin/coord
router.post('/', auth('admin', 'coordenador'), async (req, res) => {
  const { titulo, descricao, carga_horaria, data_inicio, data_fim, horario, local, vagas, instrutor, status } = req.body;
  const [r] = await db.query(
    `INSERT INTO formacoes (titulo,descricao,carga_horaria,data_inicio,data_fim,horario,local,vagas,vagas_disponiveis,instrutor,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [titulo, descricao||'', carga_horaria, data_inicio, data_fim, horario||'', local||'', vagas, vagas, instrutor||'', status||'aberta']
  );
  res.status(201).json({ ok: true, id: r.insertId });
});

// PUT /api/formacoes/:id — admin/coord
router.put('/:id', auth('admin', 'coordenador'), async (req, res) => {
  const { titulo, descricao, carga_horaria, data_inicio, data_fim, horario, local, vagas, instrutor, status } = req.body;
  await db.query(
    `UPDATE formacoes SET titulo=?,descricao=?,carga_horaria=?,data_inicio=?,data_fim=?,
     horario=?,local=?,vagas=?,instrutor=?,status=? WHERE id=?`,
    [titulo, descricao||'', carga_horaria, data_inicio, data_fim, horario||'', local||'', vagas, instrutor||'', status||'aberta', req.params.id]
  );
  res.json({ ok: true });
});

// DELETE /api/formacoes/:id — admin
router.delete('/:id', auth('admin'), async (req, res) => {
  await db.query('DELETE FROM formacoes WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
