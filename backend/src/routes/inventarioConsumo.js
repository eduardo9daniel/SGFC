const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

const perfisPermitidos = ['admin', 'coordenador', 'equipe'];

function normalizarNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarData(valor) {
  return valor ? valor : null;
}

function validarCampos(body) {
  if (!body.descricao || !body.descricao.trim()) {
    return 'Informe a descrição do item.';
  }

  if (normalizarNumero(body.quantidade) < 0) {
    return 'A quantidade não pode ser negativa.';
  }

  if (normalizarNumero(body.quantidade_estoque) < 0) {
    return 'A quantidade em estoque não pode ser negativa.';
  }

  if (normalizarNumero(body.estoque_minimo) < 0) {
    return 'O estoque mínimo não pode ser negativo.';
  }

  return null;
}

router.get('/', auth(...perfisPermitidos), async (req, res, next) => {
  try {
    const { busca, status } = req.query;

    let sql = `
      SELECT
        id,
        quantidade,
        descricao,
        marca_modelo_serie,
        quantidade_estoque,
        estoque_minimo,
        data_validade,
        localizacao,
        solicitacao,
        data_ultima_entrada,
        observacoes,
        criado_em,
        atualizado_em,
        CASE
          WHEN estoque_minimo > 0 AND quantidade_estoque <= estoque_minimo THEN 1
          ELSE 0
        END AS estoque_baixo,
        CASE
          WHEN data_validade IS NOT NULL AND data_validade < CURDATE() THEN 1
          ELSE 0
        END AS vencido,
        CASE
          WHEN data_validade IS NOT NULL
           AND data_validade >= CURDATE()
           AND data_validade <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1
          ELSE 0
        END AS vencendo
      FROM inventario_bens_consumo
      WHERE 1=1
    `;

    const params = [];

    if (busca) {
      sql += `
        AND (
          descricao LIKE ?
          OR marca_modelo_serie LIKE ?
          OR localizacao LIKE ?
          OR solicitacao LIKE ?
          OR observacoes LIKE ?
        )
      `;

      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo);
    }

    if (status === 'baixo') {
      sql += ' AND estoque_minimo > 0 AND quantidade_estoque <= estoque_minimo';
    }

    if (status === 'vencido') {
      sql += ' AND data_validade IS NOT NULL AND data_validade < CURDATE()';
    }

    if (status === 'vencendo') {
      sql += `
        AND data_validade IS NOT NULL
        AND data_validade >= CURDATE()
        AND data_validade <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      `;
    }

    sql += ' ORDER BY descricao ASC';

    const [rows] = await db.query(sql, params);

    res.json({
      ok: true,
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

router.get('/resumo', auth(...perfisPermitidos), async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total_itens,
        COALESCE(SUM(quantidade_estoque), 0) AS total_em_estoque,
        SUM(CASE WHEN estoque_minimo > 0 AND quantidade_estoque <= estoque_minimo THEN 1 ELSE 0 END) AS itens_estoque_baixo,
        SUM(CASE WHEN data_validade IS NOT NULL AND data_validade < CURDATE() THEN 1 ELSE 0 END) AS itens_vencidos,
        SUM(CASE WHEN data_validade IS NOT NULL
                  AND data_validade >= CURDATE()
                  AND data_validade <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                 THEN 1 ELSE 0 END) AS itens_vencendo
      FROM inventario_bens_consumo
    `);

    res.json({
      ok: true,
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth(...perfisPermitidos), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM inventario_bens_consumo WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        erro: 'Item não encontrado.'
      });
    }

    res.json({
      ok: true,
      data: rows[0]
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth(...perfisPermitidos), async (req, res, next) => {
  try {
    const erro = validarCampos(req.body);
    if (erro) {
      return res.status(400).json({
        ok: false,
        erro
      });
    }

    const {
      quantidade,
      descricao,
      marca_modelo_serie,
      quantidade_estoque,
      estoque_minimo,
      data_validade,
      localizacao,
      solicitacao,
      data_ultima_entrada,
      observacoes
    } = req.body;

    const [result] = await db.query(
      `
      INSERT INTO inventario_bens_consumo
      (
        quantidade,
        descricao,
        marca_modelo_serie,
        quantidade_estoque,
        estoque_minimo,
        data_validade,
        localizacao,
        solicitacao,
        data_ultima_entrada,
        observacoes,
        criado_por
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizarNumero(quantidade),
        descricao.trim(),
        marca_modelo_serie || '',
        normalizarNumero(quantidade_estoque),
        normalizarNumero(estoque_minimo),
        normalizarData(data_validade),
        localizacao || '',
        solicitacao || '',
        normalizarData(data_ultima_entrada),
        observacoes || '',
        req.user.id
      ]
    );

    res.status(201).json({
      ok: true,
      id: result.insertId
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth(...perfisPermitidos), async (req, res, next) => {
  try {
    const erro = validarCampos(req.body);
    if (erro) {
      return res.status(400).json({
        ok: false,
        erro
      });
    }

    const {
      quantidade,
      descricao,
      marca_modelo_serie,
      quantidade_estoque,
      estoque_minimo,
      data_validade,
      localizacao,
      solicitacao,
      data_ultima_entrada,
      observacoes
    } = req.body;

    await db.query(
      `
      UPDATE inventario_bens_consumo
      SET quantidade = ?,
          descricao = ?,
          marca_modelo_serie = ?,
          quantidade_estoque = ?,
          estoque_minimo = ?,
          data_validade = ?,
          localizacao = ?,
          solicitacao = ?,
          data_ultima_entrada = ?,
          observacoes = ?
      WHERE id = ?
      `,
      [
        normalizarNumero(quantidade),
        descricao.trim(),
        marca_modelo_serie || '',
        normalizarNumero(quantidade_estoque),
        normalizarNumero(estoque_minimo),
        normalizarData(data_validade),
        localizacao || '',
        solicitacao || '',
        normalizarData(data_ultima_entrada),
        observacoes || '',
        req.params.id
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth('admin', 'coordenador'), async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM inventario_bens_consumo WHERE id = ?',
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;