const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

const perfisPermitidos = ['admin', 'coordenador', 'equipe'];
const estadosPermitidos = ['bom', 'regular', 'ruim', 'inservivel'];
const situacoesPermitidas = ['em_uso', 'disponivel', 'manutencao', 'baixado'];

function normalizarNumero(valor, padrao = 0) {
  if (valor === '' || valor === null || valor === undefined) return padrao;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
}

function normalizarData(valor) {
  return valor || null;
}

function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarTextoOpcional(valor) {
  const texto = normalizarTexto(valor);
  return texto || null;
}

function validarCampos(body) {
  if (!normalizarTexto(body.descricao)) {
    return 'Informe a descrição do bem.';
  }

  const quantidade = Number(body.quantidade);

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return 'A quantidade deve ser maior que zero.';
  }

  if (
    body.valor_aquisicao !== null &&
    body.valor_aquisicao !== '' &&
    body.valor_aquisicao !== undefined &&
    normalizarNumero(body.valor_aquisicao, -1) < 0
  ) {
    return 'O valor de aquisição não pode ser negativo.';
  }

  if (
    body.estado_conservacao &&
    !estadosPermitidos.includes(body.estado_conservacao)
  ) {
    return 'Estado de conservação inválido.';
  }

  if (body.situacao && !situacoesPermitidas.includes(body.situacao)) {
    return 'Situação do bem inválida.';
  }

  return null;
}

router.get('/', auth(...perfisPermitidos), async (req, res, next) => {
  try {
    const { busca, situacao, estado_conservacao } = req.query;

    let sql = `
      SELECT
        id,
        descricao,
        numero_patrimonio,
        marca_modelo_serie,
        quantidade,
        estado_conservacao,
        situacao,
        localizacao,
        responsavel,
        data_aquisicao,
        valor_aquisicao,
        observacoes,
        criado_em,
        atualizado_em
      FROM inventario_bens_duraveis
      WHERE 1=1
    `;

    const params = [];

    if (busca) {
      sql += `
        AND (
          descricao LIKE ?
          OR numero_patrimonio LIKE ?
          OR marca_modelo_serie LIKE ?
          OR localizacao LIKE ?
          OR responsavel LIKE ?
          OR observacoes LIKE ?
        )
      `;

      const termo = `%${busca}%`;
      params.push(termo, termo, termo, termo, termo, termo);
    }

    if (situacao && situacoesPermitidas.includes(situacao)) {
      sql += ' AND situacao = ?';
      params.push(situacao);
    }

    if (
      estado_conservacao &&
      estadosPermitidos.includes(estado_conservacao)
    ) {
      sql += ' AND estado_conservacao = ?';
      params.push(estado_conservacao);
    }

    sql += ' ORDER BY descricao ASC, numero_patrimonio ASC';

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
        COALESCE(SUM(quantidade), 0) AS total_bens,
        SUM(CASE WHEN situacao = 'em_uso' THEN 1 ELSE 0 END) AS itens_em_uso,
        SUM(CASE WHEN situacao = 'manutencao' THEN 1 ELSE 0 END) AS itens_manutencao,
        SUM(CASE WHEN situacao = 'disponivel' THEN 1 ELSE 0 END) AS itens_disponiveis,
        SUM(CASE WHEN situacao = 'baixado' THEN 1 ELSE 0 END) AS itens_baixados
      FROM inventario_bens_duraveis
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
      'SELECT * FROM inventario_bens_duraveis WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        erro: 'Bem durável não encontrado.'
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
      descricao,
      numero_patrimonio,
      marca_modelo_serie,
      quantidade,
      estado_conservacao,
      situacao,
      localizacao,
      responsavel,
      data_aquisicao,
      valor_aquisicao,
      observacoes
    } = req.body;

    const [result] = await db.query(
      `
      INSERT INTO inventario_bens_duraveis
      (
        descricao,
        numero_patrimonio,
        marca_modelo_serie,
        quantidade,
        estado_conservacao,
        situacao,
        localizacao,
        responsavel,
        data_aquisicao,
        valor_aquisicao,
        observacoes,
        criado_por
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizarTexto(descricao),
        normalizarTextoOpcional(numero_patrimonio),
        normalizarTexto(marca_modelo_serie),
        normalizarNumero(quantidade, 1),
        estadosPermitidos.includes(estado_conservacao)
          ? estado_conservacao
          : 'bom',
        situacoesPermitidas.includes(situacao) ? situacao : 'em_uso',
        normalizarTexto(localizacao),
        normalizarTexto(responsavel),
        normalizarData(data_aquisicao),
        valor_aquisicao === null ||
        valor_aquisicao === '' ||
        valor_aquisicao === undefined
          ? null
          : normalizarNumero(valor_aquisicao),
        normalizarTexto(observacoes),
        req.user.id
      ]
    );

    res.status(201).json({
      ok: true,
      id: result.insertId
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        erro: 'Já existe um bem com este número de patrimônio.'
      });
    }

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
      descricao,
      numero_patrimonio,
      marca_modelo_serie,
      quantidade,
      estado_conservacao,
      situacao,
      localizacao,
      responsavel,
      data_aquisicao,
      valor_aquisicao,
      observacoes
    } = req.body;

    const [result] = await db.query(
      `
      UPDATE inventario_bens_duraveis
      SET descricao = ?,
          numero_patrimonio = ?,
          marca_modelo_serie = ?,
          quantidade = ?,
          estado_conservacao = ?,
          situacao = ?,
          localizacao = ?,
          responsavel = ?,
          data_aquisicao = ?,
          valor_aquisicao = ?,
          observacoes = ?
      WHERE id = ?
      `,
      [
        normalizarTexto(descricao),
        normalizarTextoOpcional(numero_patrimonio),
        normalizarTexto(marca_modelo_serie),
        normalizarNumero(quantidade, 1),
        estadosPermitidos.includes(estado_conservacao)
          ? estado_conservacao
          : 'bom',
        situacoesPermitidas.includes(situacao) ? situacao : 'em_uso',
        normalizarTexto(localizacao),
        normalizarTexto(responsavel),
        normalizarData(data_aquisicao),
        valor_aquisicao === null ||
        valor_aquisicao === '' ||
        valor_aquisicao === undefined
          ? null
          : normalizarNumero(valor_aquisicao),
        normalizarTexto(observacoes),
        req.params.id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        ok: false,
        erro: 'Bem durável não encontrado.'
      });
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        ok: false,
        erro: 'Já existe um bem com este número de patrimônio.'
      });
    }

    next(err);
  }
});

router.delete('/:id', auth('admin', 'coordenador'), async (req, res, next) => {
  try {
    const [result] = await db.query(
      'DELETE FROM inventario_bens_duraveis WHERE id = ?',
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        ok: false,
        erro: 'Bem durável não encontrado.'
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
