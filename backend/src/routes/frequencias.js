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

  const [registroExistente] = await db.query(
  `SELECT COUNT(*) AS total
   FROM frequencias f
   JOIN inscricoes i ON i.id = f.inscricao_id
   WHERE i.formacao_id = ?
     AND f.data_aula = ?`,
  [formacao_id, dataRef]
);

const frequenciaRegistrada =
  Number(registroExistente[0]?.total || 0) > 0;

  res.json({ ok: true, data: { inscritos, historico, frequenciaRegistrada } });
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
  const {
    formacao_id,
    data_aula,
    presencas,
    todos_inscritos
  } = req.body;

  if (!formacao_id || !data_aula) {
    return res.status(400).json({
      ok: false,
      erro: 'Formação e data da aula são obrigatórias.'
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * Bloqueia a formação durante a gravação.
     * Isso impede duas chamadas simultâneas
     * para a mesma formação.
     */
    const [formacoes] = await connection.query(
      `SELECT id
       FROM formacoes
       WHERE id = ?
       FOR UPDATE`,
      [formacao_id]
    );

    if (formacoes.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        ok: false,
        erro: 'Formação não encontrada.'
      });
    }

    /*
     * Verifica novamente dentro da transação.
     */
    const [registroExistente] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM frequencias f
       JOIN inscricoes i
         ON i.id = f.inscricao_id
       WHERE i.formacao_id = ?
         AND f.data_aula = ?`,
      [formacao_id, data_aula]
    );

    if (
      Number(
        registroExistente[0]?.total || 0
      ) > 0
    ) {
      await connection.rollback();

      return res.status(409).json({
        ok: false,
        erro:
          'A frequência desta formação já foi registrada para esta data.'
      });
    }

    /*
     * Registra os participantes marcados.
     *
     * IMPORTANTE:
     * não existe mais ON DUPLICATE KEY UPDATE.
     */
    for (
      const [inscricaoId, dados]
      of Object.entries(presencas || {})
    ) {
      await connection.query(
        `INSERT INTO frequencias
          (
            inscricao_id,
            data_aula,
            presente,
            justificativa,
            registrado_por
          )
         VALUES (?, ?, ?, ?, ?)`,
        [
          inscricaoId,
          data_aula,
          dados.presente ? 1 : 0,
          dados.justificativa || '',
          req.user.id
        ]
      );
    }

    /*
     * Registra falta para quem não foi marcado.
     */
    const marcados =
      Object.keys(presencas || {})
        .map(Number);

    for (
      const inscId
      of (todos_inscritos || [])
    ) {
      if (
        !marcados.includes(
          Number(inscId)
        )
      ) {
        await connection.query(
          `INSERT INTO frequencias
            (
              inscricao_id,
              data_aula,
              presente,
              justificativa,
              registrado_por
            )
           VALUES (?, ?, 0, '', ?)`,
          [
            inscId,
            data_aula,
            req.user.id
          ]
        );
      }
    }

    await connection.commit();

    return res.json({
      ok: true
    });

  } catch (err) {
    await connection.rollback();

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        erro:
          'A frequência desta formação já foi registrada para esta data.'
      });
    }

    console.error(
      '[FREQUENCIA][SALVAR]',
      err
    );

    return res.status(500).json({
      ok: false,
      erro:
        'Erro ao registrar frequência.'
    });

  } finally {
    connection.release();
  }
});

module.exports = router;
