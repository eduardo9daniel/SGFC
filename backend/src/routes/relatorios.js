const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

function inteiroPositivo(valor, padrao) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : padrao;
}

function dataValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''));
}

function montarFiltrosLogs(query = {}) {
  const where = [];
  const params = [];

  const busca = String(query.busca || '').trim();
  const acao = String(query.acao || '').trim();
  const tipoUsuario = String(query.tipo_usuario || '').trim();
  const usuarioId = inteiroPositivo(query.usuario_id, null);

  if (busca) {
    const termo = `%${busca}%`;
    where.push(`(
      CAST(l.id AS CHAR) LIKE ?
      OR l.acao LIKE ?
      OR l.descricao LIKE ?
      OR l.ip LIKE ?
      OR u.nome_completo LIKE ?
      OR u.email LIKE ?
    )`);
    params.push(termo, termo, termo, termo, termo, termo);
  }

  if (acao) {
    where.push('l.acao = ?');
    params.push(acao);
  }

  if (usuarioId) {
    where.push('l.usuario_id = ?');
    params.push(usuarioId);
  }

  if (tipoUsuario) {
    where.push('u.tipo_usuario = ?');
    params.push(tipoUsuario);
  }

  if (dataValida(query.data_inicio)) {
    where.push('l.criado_em >= ?');
    params.push(`${query.data_inicio} 00:00:00`);
  }

  if (dataValida(query.data_fim)) {
    where.push('l.criado_em < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(`${query.data_fim} 00:00:00`);
  }

  return {
    sql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
}

function escaparCsv(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return `"${texto}"`;
}

// GET /api/relatorios
router.get('/', auth('admin', 'coordenador','equipe'), async (req, res) => {
  const { formacao_id, data_inicio, data_fim } = req.query;
  const di = data_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const df = data_fim    || new Date().toISOString().slice(0,10);

  const [[ep]] = await db.query(
    `SELECT COUNT(*) AS inscricoes, COUNT(DISTINCT i.usuario_id) AS participantes,
     COUNT(DISTINCT i.formacao_id) AS formacoes
     FROM inscricoes i JOIN formacoes f ON f.id = i.formacao_id
     WHERE i.data_inscricao BETWEEN ? AND ? AND i.status='confirmada'`,
    [di+' 00:00:00', df+' 23:59:59']
  );

  const [topFormacoes] = await db.query(
    `SELECT f.titulo, f.carga_horaria, COUNT(i.id) AS total_inscritos, f.vagas, f.status
     FROM inscricoes i JOIN formacoes f ON f.id = i.formacao_id
     WHERE i.data_inscricao BETWEEN ? AND ? AND i.status='confirmada'
     GROUP BY i.formacao_id ORDER BY total_inscritos DESC LIMIT 10`,
    [di+' 00:00:00', df+' 23:59:59']
  );

  const [distStatus] = await db.query('SELECT status, COUNT(*) AS total FROM formacoes GROUP BY status');

  let relInscricoes = [];
  if (formacao_id) {
    [relInscricoes] = await db.query(
      `SELECT u.nome_completo, u.cpf, u.email, u.telefone,
       i.data_inscricao, i.status,
       (SELECT COUNT(*) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS total_aulas,
       (SELECT IFNULL(SUM(fq.presente),0) FROM frequencias fq WHERE fq.inscricao_id = i.id) AS presentes,
       c.codigo_validacao
       FROM inscricoes i
       JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN certificados c ON c.inscricao_id = i.id
       WHERE i.formacao_id = ? ORDER BY u.nome_completo`,
      [formacao_id]
    );
  }

  res.json({ ok: true, data: { estatsPeriodo: ep, topFormacoes, distStatus, relInscricoes } });
});

// GET /api/relatorios/logs/exportar — exporta os registros filtrados em CSV
router.get('/logs/exportar', auth('admin'), async (req, res) => {
  try {
    const filtros = montarFiltrosLogs(req.query);

    const [rows] = await db.query(
      `SELECT
        l.id,
        l.acao,
        l.descricao,
        l.ip,
        l.criado_em,
        u.id AS usuario_id,
        u.nome_completo,
        u.email AS usuario_email,
        u.tipo_usuario AS usuario_tipo,
        u.status AS usuario_status
       FROM logs_atividades l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
       ${filtros.sql}
       ORDER BY l.criado_em DESC, l.id DESC
       LIMIT 10000`,
      filtros.params
    );

    const cabecalho = [
      'ID',
      'Data e hora',
      'Ação',
      'Descrição',
      'IP',
      'ID do usuário',
      'Usuário',
      'E-mail',
      'Perfil',
      'Status do usuário'
    ];

    const linhas = rows.map(item => [
      item.id,
      item.criado_em,
      item.acao,
      item.descricao,
      item.ip,
      item.usuario_id,
      item.nome_completo,
      item.usuario_email,
      item.usuario_tipo,
      item.usuario_status === null || item.usuario_status === undefined
        ? ''
        : Number(item.usuario_status) === 1 ? 'Ativo' : 'Inativo'
    ]);

    const csv = '\uFEFF' + [cabecalho, ...linhas]
      .map(linha => linha.map(escaparCsv).join(';'))
      .join('\r\n');

    const dataArquivo = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="logs-atividades-${dataArquivo}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    res.status(500).json({ ok: false, erro: 'Não foi possível exportar os logs.' });
  }
});

// GET /api/relatorios/logs — consulta administrativa com filtros e indicadores
router.get('/logs', auth('admin'), async (req, res) => {
  try {
    const pagina = inteiroPositivo(req.query.p, 1);
    const porPaginaSolicitado = inteiroPositivo(req.query.por_pagina, 25);
    const porPagina = [25, 50, 100].includes(porPaginaSolicitado)
      ? porPaginaSolicitado
      : 25;
    const offset = (pagina - 1) * porPagina;
    const filtros = montarFiltrosLogs(req.query);

    const [rows] = await db.query(
      `SELECT
        l.id,
        l.usuario_id,
        l.acao,
        l.descricao,
        l.ip,
        l.criado_em,
        u.nome_completo,
        u.email AS usuario_email,
        u.tipo_usuario AS usuario_tipo,
        u.status AS usuario_status
       FROM logs_atividades l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
       ${filtros.sql}
       ORDER BY l.criado_em DESC, l.id DESC
       LIMIT ? OFFSET ?`,
      [...filtros.params, porPagina, offset]
    );

    const [[resumo]] = await db.query(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(DATE(l.criado_em) = CURDATE()), 0) AS atividades_hoje,
        COUNT(DISTINCT l.usuario_id) AS usuarios_distintos,
        COUNT(DISTINCT NULLIF(l.ip, '')) AS ips_distintos,
        COALESCE(SUM(l.usuario_id IS NULL), 0) AS registros_sem_usuario,
        MIN(l.criado_em) AS primeiro_registro,
        MAX(l.criado_em) AS ultimo_registro
       FROM logs_atividades l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
       ${filtros.sql}`,
      filtros.params
    );

    const [acoesMaisFrequentes] = await db.query(
      `SELECT l.acao, COUNT(*) AS total
       FROM logs_atividades l
       LEFT JOIN usuarios u ON u.id = l.usuario_id
       ${filtros.sql}
       GROUP BY l.acao
       ORDER BY total DESC, l.acao ASC
       LIMIT 6`,
      filtros.params
    );

    const [acoesDisponiveis] = await db.query(
      `SELECT DISTINCT acao
       FROM logs_atividades
       WHERE acao IS NOT NULL AND acao <> ''
       ORDER BY acao ASC`
    );

    const [usuariosDisponiveis] = await db.query(
      `SELECT DISTINCT u.id, u.nome_completo, u.email, u.tipo_usuario
       FROM logs_atividades l
       INNER JOIN usuarios u ON u.id = l.usuario_id
       ORDER BY u.nome_completo ASC`
    );

    const total = Number(resumo.total || 0);
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

    res.json({
      ok: true,
      data: rows,
      total,
      pagina,
      por_pagina: porPagina,
      total_paginas: totalPaginas,
      resumo: {
        ...resumo,
        total,
        atividades_hoje: Number(resumo.atividades_hoje || 0),
        usuarios_distintos: Number(resumo.usuarios_distintos || 0),
        ips_distintos: Number(resumo.ips_distintos || 0),
        registros_sem_usuario: Number(resumo.registros_sem_usuario || 0)
      },
      acoes_mais_frequentes: acoesMaisFrequentes.map(item => ({
        ...item,
        total: Number(item.total || 0)
      })),
      opcoes: {
        acoes: acoesDisponiveis.map(item => item.acao),
        usuarios: usuariosDisponiveis
      }
    });
  } catch (error) {
    console.error('Erro ao carregar logs:', error);
    res.status(500).json({ ok: false, erro: 'Não foi possível carregar os logs de atividades.' });
  }
});

module.exports = router;
