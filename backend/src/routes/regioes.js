const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/regioes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nome, descricao, ativo
       FROM regioes
       WHERE ativo = 1
       ORDER BY nome`
    );

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('Erro ao listar regiões:', err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao listar regiões.'
    });
  }
});

// POST /api/regioes
router.post('/', auth('admin', 'coordenador'), async (req, res) => {
  try {
    const { nome, descricao } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({
        ok: false,
        erro: 'Nome da região é obrigatório.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO regioes (nome, descricao)
       VALUES (?, ?)`,
      [nome.trim(), descricao || null]
    );

    res.status(201).json({
      ok: true,
      id: result.insertId
    });
  } catch (err) {
    console.error('Erro ao criar região:', err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao criar região.'
    });
  }
});

module.exports = router;