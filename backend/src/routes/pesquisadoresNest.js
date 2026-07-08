const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../config/db');
const auth = require('../middleware/auth');

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
          nome LIKE ?
          OR titulo_trabalho LIKE ?
          OR filiacao LIKE ?
          OR tipo_trabalho LIKE ?
          OR palavras_chave LIKE ?
        )
      `;

      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo);
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
          nome LIKE ?
          OR titulo_trabalho LIKE ?
          OR filiacao LIKE ?
          OR tipo_trabalho LIKE ?
          OR palavras_chave LIKE ?
        )
      `;

      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo);
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

adminRouter.post('/', auth('admin'), async (req, res, next) => {
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

    const [result] = await db.query(
  `
  INSERT INTO pesquisadores_nest
  (
    nome,
    natureza_pesquisa,
    titulo_trabalho,
    link_lattes,
    link_documento,
    filiacao,
    tipo_trabalho,
    palavras_chave
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [
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

    res.status(201).json({
      ok: true,
      id: result.insertId
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/:id', auth('admin'), async (req, res, next) => {
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

    await db.query(
  `
  UPDATE pesquisadores_nest
  SET
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

    res.json({
      ok: true
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/:id', auth('admin'), async (req, res, next) => {
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
  auth('admin'),
  upload.single('arquivo'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          ok: false,
          erro: 'Envie uma planilha Excel.'
        });
      }

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

      for (const row of linhas) {
        const registro = normalizarRegistro(row);

        if (!registro.nome) {
          ignorados++;
          continue;
        }

        await db.query(
  `
  INSERT INTO pesquisadores_nest
  (
    nome,
    natureza_pesquisa,
    titulo_trabalho,
    link_lattes,
    link_documento,
    filiacao,
    tipo_trabalho,
    palavras_chave
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [
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
      next(err);
    }
  }
);

module.exports = {
  publicRouter,
  adminRouter
};