const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth('admin', 'coordenador', 'equipe', 'participante'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM notificacoes
       WHERE usuario_id = ?
       ORDER BY criado_em DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({
      ok: true,
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/lida', auth('admin', 'coordenador', 'equipe', 'participante'), async (req, res, next) => {
  try {
    await db.query(
      `UPDATE notificacoes
       SET lida = 1
       WHERE id = ? AND usuario_id = ?`,
      [req.params.id, req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;