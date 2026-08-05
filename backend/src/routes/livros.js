const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const publicRouter = express.Router();
const adminRouter = express.Router();

const STATUS_LIVRO = new Set([
  'disponivel',
  'emprestado',
  'indisponivel'
]);

const STATUS_EMPRESTIMO = new Set([
  'pendente',
  'ativo',
  'atrasado',
  'devolvido',
  'recusado'
]);

const ORDENACOES = {
  titulo: 'titulo ASC, autores ASC',
  ano: 'ano_publicacao DESC, titulo ASC',
  autor: 'autores ASC, titulo ASC'
};

function limparTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function inteiroPositivo(valor, padrao = 0) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0) return padrao;
  return numero;
}

function dataValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));
}

function validarLivro(body) {
  const titulo = limparTexto(body.titulo);
  const autores = limparTexto(body.autores);
  const ano = Number(body.ano_publicacao);
  const editora = limparTexto(body.editora);
  const exemplares = Number(body.exemplares_total);
  const status = limparTexto(body.status || 'disponivel').toLowerCase();

  if (!titulo || !autores || !editora) {
    return 'Preencha título, autor(es) e editora.';
  }

  if (!Number.isInteger(ano) || ano < 1000 || ano > 9999) {
    return 'Informe um ano de publicação válido.';
  }

  if (!Number.isInteger(exemplares) || exemplares < 1) {
    return 'A quantidade total de exemplares deve ser maior que zero.';
  }

  if (!STATUS_LIVRO.has(status)) {
    return 'Status do livro inválido.';
  }

  return null;
}

function montarConsultaLivros(req) {
  const busca = limparTexto(req.query.busca);
  const status = limparTexto(req.query.status).toLowerCase();
  const ordenar = limparTexto(req.query.ordenar || 'titulo').toLowerCase();

  let sql = `
    SELECT
      id,
      titulo,
      autores,
      ano_publicacao,
      editora,
      exemplares_total,
      exemplares_disponiveis,
      status,
      sinopse,
      criado_em,
      atualizado_em
    FROM biblioteca_livros
    WHERE ativo = 1
  `;

  const params = [];

  if (busca) {
    sql += `
      AND (
        titulo LIKE ?
        OR autores LIKE ?
        OR CAST(ano_publicacao AS CHAR) LIKE ?
      )
    `;

    const termo = `%${busca}%`;
    params.push(termo, termo, termo);
  }

  if (STATUS_LIVRO.has(status)) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ` ORDER BY ${ORDENACOES[ordenar] || ORDENACOES.titulo}`;

  return { sql, params };
}

async function criarNotificacoesSolicitacao(
  connection,
  emprestimoId,
  livro,
  nomeSolicitante,
  matriculaId
) {
  const [destinatarios] = await connection.query(
    `
    SELECT id
    FROM usuarios
    WHERE status = 1
      AND tipo_usuario = 'coordenador'
    `
  );

  if (!destinatarios.length) {
    return;
  }

  const valores = destinatarios.map(usuario => [
    usuario.id,
    'solicitacao_emprestimo_livro',
    'Nova solicitação de empréstimo',
    `${nomeSolicitante} solicitou o livro “${livro.titulo}” (matrícula/ID: ${matriculaId}).`,
    '/coordenador/biblioteca?aba=acervo&subaba=solicitacoes',
    'biblioteca_emprestimo',
    emprestimoId
  ]);

  await connection.query(
    `
    INSERT INTO notificacoes
    (
      usuario_id,
      tipo,
      titulo,
      mensagem,
      link,
      referencia_tipo,
      referencia_id
    )
    VALUES ?
    `,
    [valores]
  );
}

async function concluirNotificacoesSolicitacao(connection, emprestimoId) {
  await connection.query(
    `
    UPDATE notificacoes
    SET lida = 1
    WHERE referencia_tipo = 'biblioteca_emprestimo'
      AND referencia_id = ?
    `,
    [emprestimoId]
  );
}

/* =========================================================
   ROTAS PÚBLICAS
   /api/biblioteca/livros
========================================================= */

publicRouter.get('/', async (req, res) => {
  try {
    const { sql, params } = montarConsultaLivros(req);
    const [rows] = await db.query(sql, params);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[LIVROS][PUBLICO][LISTAR]', err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao carregar o acervo de livros.'
    });
  }
});

publicRouter.post('/:id/emprestimos', async (req, res) => {
  const nomeSolicitante = limparTexto(req.body.nome_solicitante);
  const matriculaId = limparTexto(req.body.matricula_id);
  const dataRetirada = limparTexto(req.body.data_retirada);
  const dataDevolucaoPrevista = limparTexto(
    req.body.data_devolucao_prevista
  );

  if (!nomeSolicitante || !matriculaId) {
    return res.status(400).json({
      ok: false,
      erro: 'Informe o nome e a matrícula ou ID do solicitante.'
    });
  }

  if (!dataValida(dataRetirada) || !dataValida(dataDevolucaoPrevista)) {
    return res.status(400).json({
      ok: false,
      erro: 'Informe datas válidas para retirada e devolução.'
    });
  }

  if (dataDevolucaoPrevista < dataRetirada) {
    return res.status(400).json({
      ok: false,
      erro: 'A devolução prevista não pode ser anterior à retirada.'
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [livros] = await connection.query(
      `
      SELECT *
      FROM biblioteca_livros
      WHERE id = ? AND ativo = 1
      FOR UPDATE
      `,
      [req.params.id]
    );

    const livro = livros[0];

    if (!livro) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        erro: 'Livro não encontrado.'
      });
    }

    if (
      livro.status === 'indisponivel' ||
      Number(livro.exemplares_disponiveis) <= 0
    ) {
      await connection.rollback();
      return res.status(409).json({
        ok: false,
        erro: 'Este livro não possui exemplar disponível para solicitação.'
      });
    }

    const [solicitacoesAbertas] = await connection.query(
      `
      SELECT id
      FROM biblioteca_emprestimos
      WHERE livro_id = ?
        AND matricula_id = ?
        AND status IN ('pendente', 'ativo', 'atrasado')
      LIMIT 1
      `,
      [livro.id, matriculaId]
    );

    if (solicitacoesAbertas.length) {
      await connection.rollback();
      return res.status(409).json({
        ok: false,
        erro: 'Já existe uma solicitação ou empréstimo aberto deste livro para esta matrícula ou ID.'
      });
    }

    const [emprestimo] = await connection.query(
      `
      INSERT INTO biblioteca_emprestimos
      (
        livro_id,
        nome_solicitante,
        matricula_id,
        data_retirada,
        data_devolucao_prevista,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'pendente')
      `,
      [
        livro.id,
        nomeSolicitante,
        matriculaId,
        dataRetirada,
        dataDevolucaoPrevista
      ]
    );

    await criarNotificacoesSolicitacao(
      connection,
      emprestimo.insertId,
      livro,
      nomeSolicitante,
      matriculaId
    );

    await connection.commit();

    res.status(201).json({
      ok: true,
      id: emprestimo.insertId,
      mensagem: 'Solicitação enviada para análise do responsável pela Biblioteca.'
    });
  } catch (err) {
    await connection.rollback();
    console.error('[LIVROS][EMPRESTIMO][SOLICITAR]', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao registrar a solicitação de empréstimo.'
    });
  } finally {
    connection.release();
  }
});

/* =========================================================
   ROTAS ADMINISTRATIVAS
   /api/admin/biblioteca/livros
========================================================= */

adminRouter.get('/', auth('admin', 'coordenador'), async (req, res) => {
  try {
    const { sql, params } = montarConsultaLivros(req);
    const [rows] = await db.query(sql, params);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[LIVROS][ADMIN][LISTAR]', err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao carregar os livros.'
    });
  }
});

adminRouter.get(
  '/emprestimos',
  auth('admin', 'coordenador'),
  async (req, res) => {
    try {
      await db.query(`
        UPDATE biblioteca_emprestimos
        SET status = 'atrasado'
        WHERE status = 'ativo'
          AND data_devolucao_prevista < CURDATE()
      `);

      const status = limparTexto(req.query.status).toLowerCase();
      const busca = limparTexto(req.query.busca);

      let sql = `
        SELECT
          e.id,
          e.livro_id,
          l.titulo AS livro_titulo,
          e.nome_solicitante,
          e.matricula_id,
          e.data_retirada,
          e.data_devolucao_prevista,
          e.data_devolucao,
          e.status,
          e.motivo_recusa,
          e.analisado_em,
          e.analisado_por,
          u.nome_completo AS analisado_por_nome,
          e.criado_em
        FROM biblioteca_emprestimos e
        JOIN biblioteca_livros l ON l.id = e.livro_id
        LEFT JOIN usuarios u ON u.id = e.analisado_por
        WHERE 1 = 1
      `;

      const params = [];

      if (status === 'abertos') {
        sql += " AND e.status IN ('ativo', 'atrasado')";
      } else if (STATUS_EMPRESTIMO.has(status)) {
        sql += ' AND e.status = ?';
        params.push(status);
      }

      if (busca) {
        sql += `
          AND (
            l.titulo LIKE ?
            OR e.nome_solicitante LIKE ?
            OR e.matricula_id LIKE ?
          )
        `;

        const termo = `%${busca}%`;
        params.push(termo, termo, termo);
      }

      sql += `
        ORDER BY
          CASE e.status
            WHEN 'pendente' THEN 1
            WHEN 'atrasado' THEN 2
            WHEN 'ativo' THEN 3
            WHEN 'recusado' THEN 4
            ELSE 5
          END,
          e.data_devolucao_prevista ASC,
          e.id DESC
      `;

      const [rows] = await db.query(sql, params);
      res.json({ ok: true, data: rows });
    } catch (err) {
      console.error('[LIVROS][EMPRESTIMOS][LISTAR]', err);
      res.status(500).json({
        ok: false,
        erro: 'Erro ao carregar as solicitações e os empréstimos.'
      });
    }
  }
);

adminRouter.put(
  '/emprestimos/:id/aprovar',
  auth('admin', 'coordenador'),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `
        SELECT
          e.*,
          l.titulo AS livro_titulo,
          l.exemplares_disponiveis,
          l.status AS livro_status,
          l.ativo AS livro_ativo
        FROM biblioteca_emprestimos e
        JOIN biblioteca_livros l ON l.id = e.livro_id
        WHERE e.id = ?
        FOR UPDATE
        `,
        [req.params.id]
      );

      const solicitacao = rows[0];

      if (!solicitacao) {
        await connection.rollback();
        return res.status(404).json({
          ok: false,
          erro: 'Solicitação não encontrada.'
        });
      }

      if (solicitacao.status !== 'pendente') {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          erro: 'Esta solicitação já foi analisada.'
        });
      }

      if (
        Number(solicitacao.livro_ativo) !== 1 ||
        solicitacao.livro_status === 'indisponivel' ||
        Number(solicitacao.exemplares_disponiveis) <= 0
      ) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          erro: 'Não há exemplar disponível para aprovar esta solicitação.'
        });
      }

      const novaQuantidade =
        Number(solicitacao.exemplares_disponiveis) - 1;

      const novoStatusLivro =
        novaQuantidade > 0 ? 'disponivel' : 'emprestado';

      await connection.query(
        `
        UPDATE biblioteca_emprestimos
        SET
          status = 'ativo',
          analisado_por = ?,
          analisado_em = NOW(),
          motivo_recusa = NULL
        WHERE id = ?
        `,
        [req.user.id, solicitacao.id]
      );

      await connection.query(
        `
        UPDATE biblioteca_livros
        SET exemplares_disponiveis = ?, status = ?
        WHERE id = ?
        `,
        [novaQuantidade, novoStatusLivro, solicitacao.livro_id]
      );

      await concluirNotificacoesSolicitacao(connection, solicitacao.id);
      await connection.commit();

      res.json({
        ok: true,
        mensagem: 'Solicitação aprovada e empréstimo ativado com sucesso.'
      });
    } catch (err) {
      await connection.rollback();
      console.error('[LIVROS][EMPRESTIMO][APROVAR]', err);

      res.status(500).json({
        ok: false,
        erro: 'Erro ao aprovar a solicitação de empréstimo.'
      });
    } finally {
      connection.release();
    }
  }
);

adminRouter.put(
  '/emprestimos/:id/recusar',
  auth('admin', 'coordenador'),
  async (req, res) => {
    const motivoRecusa =
      limparTexto(req.body.motivo_recusa) || 'Solicitação recusada.';

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `
        SELECT id, status
        FROM biblioteca_emprestimos
        WHERE id = ?
        FOR UPDATE
        `,
        [req.params.id]
      );

      const solicitacao = rows[0];

      if (!solicitacao) {
        await connection.rollback();
        return res.status(404).json({
          ok: false,
          erro: 'Solicitação não encontrada.'
        });
      }

      if (solicitacao.status !== 'pendente') {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          erro: 'Esta solicitação já foi analisada.'
        });
      }

      await connection.query(
        `
        UPDATE biblioteca_emprestimos
        SET
          status = 'recusado',
          analisado_por = ?,
          analisado_em = NOW(),
          motivo_recusa = ?
        WHERE id = ?
        `,
        [req.user.id, motivoRecusa, solicitacao.id]
      );

      await concluirNotificacoesSolicitacao(connection, solicitacao.id);
      await connection.commit();

      res.json({
        ok: true,
        mensagem: 'Solicitação recusada com sucesso.'
      });
    } catch (err) {
      await connection.rollback();
      console.error('[LIVROS][EMPRESTIMO][RECUSAR]', err);

      res.status(500).json({
        ok: false,
        erro: 'Erro ao recusar a solicitação de empréstimo.'
      });
    } finally {
      connection.release();
    }
  }
);

adminRouter.put(
  '/emprestimos/:id/devolver',
  auth('admin', 'coordenador'),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `
        SELECT
          e.*,
          l.exemplares_total,
          l.exemplares_disponiveis,
          l.status AS livro_status
        FROM biblioteca_emprestimos e
        JOIN biblioteca_livros l ON l.id = e.livro_id
        WHERE e.id = ?
        FOR UPDATE
        `,
        [req.params.id]
      );

      const emprestimo = rows[0];

      if (!emprestimo) {
        await connection.rollback();
        return res.status(404).json({
          ok: false,
          erro: 'Empréstimo não encontrado.'
        });
      }

      if (!['ativo', 'atrasado'].includes(emprestimo.status)) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          erro: 'Somente empréstimos ativos ou atrasados podem ser devolvidos.'
        });
      }

      await connection.query(
        `
        UPDATE biblioteca_emprestimos
        SET status = 'devolvido', data_devolucao = CURDATE()
        WHERE id = ?
        `,
        [emprestimo.id]
      );

      const novaQuantidade = Math.min(
        Number(emprestimo.exemplares_total),
        Number(emprestimo.exemplares_disponiveis) + 1
      );

      const novoStatus =
        emprestimo.livro_status === 'indisponivel'
          ? 'indisponivel'
          : 'disponivel';

      await connection.query(
        `
        UPDATE biblioteca_livros
        SET exemplares_disponiveis = ?, status = ?
        WHERE id = ?
        `,
        [novaQuantidade, novoStatus, emprestimo.livro_id]
      );

      await connection.commit();

      res.json({
        ok: true,
        mensagem: 'Devolução registrada com sucesso.'
      });
    } catch (err) {
      await connection.rollback();
      console.error('[LIVROS][EMPRESTIMO][DEVOLVER]', err);
      res.status(500).json({
        ok: false,
        erro: 'Erro ao registrar a devolução.'
      });
    } finally {
      connection.release();
    }
  }
);

adminRouter.get('/:id', auth('admin', 'coordenador'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT *
      FROM biblioteca_livros
      WHERE id = ? AND ativo = 1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        erro: 'Livro não encontrado.'
      });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[LIVROS][ADMIN][BUSCAR]', err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao buscar o livro.'
    });
  }
});

adminRouter.post('/', auth('admin', 'coordenador'), async (req, res) => {
  const erro = validarLivro(req.body);

  if (erro) {
    return res.status(400).json({ ok: false, erro });
  }

  try {
    const status = limparTexto(req.body.status || 'disponivel').toLowerCase();
    const total = inteiroPositivo(req.body.exemplares_total, 1);
    const disponiveis = status === 'disponivel' ? total : 0;

    const [result] = await db.query(
      `
      INSERT INTO biblioteca_livros
      (
        titulo,
        autores,
        ano_publicacao,
        editora,
        exemplares_total,
        exemplares_disponiveis,
        status,
        sinopse,
        criado_por,
        ativo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        limparTexto(req.body.titulo),
        limparTexto(req.body.autores),
        Number(req.body.ano_publicacao),
        limparTexto(req.body.editora),
        total,
        disponiveis,
        status,
        limparTexto(req.body.sinopse) || null,
        req.user.id
      ]
    );

    res.status(201).json({
      ok: true,
      id: result.insertId,
      mensagem: 'Livro cadastrado com sucesso.'
    });
  } catch (err) {
    console.error('[LIVROS][ADMIN][CRIAR]', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao cadastrar o livro.'
    });
  }
});

adminRouter.put('/:id', auth('admin', 'coordenador'), async (req, res) => {
  const erro = validarLivro(req.body);

  if (erro) {
    return res.status(400).json({ ok: false, erro });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [livros] = await connection.query(
      `
      SELECT *
      FROM biblioteca_livros
      WHERE id = ? AND ativo = 1
      FOR UPDATE
      `,
      [req.params.id]
    );

    if (!livros.length) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        erro: 'Livro não encontrado.'
      });
    }

    const [[ativos]] = await connection.query(
      `
      SELECT COUNT(*) AS total
      FROM biblioteca_emprestimos
      WHERE livro_id = ?
        AND status IN ('ativo', 'atrasado')
      `,
      [req.params.id]
    );

    const total = inteiroPositivo(req.body.exemplares_total, 1);
    const totalEmprestado = Number(ativos.total || 0);

    if (total < totalEmprestado) {
      await connection.rollback();
      return res.status(409).json({
        ok: false,
        erro: `Existem ${totalEmprestado} empréstimo(s) ativo(s). O total de exemplares não pode ser menor que essa quantidade.`
      });
    }

    const statusInformado = limparTexto(req.body.status).toLowerCase();
    const disponiveisCalculados = total - totalEmprestado;

    let statusFinal = statusInformado;
    let disponiveisFinal = disponiveisCalculados;

    if (statusInformado === 'indisponivel') {
      disponiveisFinal = 0;
    } else if (disponiveisCalculados === 0) {
      statusFinal = 'emprestado';
    } else {
      statusFinal = 'disponivel';
    }

    await connection.query(
      `
      UPDATE biblioteca_livros
      SET
        titulo = ?,
        autores = ?,
        ano_publicacao = ?,
        editora = ?,
        exemplares_total = ?,
        exemplares_disponiveis = ?,
        status = ?,
        sinopse = ?
      WHERE id = ?
      `,
      [
        limparTexto(req.body.titulo),
        limparTexto(req.body.autores),
        Number(req.body.ano_publicacao),
        limparTexto(req.body.editora),
        total,
        disponiveisFinal,
        statusFinal,
        limparTexto(req.body.sinopse) || null,
        req.params.id
      ]
    );

    await connection.commit();

    res.json({
      ok: true,
      mensagem: 'Livro atualizado com sucesso.'
    });
  } catch (err) {
    await connection.rollback();
    console.error('[LIVROS][ADMIN][ATUALIZAR]', err);

    res.status(500).json({
      ok: false,
      erro: 'Erro ao atualizar o livro.'
    });
  } finally {
    connection.release();
  }
});

adminRouter.delete('/:id', auth('admin', 'coordenador'), async (req, res) => {
  try {
    const [[abertos]] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM biblioteca_emprestimos
      WHERE livro_id = ?
        AND status IN ('pendente', 'ativo', 'atrasado')
      `,
      [req.params.id]
    );

    if (Number(abertos.total) > 0) {
      return res.status(409).json({
        ok: false,
        erro: 'Não é possível excluir um livro com solicitação ou empréstimo aberto.'
      });
    }

    await db.query(
      'UPDATE biblioteca_livros SET ativo = 0 WHERE id = ?',
      [req.params.id]
    );

    res.json({
      ok: true,
      mensagem: 'Livro removido do acervo.'
    });
  } catch (err) {
    console.error('[LIVROS][ADMIN][EXCLUIR]', err);
    res.status(500).json({
      ok: false,
      erro: 'Erro ao remover o livro.'
    });
  }
});

module.exports = {
  publicRouter,
  adminRouter
};
