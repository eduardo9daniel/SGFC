const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const publicRouter = express.Router();
const adminRouter = express.Router();

function separarPalavrasChave(texto = '') {
  return texto
    .split(',')
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);
}

function validarLink(link) {
  try {
    const url = new URL(link);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

async function buscarPalavrasDoItem(itemId) {
  const [rows] = await db.query(
    `
    SELECT pc.nome
    FROM biblioteca_item_palavra_chave ipc
    JOIN biblioteca_palavras_chave pc ON pc.id = ipc.palavra_chave_id
    WHERE ipc.item_id = ?
    ORDER BY pc.nome
    `,
    [itemId]
  );

  return rows.map(r => r.nome);
}

async function salvarPalavrasChave(connection, itemId, palavras) {
  await connection.query(
    'DELETE FROM biblioteca_item_palavra_chave WHERE item_id = ?',
    [itemId]
  );

  for (const nome of palavras) {
    await connection.query(
      'INSERT IGNORE INTO biblioteca_palavras_chave (nome) VALUES (?)',
      [nome]
    );

    const [rows] = await connection.query(
      'SELECT id FROM biblioteca_palavras_chave WHERE nome = ? LIMIT 1',
      [nome]
    );

    const palavraId = rows[0].id;

    await connection.query(
      `
      INSERT IGNORE INTO biblioteca_item_palavra_chave
      (item_id, palavra_chave_id)
      VALUES (?, ?)
      `,
      [itemId, palavraId]
    );
  }
}

function validarCampos(body) {
  const {
    titulo,
    autor,
    cargo,
    instituicao,
    tipo_trabalho,
    link_documento,
    link_lattes
  } = body;

  if (!titulo || !autor || !cargo || !instituicao || !tipo_trabalho || !link_documento) {
    return 'Preencha todos os campos obrigatórios.';
  }

  if (!validarLink(link_documento)) {
    return 'Informe um link válido, iniciado por http:// ou https://.';
  }

  if (link_lattes && !validarLink(link_lattes)) {
    return 'Informe um link do Lattes válido, iniciado por http:// ou https://.';
  }

  return null;
}

/* =========================================================
   ROTAS PÚBLICAS
   Montagem sugerida: /api/biblioteca
========================================================= */

// GET /api/biblioteca?busca=avaliação&tipo_trabalho=Artigo
publicRouter.get('/', async (req, res) => {
  try {
    const { busca, tipo_trabalho } = req.query;

    let sql = `
      SELECT 
        bi.id,
        bi.titulo,
        bi.autor,
        bi.cargo,
        bi.instituicao,
        bi.tipo_trabalho,
        bi.link_documento,
        bi.link_lattes,
        bi.criado_em,
        GROUP_CONCAT(DISTINCT pc.nome ORDER BY pc.nome SEPARATOR ', ') AS palavras_chave
      FROM biblioteca_itens bi
      LEFT JOIN biblioteca_item_palavra_chave ipc ON ipc.item_id = bi.id
      LEFT JOIN biblioteca_palavras_chave pc ON pc.id = ipc.palavra_chave_id
      WHERE bi.ativo = 1
    `;

    const params = [];

    if (busca) {
      sql += `
        AND (
          bi.titulo LIKE ?
          OR bi.autor LIKE ?
          OR bi.cargo LIKE ?
          OR bi.instituicao LIKE ?
          OR bi.tipo_trabalho LIKE ?
          OR pc.nome LIKE ?
        )
      `;

      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo, termo);
    }

    if (tipo_trabalho) {
      sql += ` AND bi.tipo_trabalho = ?`;
      params.push(tipo_trabalho);
    }

    sql += `
      GROUP BY bi.id
      ORDER BY bi.criado_em DESC
    `;

    const [rows] = await db.query(sql, params);

    res.json({
      ok: true,
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao buscar itens da biblioteca.'
    });
  }
});

// GET /api/biblioteca/:id
publicRouter.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT *
      FROM biblioteca_itens
      WHERE id = ? AND ativo = 1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        erro: 'Item não encontrado.'
      });
    }

    const item = rows[0];
    item.palavras_chave = await buscarPalavrasDoItem(item.id);

    res.json({
      ok: true,
      data: item
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao buscar item.'
    });
  }
});

/* =========================================================
   ROTAS ADMINISTRATIVAS
   Montagem sugerida: /api/admin/biblioteca
========================================================= */

// GET /api/admin/biblioteca
adminRouter.get('/', auth('admin', 'coordenador'), async (req, res) => {
  try {
    const { busca } = req.query;

    let sql = `
      SELECT 
        bi.id,
        bi.titulo,
        bi.autor,
        bi.cargo,
        bi.instituicao,
        bi.tipo_trabalho,
        bi.link_documento,
        bi.link_lattes,
        bi.ativo,
        bi.criado_em,
        bi.atualizado_em,
        GROUP_CONCAT(DISTINCT pc.nome ORDER BY pc.nome SEPARATOR ', ') AS palavras_chave
      FROM biblioteca_itens bi
      LEFT JOIN biblioteca_item_palavra_chave ipc ON ipc.item_id = bi.id
      LEFT JOIN biblioteca_palavras_chave pc ON pc.id = ipc.palavra_chave_id
      WHERE bi.ativo = 1
    `;

    const params = [];

    if (busca) {
      sql += `
        AND (
          bi.titulo LIKE ?
          OR bi.autor LIKE ?
          OR bi.cargo LIKE ?
          OR bi.instituicao LIKE ?
          OR bi.tipo_trabalho LIKE ?
          OR pc.nome LIKE ?
        )
      `;

      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo, termo);
    }

    sql += `
      GROUP BY bi.id
      ORDER BY bi.criado_em DESC
    `;

    const [rows] = await db.query(sql, params);

    res.json({
      ok: true,
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao listar itens da biblioteca.'
    });
  }
});

// GET /api/admin/biblioteca/:id
adminRouter.get('/:id', auth('admin', 'coordenador'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM biblioteca_itens WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        erro: 'Item não encontrado.'
      });
    }

    const item = rows[0];
    item.palavras_chave = await buscarPalavrasDoItem(item.id);

    res.json({
      ok: true,
      data: item
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao buscar item.'
    });
  }
});

// POST /api/admin/biblioteca
adminRouter.post('/', auth('admin', 'coordenador'), async (req, res) => {
  const erroValidacao = validarCampos(req.body);

  if (erroValidacao) {
    return res.status(400).json({
      ok: false,
      erro: erroValidacao
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      titulo,
      autor,
      cargo,
      instituicao,
      tipo_trabalho,
      link_documento,
      link_lattes,
      palavras_chave
    } = req.body;

    const [result] = await connection.query(
      `
      INSERT INTO biblioteca_itens
      (
        titulo,
        autor,
        cargo,
        instituicao,
        tipo_trabalho,
        link_documento,
        link_lattes,
        criado_por,
        ativo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        titulo,
        autor,
        cargo,
        instituicao,
        tipo_trabalho,
        link_documento,
        link_lattes || null,
        req.user.id
      ]
    );

    const itemId = result.insertId;
    const palavras = separarPalavrasChave(palavras_chave || '');

    await salvarPalavrasChave(connection, itemId, palavras);

    await connection.commit();

    res.status(201).json({
      ok: true,
      id: itemId,
      mensagem: 'Item cadastrado com sucesso.'
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao cadastrar item.'
    });
  } finally {
    connection.release();
  }
});

// PUT /api/admin/biblioteca/:id
adminRouter.put('/:id', auth('admin', 'coordenador'), async (req, res) => {
  const erroValidacao = validarCampos(req.body);

  if (erroValidacao) {
    return res.status(400).json({
      ok: false,
      erro: erroValidacao
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      titulo,
      autor,
      cargo,
      instituicao,
      tipo_trabalho,
      link_documento,
      link_lattes,
      palavras_chave,
      ativo
    } = req.body;

    await connection.query(
      `
      UPDATE biblioteca_itens
      SET 
        titulo = ?,
        autor = ?,
        cargo = ?,
        instituicao = ?,
        tipo_trabalho = ?,
        link_documento = ?,
        link_lattes = ?,
        ativo = ?
      WHERE id = ?
      `,
      [
        titulo,
        autor,
        cargo,
        instituicao,
        tipo_trabalho,
        link_documento,
        link_lattes || null,
        ativo === 0 ? 0 : 1,
        req.params.id
      ]
    );

    const palavras = separarPalavrasChave(palavras_chave || '');

    await salvarPalavrasChave(connection, req.params.id, palavras);

    await connection.commit();

    res.json({
      ok: true,
      mensagem: 'Item atualizado com sucesso.'
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao atualizar item.'
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/admin/biblioteca/:id
// Exclusão lógica: apenas desativa o item.
adminRouter.delete('/:id', auth('admin'), async (req, res) => {
  try {
    await db.query(
      'UPDATE biblioteca_itens SET ativo = 0 WHERE id = ?',
      [req.params.id]
    );

    res.json({
      ok: true,
      mensagem: 'Item desativado com sucesso.'
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao desativar item.'
    });
  }
});

module.exports = {
  publicRouter,
  adminRouter
};