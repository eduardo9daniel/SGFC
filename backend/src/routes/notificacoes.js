const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth('coordenador', 'equipe', 'participante'), async (req, res, next) => {
  try {
    const somenteNaoLidas = ['1', 'true'].includes(
      String(req.query.somente_nao_lidas || '').toLowerCase()
    );

    /*
     * O pop-up consulta esta mesma rota periodicamente.
     * Essas consultas automáticas não devem poluir os logs de auditoria.
     * A abertura normal da página de notificações continua registrada.
     */
    if (somenteNaoLidas) {
      req.auditSkip = true;
    }

    const filtroLeitura = somenteNaoLidas
      ? ' AND COALESCE(lida, 0) = 0'
      : '';

    const limite = somenteNaoLidas ? 20 : 50;

    const [rows] = await db.query(
      `SELECT *
       FROM notificacoes
       WHERE usuario_id = ?${filtroLeitura}
       ORDER BY criado_em DESC
       LIMIT ${limite}`,
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

router.patch('/:id/lida', auth('coordenador', 'equipe', 'participante'), async (req, res, next) => {
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
