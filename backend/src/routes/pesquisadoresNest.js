const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../config/db');
const auth = require('../middleware/auth');
const { gerarCodigoReferencia } = require('../utils/referenciasBiblioteca');

const publicRouter = express.Router();
const adminRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function limparTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function linkValido(valor) {
  const link = limparTexto(valor);

  if (!link) return null;

  try {
    const url = new URL(link);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return link;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizarRegistro(row) {
  const nome = limparTexto(row['Nome']);
  const natureza = limparTexto(row['Natureza da Pesquisa']);
  const titulo = limparTexto(row['Título da Tese/Dissertação']);

  const lattes = linkValido(
    row['Lattes'] ||
    row['Link Lattes'] ||
    row['Link do Lattes']
  );

  const documento = linkValido(
    row['Documento'] ||
    row['Link Documento'] ||
    row['Link do Documento']
  );

  const filiacao = limparTexto(row['Filiação']);
  const tipo = limparTexto(row['Tese/Dissertação']);
  const palavras = limparTexto(row['Palavras-Chaves']);

  return {
    nome,
    natureza_pesquisa: natureza,
    titulo_trabalho: titulo,
    link_lattes: lattes,
    link_documento: documento,
    filiacao,
    tipo_trabalho: tipo,
    palavras_chave: palavras
  };
}

/* =========================================================
   ROTAS PÚBLICAS
   /api/pesquisadores-nest
========================================================= */

publicRouter.get('/', async (req, res, next) => {
  try {
    const { busca, natureza } = req.query;
    let sql = `
  SELECT 
    id,
    codigo_referencia,
    nome,
    natureza_pesquisa,
    titulo_trabalho,
    link_lattes,
    link_documento,
    filiacao,
    tipo_trabalho,
    palavras_chave,
    criado_em
  FROM pesquisadores_nest
  WHERE ativo = 1
`;

    const params = [];

    if (busca) {
      sql += `
        AND (
          codigo_referencia LIKE ?
          OR nome LIKE ?
          OR titulo_trabalho LIKE ?
          OR filiacao LIKE ?
          OR tipo_trabalho LIKE ?
          OR palavras_chave LIKE ?
        )
      `;

      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo, termo);
    }

    if (natureza) {
      sql += ` AND natureza_pesquisa = ?`;
      params.push(natureza);
    }

    sql += `
      ORDER BY nome ASC
    `;

    const [rows] = await db.query(sql, params);

    res.json({
      ok: true,
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

publicRouter.get('/resumo', async (req, res, next) => {
  try {
    const [[total]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pesquisadores_nest
      WHERE ativo = 1
    `);

    const [porNatureza] = await db.query(`
      SELECT 
        COALESCE(natureza_pesquisa, 'Não informado') AS natureza,
        COUNT(*) AS total
      FROM pesquisadores_nest
      WHERE ativo = 1
      GROUP BY natureza_pesquisa
      ORDER BY total DESC
    `);

    res.json({
      ok: true,
      data: {
        total: total.total,
        porNatureza
      }
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================
   ROTAS ADMINISTRATIVAS
   /api/admin/pesquisadores-nest
========================================================= */

adminRouter.get('/', auth('admin', 'coordenador'), async (req, res, next) => {
  try {
    const { busca, natureza } = req.query;

    let sql = `
      SELECT *
      FROM pesquisadores_nest
      WHERE ativo = 1
    `;

    const params = [];

    if (busca) {
      sql += `
        AND (
          codigo_referencia LIKE ?
          OR nome LIKE ?
          OR titulo_trabalho LIKE ?
          OR filiacao LIKE ?
          OR tipo_trabalho LIKE ?
          OR palavras_chave LIKE ?
        )
      `;

      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo, termo);
    }

    if (natureza) {
      sql += ` AND natureza_pesquisa = ?`;
      params.push(natureza);
    }

    sql += `
      ORDER BY nome ASC
    `;

    const [rows] = await db.query(sql, params);

    res.json({
      ok: true,
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/', auth('admin', 'coordenador'), async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const {
      nome,
      natureza_pesquisa,
      titulo_trabalho,
      link_lattes,
      link_documento,
      filiacao,
      tipo_trabalho,
      palavras_chave
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        ok: false,
        erro: 'O nome do pesquisador é obrigatório.'
      });
    }

    await connection.beginTransaction();

    const codigoReferencia = await gerarCodigoReferencia(
      connection,
      'PESQ'
    );

    const [result] = await connection.query(
      `
      INSERT INTO pesquisadores_nest
      (
        codigo_referencia,
        nome,
        natureza_pesquisa,
        titulo_trabalho,
        link_lattes,
        link_documento,
        filiacao,
        tipo_trabalho,
        palavras_chave
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        codigoReferencia,
        limparTexto(nome),
        limparTexto(natureza_pesquisa) || null,
        limparTexto(titulo_trabalho) || null,
        linkValido(link_lattes),
        linkValido(link_documento),
        limparTexto(filiacao) || null,
        limparTexto(tipo_trabalho) || null,
        limparTexto(palavras_chave) || null
      ]
    );

    await connection.commit();

    res.status(201).json({
      ok: true,
      id: result.insertId,
      codigo_referencia: codigoReferencia
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

adminRouter.put('/:id', auth('admin', 'coordenador'), async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const {
      nome,
      natureza_pesquisa,
      titulo_trabalho,
      link_lattes,
      link_documento,
      filiacao,
      tipo_trabalho,
      palavras_chave
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        ok: false,
        erro: 'O nome do pesquisador é obrigatório.'
      });
    }

    await connection.beginTransaction();

    const [existentes] = await connection.query(
      `
      SELECT codigo_referencia
      FROM pesquisadores_nest
      WHERE id = ?
      FOR UPDATE
      `,
      [req.params.id]
    );

    if (!existentes.length) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        erro: 'Pesquisa não encontrada.'
      });
    }

    const codigoReferencia =
      existentes[0].codigo_referencia ||
      await gerarCodigoReferencia(connection, 'PESQ');

    await connection.query(
      `
      UPDATE pesquisadores_nest
      SET
        codigo_referencia = ?,
        nome = ?,
        natureza_pesquisa = ?,
        titulo_trabalho = ?,
        link_lattes = ?,
        link_documento = ?,
        filiacao = ?,
        tipo_trabalho = ?,
        palavras_chave = ?
      WHERE id = ?
      `,
      [
        codigoReferencia,
        limparTexto(nome),
        limparTexto(natureza_pesquisa) || null,
        limparTexto(titulo_trabalho) || null,
        linkValido(link_lattes),
        linkValido(link_documento),
        limparTexto(filiacao) || null,
        limparTexto(tipo_trabalho) || null,
        limparTexto(palavras_chave) || null,
        req.params.id
      ]
    );

    await connection.commit();

    res.json({
      ok: true,
      codigo_referencia: codigoReferencia
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

adminRouter.delete('/:id', auth('admin', 'coordenador'), async (req, res, next) => {
  try {
    await db.query(
      `
      UPDATE pesquisadores_nest
      SET ativo = 0
      WHERE id = ?
      `,
      [req.params.id]
    );

    res.json({
      ok: true
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.post(
  '/importar',
  auth('admin', 'coordenador'),
  upload.single('arquivo'),
  async (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        erro: 'Envie uma planilha Excel.'
      });
    }

    const connection = await db.getConnection();

    try {
      const workbook = XLSX.read(req.file.buffer, {
        type: 'buffer'
      });

      const nomeAba = workbook.SheetNames.includes('Pesquisadores')
        ? 'Pesquisadores'
        : workbook.SheetNames[0];

      const sheet = workbook.Sheets[nomeAba];

      const linhas = XLSX.utils.sheet_to_json(sheet, {
        defval: ''
      });

      let importados = 0;
      let ignorados = 0;

      await connection.beginTransaction();

      for (const row of linhas) {
        const registro = normalizarRegistro(row);

        if (!registro.nome) {
          ignorados++;
          continue;
        }

        const codigoReferencia = await gerarCodigoReferencia(
          connection,
          'PESQ'
        );

        await connection.query(
          `
          INSERT INTO pesquisadores_nest
          (
            codigo_referencia,
            nome,
            natureza_pesquisa,
            titulo_trabalho,
            link_lattes,
            link_documento,
            filiacao,
            tipo_trabalho,
            palavras_chave
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            codigoReferencia,
            registro.nome,
            registro.natureza_pesquisa || null,
            registro.titulo_trabalho || null,
            registro.link_lattes || null,
            registro.link_documento || null,
            registro.filiacao || null,
            registro.tipo_trabalho || null,
            registro.palavras_chave || null
          ]
        );

        importados++;
      }

      await connection.commit();

      res.json({
        ok: true,
        data: {
          aba: nomeAba,
          total_linhas: linhas.length,
          importados,
          ignorados
        }
      });
    } catch (err) {
      await connection.rollback();
      next(err);
    } finally {
      connection.release();
    }
  }
);

module.exports = {
  publicRouter,
  adminRouter
};