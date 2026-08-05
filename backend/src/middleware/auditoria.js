const jwt = require('jsonwebtoken');
const db = require('../config/db');

const MAX_DESCRICAO = 1200;

/**
 * Converte qualquer valor em texto seguro e limita o tamanho.
 */
function texto(valor, limite = 180) {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limite);
}

/**
 * Obtém o IP real do usuário, inclusive quando existe proxy ou Nginx.
 */
function obterIp(req) {
  const encaminhado = req.headers['x-forwarded-for'];

  if (encaminhado) {
    return String(encaminhado)
      .split(',')[0]
      .trim()
      .slice(0, 45);
  }

  return texto(
    req.ip || req.socket?.remoteAddress || '',
    45
  ) || null;
}

/**
 * Tenta identificar o usuário diretamente pelo token JWT.
 *
 * Isso permite que o middleware encontre o usuário mesmo quando
 * ele foi instalado antes das rotas autenticadas.
 */
function obterUsuarioDoToken(req) {
  const cabecalho = req.headers.authorization || '';

  if (!cabecalho.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = cabecalho.slice(7);

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    return payload?.id || null;
  } catch {
    return null;
  }
}

/**
 * Retorna a rota sem os parâmetros da URL.
 */
function caminho(req) {
  return String(
    req.originalUrl || req.url || ''
  ).split('?')[0];
}

/**
 * Tenta obter o ID de um registro criado pela resposta da API.
 */
function idDaResposta(res) {
  const corpo = res.locals.auditResponseBody;

  return (
    corpo?.id ||
    corpo?.data?.id ||
    corpo?.inscricao_id ||
    corpo?.certificado_id ||
    corpo?.proposta_id ||
    null
  );
}

/**
 * Monta uma descrição dos filtros utilizados.
 */
function detalheFiltros(req, campos) {
  const partes = [];

  for (const campo of campos) {
    const valor = req.query?.[campo];

    if (
      valor !== undefined &&
      valor !== null &&
      String(valor).trim() !== ''
    ) {
      partes.push(
        `${campo}=${texto(valor, 80)}`
      );
    }
  }

  return partes.length
    ? ` Filtros: ${partes.join(', ')}.`
    : '';
}

/**
 * Recupera uma possível mensagem de erro enviada pela API.
 */
function erroDaResposta(res) {
  const erro = texto(
    res.locals.auditResponseBody?.erro || '',
    240
  );

  return erro
    ? ` Motivo informado: ${erro}.`
    : '';
}

/**
 * Identifica o formato de exportação.
 */
function formatoExportacao(req, rota) {
  const origem = String(
    req.query?.formato ||
    req.body?.formato ||
    rota
  ).toLowerCase();

  if (
    origem.includes('xlsx') ||
    origem.includes('excel')
  ) {
    return 'EXCEL';
  }

  if (origem.includes('pdf')) {
    return 'PDF';
  }

  if (origem.includes('csv')) {
    return 'CSV';
  }

  return 'ARQUIVO';
}

/**
 * Identifica a ação realizada a partir da rota e do método HTTP.
 */
function identificarAcao(req, res) {
  /*
   * Permite que uma rota informe manualmente uma descrição
   * mais detalhada.
   */
  if (
    req.auditAction &&
    req.auditDescription
  ) {
    return {
      acao: texto(
        req.auditAction,
        100
      ).toUpperCase(),

      descricao: texto(
        req.auditDescription,
        MAX_DESCRICAO
      )
    };
  }

  const metodo = req.method.toUpperCase();
  const rota = caminho(req);
  const corpo = req.body || {};
  const respostaId = idDaResposta(res);

  let acao = '';
  let descricao = '';
  let match;

  // ─────────────────────────────────────────────────────────────
  // AUTENTICAÇÃO, SESSÃO E NAVEGAÇÃO
  // ─────────────────────────────────────────────────────────────

  if (
    metodo === 'GET' &&
    rota === '/api/auth/me'
  ) {
    acao = 'SESSAO_CONSULTADA';
    descricao =
      'Consultou os dados da própria sessão.';
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/auth/gerar-codigo-primeiro-acesso'
  ) {
    acao = 'PRIMEIRO_ACESSO_CODIGO_GERADO';
    descricao =
      'Solicitou o envio do código de confirmação do primeiro acesso.';
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/auth/primeiro-acesso'
  ) {
    acao = 'PRIMEIRO_ACESSO_CONCLUIDO';
    descricao =
      'Confirmou os dados e definiu a senha no primeiro acesso.';
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/auth/logout'
  ) {
    acao = 'LOGOUT';
    descricao =
      'Encerrou a sessão pelo botão Sair.';
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/auth/navegacao'
  ) {
    acao = 'PAGINA_ACESSADA';

    descricao =
      `Acessou a página "${texto(
        corpo.titulo || 'Página do sistema',
        160
      )}" (${texto(
        corpo.rota || '/',
        220
      )}).`;
  }

  /*
   * Esta rota será criada posteriormente.
   *
   * Ela será usada para registrar ações executadas somente
   * no frontend, como abrir documentos, acessar Lattes e
   * exportar relatórios montados no navegador.
   */
  else if (
    metodo === 'POST' &&
    rota === '/api/auth/auditoria'
  ) {
    acao = texto(
      corpo.acao || 'ACAO_DO_SISTEMA',
      100
    ).toUpperCase();

    descricao = texto(
      corpo.descricao ||
      'Realizou uma ação registrada pelo sistema.',
      MAX_DESCRICAO
    );
  }

  // ─────────────────────────────────────────────────────────────
  // FORMAÇÕES
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/formacoes'
  ) {
    acao = 'FORMACOES_CONSULTADAS';

    descricao =
      `Consultou a lista de formações.${detalheFiltros(
        req,
        ['status', 'disponiveis', 'busca']
      )}`;
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/formacoes\/(\d+)$/
      )
    )
  ) {
    acao = 'FORMACAO_ACESSADA';

    descricao =
      `Acessou os detalhes da formação #${match[1]}.`;
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/formacoes'
  ) {
    acao = 'FORMACAO_CADASTRADA';

    descricao =
      `Cadastrou a formação "${texto(
        corpo.titulo || 'Sem título'
      )}"${respostaId
        ? ` (#${respostaId})`
        : ''
      }.`;
  }

  else if (
    ['PUT', 'PATCH'].includes(metodo) &&
    (
      match = rota.match(
        /^\/api\/formacoes\/(\d+)$/
      )
    )
  ) {
    acao = 'FORMACAO_ATUALIZADA';

    descricao =
      `Atualizou a formação #${match[1]}` +
      `${corpo.titulo
        ? ` — "${texto(corpo.titulo)}"`
        : ''
      }.`;
  }

  else if (
    ['PUT', 'PATCH'].includes(metodo) &&
    (
      match = rota.match(
        /^\/api\/formacoes\/(\d+)\/(cancelar|status)$/
      )
    )
  ) {
    acao = 'FORMACAO_CANCELADA';

    descricao =
      `Alterou ou cancelou a formação #${match[1]}.`;
  }

  else if (
    metodo === 'DELETE' &&
    (
      match = rota.match(
        /^\/api\/formacoes\/(\d+)$/
      )
    )
  ) {
    acao = 'FORMACAO_EXCLUIDA';

    descricao =
      `Excluiu a formação #${match[1]}.`;
  }

  // ─────────────────────────────────────────────────────────────
  // INSCRIÇÕES
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/inscricoes'
  ) {
    acao = 'INSCRICOES_CONSULTADAS';

    descricao =
      `Consultou inscrições.${detalheFiltros(
        req,
        ['formacao_id', 'status']
      )}`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/inscricoes/minhas'
  ) {
    acao = 'MINHAS_INSCRICOES_CONSULTADAS';

    descricao =
      'Consultou as próprias inscrições.';
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/inscricoes/admin'
  ) {
    acao = 'PARTICIPANTE_INSCRITO';

    descricao =
      `Inscreveu o participante #${texto(
        corpo.usuario_id,
        30
      )} na formação #${texto(
        corpo.formacao_id,
        30
      )}${respostaId
        ? `, gerando a inscrição #${respostaId}`
        : ''
      }.`;
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/inscricoes'
  ) {
    acao = 'INSCRICAO_REALIZADA';

    descricao =
      `Realizou inscrição na formação #${texto(
        corpo.formacao_id,
        30
      )}.`;
  }

  else if (
    metodo === 'DELETE' &&
    (
      match = rota.match(
        /^\/api\/inscricoes\/(\d+)$/
      )
    )
  ) {
    acao = 'INSCRICAO_CANCELADA';

    descricao =
      `Cancelou a inscrição #${match[1]}.`;
  }

  else if (
    ['PUT', 'PATCH'].includes(metodo) &&
    (
      match = rota.match(
        /^\/api\/inscricoes\/(\d+)\/cancelar$/
      )
    )
  ) {
    acao = 'INSCRICAO_CANCELADA';

    descricao =
      `Cancelou a inscrição #${match[1]}.`;
  }

  // ─────────────────────────────────────────────────────────────
  // FREQUÊNCIA
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/frequencias'
  ) {
    acao = 'FREQUENCIA_CONSULTADA';

    descricao =
      `Consultou a frequência da formação #${texto(
        req.query?.formacao_id,
        30
      )}` +
      `${req.query?.data_aula
        ? ` na data ${texto(
            req.query.data_aula,
            20
          )}`
        : ''
      }.`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/frequencias/minha'
  ) {
    acao = 'MINHA_FREQUENCIA_CONSULTADA';

    descricao =
      `Consultou a própria frequência na inscrição #${texto(
        req.query?.inscricao_id,
        30
      )}.`;
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/frequencias'
  ) {
    const totalMarcacoes = Object.keys(
      corpo.presencas || {}
    ).length;

    const totalInscritos = Array.isArray(
      corpo.todos_inscritos
    )
      ? corpo.todos_inscritos.length
      : totalMarcacoes;

    acao = 'FREQUENCIA_REGISTRADA';

    descricao =
      `Registrou a frequência da formação #${texto(
        corpo.formacao_id,
        30
      )} em ${texto(
        corpo.data_aula,
        20
      )} para ${totalInscritos} participante(s), ` +
      `com ${totalMarcacoes} marcação(ões) informada(s).`;
  }

  // ─────────────────────────────────────────────────────────────
  // CERTIFICADOS
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/certificados'
  ) {
    acao = 'CERTIFICADOS_CONSULTADOS';

    descricao =
      `Consultou certificados.${detalheFiltros(
        req,
        ['formacao_id']
      )}`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/certificados/meus'
  ) {
    acao = 'MEUS_CERTIFICADOS_CONSULTADOS';

    descricao =
      'Consultou os próprios certificados.';
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/certificados'
  ) {
    acao = 'CERTIFICADO_EMITIDO';

    descricao =
      `Emitiu um certificado para a inscrição #${texto(
        corpo.inscricao_id,
        30
      )}.`;
  }

  else if (
    metodo === 'PATCH' &&
    (
      match = rota.match(
        /^\/api\/certificados\/(\d+)\/revogar$/
      )
    )
  ) {
    acao = 'CERTIFICADO_STATUS_ALTERADO';

    descricao =
      `Alterou o certificado #${match[1]} para o status ` +
      `"${texto(corpo.status, 40)}". Motivo: ` +
      `${texto(
        corpo.motivo || 'não informado',
        240
      )}.`;
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/certificados\/(\d+)\/qrcode$/
      )
    )
  ) {
    acao = 'CERTIFICADO_QRCODE_CONSULTADO';

    descricao =
      `Consultou o QR Code do certificado #${match[1]}.`;
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/certificados\/(\d+)\/logs$/
      )
    )
  ) {
    acao = 'CERTIFICADO_LOGS_CONSULTADOS';

    descricao =
      `Consultou o histórico de validações do certificado #${match[1]}.`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/certificados/relatorio-consultas'
  ) {
    acao = 'CERTIFICADOS_RELATORIO_CONSULTADO';

    descricao =
      'Consultou o relatório de validações de certificados.';
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/certificados\/([^/]+)\/pdf$/
      )
    )
  ) {
    acao = 'CERTIFICADO_PDF_BAIXADO';

    descricao =
      `Baixou o PDF do certificado identificado por ${texto(
        match[1],
        80
      )}.`;
  }

  // ─────────────────────────────────────────────────────────────
  // RELATÓRIOS E LOGS
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/relatorios'
  ) {
    acao = 'RELATORIOS_CONSULTADOS';

    descricao =
      `Consultou os relatórios gerenciais.${detalheFiltros(
        req,
        [
          'formacao_id',
          'data_inicio',
          'data_fim'
        ]
      )}`;
  }

  else if (
    ['GET', 'POST'].includes(metodo) &&
    /^\/api\/relatorios\/(exportar|exportar-csv|exportar-pdf|exportar-excel|csv|pdf|excel|xlsx)$/i.test(
      rota
    )
  ) {
    const formato =
      formatoExportacao(req, rota);

    acao =
      `RELATORIO_EXPORTADO_${formato}`;

    descricao =
      `Exportou um relatório em ${formato}.${detalheFiltros(
        req,
        [
          'formacao_id',
          'data_inicio',
          'data_fim',
          'tipo'
        ]
      )}`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/relatorios/logs'
  ) {
    acao = 'LOGS_CONSULTADOS';

    descricao =
      `Consultou o histórico de atividades.${detalheFiltros(
        req,
        [
          'busca',
          'acao',
          'usuario_id',
          'tipo_usuario',
          'data_inicio',
          'data_fim',
          'p'
        ]
      )}`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/relatorios/logs/exportar'
  ) {
    acao = 'LOGS_EXPORTADOS';

    descricao =
      'Exportou o histórico de atividades em CSV.';
  }

  // ─────────────────────────────────────────────────────────────
  // PROPOSTAS DE FORMAÇÃO
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'POST' &&
    rota === '/api/propostas-formacao'
  ) {
    acao = 'PROPOSTA_FORMACAO_ENVIADA';

    descricao =
      `Enviou a proposta de formação "${texto(
        corpo.titulo ||
        corpo.nome_formacao ||
        'Sem título'
      )}"${respostaId
        ? ` (#${respostaId})`
        : ''
      }.`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/propostas-formacao/minhas'
  ) {
    acao = 'MINHAS_PROPOSTAS_CONSULTADAS';

    descricao =
      'Consultou as próprias propostas de formação.';
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/propostas-formacao/coordenador'
  ) {
    acao = 'PROPOSTAS_FORMACAO_CONSULTADAS';

    descricao =
      'Consultou as propostas de formação recebidas.';
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/propostas-formacao\/(\d+)$/
      )
    )
  ) {
    acao = 'PROPOSTA_FORMACAO_ACESSADA';

    descricao =
      `Acessou os detalhes da proposta de formação #${match[1]}.`;
  }

  else if (
    metodo === 'PATCH' &&
    (
      match = rota.match(
        /^\/api\/propostas-formacao\/(\d+)\/confirmar$/
      )
    )
  ) {
    acao = 'PROPOSTA_FORMACAO_CONFIRMADA';

    descricao =
      `Confirmou a proposta de formação #${match[1]} e gerou uma formação no sistema.`;
  }

  else if (
    metodo === 'PATCH' &&
    (
      match = rota.match(
        /^\/api\/propostas-formacao\/(\d+)\/recusar$/
      )
    )
  ) {
    acao = 'PROPOSTA_FORMACAO_RECUSADA';

    descricao =
      `Recusou a proposta de formação #${match[1]}. Motivo: ` +
      `${texto(
        corpo.motivo_recusa ||
        corpo.motivo ||
        'não informado',
        240
      )}.`;
  }

  // ─────────────────────────────────────────────────────────────
  // NOTIFICAÇÕES
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/notificacoes'
  ) {
    acao = 'NOTIFICACOES_CONSULTADAS';

    descricao =
      'Consultou as notificações.';
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/notificacoes\/(\d+)$/
      )
    )
  ) {
    acao = 'NOTIFICACAO_ABERTA';

    descricao =
      `Abriu a notificação #${match[1]}.`;
  }

  else if (
    ['PUT', 'PATCH'].includes(metodo) &&
    (
      match = rota.match(
        /^\/api\/notificacoes\/(\d+)\/lida$/
      )
    )
  ) {
    acao = 'NOTIFICACAO_LIDA';

    descricao =
      `Abriu e marcou a notificação #${match[1]} como lida.`;
  }

  // ─────────────────────────────────────────────────────────────
  // BIBLIOTECA
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/biblioteca'
  ) {
    acao = 'BIBLIOTECA_ACESSADA';

    descricao =
      `Acessou o acervo da biblioteca.${detalheFiltros(
        req,
        ['busca', 'tipo_trabalho']
      )}`;
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/biblioteca\/(\d+)$/
      )
    )
  ) {
    acao = 'BIBLIOTECA_ITEM_ACESSADO';

    descricao =
      `Acessou o item #${match[1]} da biblioteca.`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/admin/biblioteca'
  ) {
    acao = 'BIBLIOTECA_ADMIN_ACESSADA';

    descricao =
      `Acessou o gerenciamento da biblioteca.${detalheFiltros(
        req,
        ['busca']
      )}`;
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/admin\/biblioteca\/(\d+)$/
      )
    )
  ) {
    acao = 'BIBLIOTECA_ITEM_ADMIN_ACESSADO';

    descricao =
      `Acessou o item #${match[1]} no gerenciamento da biblioteca.`;
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/admin/biblioteca'
  ) {
    acao = 'BIBLIOTECA_ITEM_CADASTRADO';

    descricao =
      `Cadastrou na biblioteca o trabalho "${texto(
        corpo.titulo || 'Sem título'
      )}"${respostaId
        ? ` (#${respostaId})`
        : ''
      }, de ${texto(
        corpo.autor || 'autor não informado'
      )}.`;
  }

  else if (
    ['PUT', 'PATCH'].includes(metodo) &&
    (
      match = rota.match(
        /^\/api\/admin\/biblioteca\/(\d+)$/
      )
    )
  ) {
    acao = 'BIBLIOTECA_ITEM_ATUALIZADO';

    descricao =
      `Atualizou o item #${match[1]} da biblioteca` +
      `${corpo.titulo
        ? ` — "${texto(corpo.titulo)}"`
        : ''
      }.`;
  }

  else if (
    metodo === 'DELETE' &&
    (
      match = rota.match(
        /^\/api\/admin\/biblioteca\/(\d+)$/
      )
    )
  ) {
    acao = 'BIBLIOTECA_ITEM_REMOVIDO';

    descricao =
      `Removeu ou desativou o item #${match[1]} da biblioteca.`;
  }

  // ─────────────────────────────────────────────────────────────
  // PESQUISAS E PESQUISADORES NEST
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/pesquisadores-nest'
  ) {
    acao = 'PESQUISAS_ACESSADAS';

    descricao =
      `Acessou o banco público de pesquisas.${detalheFiltros(
        req,
        [
          'busca',
          'natureza_pesquisa',
          'tipo_trabalho'
        ]
      )}`;
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/pesquisadores-nest\/(\d+)$/
      )
    )
  ) {
    acao = 'PESQUISA_ACESSADA';

    descricao =
      `Acessou a pesquisa #${match[1]}.`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/admin/pesquisadores-nest'
  ) {
    acao = 'PESQUISAS_ADMIN_ACESSADAS';

    descricao =
      `Acessou o gerenciamento de pesquisas.${detalheFiltros(
        req,
        [
          'busca',
          'natureza_pesquisa',
          'tipo_trabalho'
        ]
      )}`;
  }

  else if (
    metodo === 'GET' &&
    (
      match = rota.match(
        /^\/api\/admin\/pesquisadores-nest\/(\d+)$/
      )
    )
  ) {
    acao = 'PESQUISA_ADMIN_ACESSADA';

    descricao =
      `Acessou a pesquisa #${match[1]} no gerenciamento.`;
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/admin/pesquisadores-nest'
  ) {
    acao = 'PESQUISA_CADASTRADA';

    descricao =
      `Cadastrou a pesquisa "${texto(
        corpo.titulo_trabalho ||
        corpo.nome ||
        'Sem identificação'
      )}"${respostaId
        ? ` (#${respostaId})`
        : ''
      }.`;
  }

  else if (
    ['PUT', 'PATCH'].includes(metodo) &&
    (
      match = rota.match(
        /^\/api\/admin\/pesquisadores-nest\/(\d+)$/
      )
    )
  ) {
    acao = 'PESQUISA_ATUALIZADA';

    descricao =
      `Atualizou a pesquisa #${match[1]}` +
      `${corpo.titulo_trabalho
        ? ` — "${texto(
            corpo.titulo_trabalho
          )}"`
        : corpo.nome
          ? ` — "${texto(corpo.nome)}"`
          : ''
      }.`;
  }

  else if (
    metodo === 'DELETE' &&
    (
      match = rota.match(
        /^\/api\/admin\/pesquisadores-nest\/(\d+)$/
      )
    )
  ) {
    acao = 'PESQUISA_REMOVIDA';

    descricao =
      `Removeu ou desativou a pesquisa #${match[1]}.`;
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/admin/pesquisadores-nest/importar'
  ) {
    acao = 'PESQUISAS_IMPORTADAS';

    descricao =
      `Importou uma planilha de pesquisas` +
      `${req.file?.originalname
        ? ` (${texto(
            req.file.originalname,
            180
          )})`
        : ''
      }.`;
  }

  // ─────────────────────────────────────────────────────────────
  // USUÁRIOS
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/usuarios'
  ) {
    acao = 'USUARIOS_CONSULTADOS';

    descricao =
      `Consultou a lista de usuários.${detalheFiltros(
        req,
        [
          'tipo',
          'busca',
          'regiao_id',
          'status',
          'p'
        ]
      )}`;
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/usuarios'
  ) {
    acao = 'USUARIO_CADASTRADO';

    descricao =
      `Cadastrou o usuário "${texto(
        corpo.nome_completo || 'Sem nome'
      )}"` +
      `${corpo.email
        ? ` (${texto(corpo.email, 160)})`
        : ''
      }, perfil ${texto(
        corpo.tipo_usuario || 'participante',
        40
      )}` +
      `${respostaId
        ? `, ID #${respostaId}`
        : ''
      }.`;
  }

  else if (
    metodo === 'PUT' &&
    rota === '/api/usuarios/me'
  ) {
    acao = 'PERFIL_ATUALIZADO';

    descricao =
      'Atualizou os dados do próprio perfil.';
  }

  else if (
    metodo === 'PUT' &&
    (
      match = rota.match(
        /^\/api\/usuarios\/(\d+)\/toggle-status$/
      )
    )
  ) {
    acao = 'USUARIO_STATUS_ALTERADO';

    descricao =
      `Ativou ou desativou o usuário #${match[1]}.`;
  }

  else if (
    metodo === 'PUT' &&
    (
      match = rota.match(
        /^\/api\/usuarios\/(\d+)\/resetar-senha$/
      )
    )
  ) {
    acao = 'USUARIO_SENHA_RESETADA';

    descricao =
      `Redefiniu a senha do usuário #${match[1]} e marcou o primeiro acesso como pendente.`;
  }

  else if (
    metodo === 'DELETE' &&
    (
      match = rota.match(
        /^\/api\/usuarios\/(\d+)$/
      )
    )
  ) {
    acao = 'USUARIO_DESATIVADO';

    descricao =
      `Desativou o usuário #${match[1]}, preservando o histórico de auditoria.`;
  }

  // ─────────────────────────────────────────────────────────────
  // INVENTÁRIO
  // ─────────────────────────────────────────────────────────────

  else if (
    metodo === 'GET' &&
    rota === '/api/inventario-consumo'
  ) {
    acao = 'INVENTARIO_ACESSADO';

    descricao =
      `Acessou o inventário de consumo.${detalheFiltros(
        req,
        ['busca', 'status']
      )}`;
  }

  else if (
    metodo === 'GET' &&
    rota === '/api/inventario-consumo/resumo'
  ) {
    acao = 'INVENTARIO_RESUMO_ACESSADO';

    descricao =
      'Consultou os indicadores do inventário de consumo.';
  }

  else if (
    metodo === 'POST' &&
    rota === '/api/inventario-consumo'
  ) {
    acao = 'INVENTARIO_ITEM_CADASTRADO';

    descricao =
      `Cadastrou o item "${texto(
        corpo.descricao || 'Sem descrição'
      )}" no inventário` +
      `${respostaId
        ? ` (#${respostaId})`
        : ''
      }.`;
  }

  else if (
    ['PUT', 'PATCH'].includes(metodo) &&
    (
      match = rota.match(
        /^\/api\/inventario-consumo\/(\d+)$/
      )
    )
  ) {
    acao = 'INVENTARIO_ITEM_ATUALIZADO';

    descricao =
      `Atualizou o item #${match[1]} do inventário.`;
  }

  else if (
    metodo === 'DELETE' &&
    (
      match = rota.match(
        /^\/api\/inventario-consumo\/(\d+)$/
      )
    )
  ) {
    acao = 'INVENTARIO_ITEM_EXCLUIDO';

    descricao =
      `Excluiu o item #${match[1]} do inventário de consumo.`;
  }

  else if (
  metodo === 'GET' &&
  rota === '/api/inventario-duraveis'
) {
  acao = 'INVENTARIO_DURAVEIS_ACESSADO';

  descricao =
    `Acessou o inventário de bens duráveis.${detalheFiltros(
      req,
      [
        'busca',
        'situacao',
        'estado_conservacao'
      ]
    )}`;
}

else if (
  metodo === 'GET' &&
  rota === '/api/inventario-duraveis/resumo'
) {
  acao =
    'INVENTARIO_DURAVEIS_RESUMO_ACESSADO';

  descricao =
    'Consultou os indicadores do inventário de bens duráveis.';
}

else if (
  metodo === 'POST' &&
  rota === '/api/inventario-duraveis'
) {
  acao = 'INVENTARIO_DURAVEL_CADASTRADO';

  descricao =
    `Cadastrou o bem durável "${texto(
      corpo.descricao || 'Sem descrição'
    )}"` +
    `${respostaId
      ? ` (#${respostaId})`
      : ''
    }.`;
}

else if (
  ['PUT', 'PATCH'].includes(metodo) &&
  (
    match = rota.match(
      /^\/api\/inventario-duraveis\/(\d+)$/
    )
  )
) {
  acao = 'INVENTARIO_DURAVEL_ATUALIZADO';

  descricao =
    `Atualizou o bem durável #${match[1]}.`;
}

else if (
  metodo === 'DELETE' &&
  (
    match = rota.match(
      /^\/api\/inventario-duraveis\/(\d+)$/
    )
  )
) {
  acao = 'INVENTARIO_DURAVEL_EXCLUIDO';

  descricao =
    `Excluiu o bem durável #${match[1]} do inventário.`;
}

  // ─────────────────────────────────────────────────────────────
  // OUTRAS ROTAS AUTENTICADAS
  // ─────────────────────────────────────────────────────────────

  else {
    /*
     * Essa regra evita que uma nova função importante fique
     * totalmente fora do histórico.
     */
    acao =
      `API_${metodo}`.slice(0, 100);

    descricao =
      `Realizou uma requisição ${metodo} em ${rota}.`;
  }

  return {
    acao,
    descricao
  };
}

/**
 * Middleware principal.
 */
function auditoria(req, res, next) {
  /*
   * Ignora preflight do CORS e endereços que não são da API.
   */
  if (
    req.method === 'OPTIONS' ||
    !String(
      req.originalUrl || ''
    ).startsWith('/api/')
  ) {
    return next();
  }

  /*
   * Guarda a resposta JSON para conseguir recuperar:
   *
   * - ID de um registro criado;
   * - mensagens de erro;
   * - informações adicionais.
   */
  const jsonOriginal =
    res.json.bind(res);

  res.json = body => {
    res.locals.auditResponseBody = body;

    return jsonOriginal(body);
  };

  /*
   * O registro é feito depois que a rota termina.
   *
   * Dessa forma, o middleware sabe:
   *
   * - se a operação funcionou;
   * - qual código HTTP foi devolvido;
   * - se houve erro;
   * - qual usuário foi identificado.
   */
  res.on('finish', () => {
    setImmediate(async () => {
      try {
        if (
          req.auditSkip ||
          caminho(req) === '/api/health'
        ) {
          return;
        }

        const usuarioId =
          req.user?.id ||
          req.auditUserId ||
          obterUsuarioDoToken(req);

        /*
         * Rotas públicas sem usuário não entram no histórico
         * principal, a menos que a própria rota use:
         *
         * req.auditForce = true;
         */
        if (
          !usuarioId &&
          !req.auditForce
        ) {
          return;
        }

        const evento =
          identificarAcao(req, res);

        if (
          !evento?.acao ||
          !evento?.descricao
        ) {
          return;
        }

        const sucesso =
          res.statusCode < 400;

        const descricaoFinal = texto(
          `${evento.descricao}` +
          `${sucesso
            ? ''
            : ` Operação não concluída (HTTP ${res.statusCode}).${erroDaResposta(res)}`
          }`,
          MAX_DESCRICAO
        );

        await db.query(
          `INSERT INTO logs_atividades
             (
               usuario_id,
               acao,
               descricao,
               ip
             )
           VALUES (?, ?, ?, ?)`,
          [
            usuarioId || null,
            evento.acao,
            descricaoFinal,
            obterIp(req)
          ]
        );
      } catch (erro) {
        /*
         * Uma falha no log não pode impedir a função
         * principal do sistema.
         */
        console.warn(
          '[AUDITORIA] Não foi possível gravar o log:',
          erro.message
        );
      }
    });
  });

  return next();
}

module.exports = auditoria;