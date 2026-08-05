require('dotenv').config();

const express = require('express');
const cors = require('cors');
const auditoria = require('./middleware/auditoria');
const {
  iniciarAtualizacaoAutomaticaFormacoes
} = require('./utils/atualizarStatusFormacoes');

const app = express();

/**
 * Permite identificar o IP real do usuário quando a aplicação
 * estiver atrás de Nginx, proxy reverso ou hospedagem.
 */
app.set('trust proxy', 1);

/**
 * Configuração do CORS.
 *
 * Em desenvolvimento, o frontend utiliza:
 * http://localhost:5173
 */
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
);

/**
 * Leitura dos dados enviados pelo frontend.
 *
 * O middleware de auditoria precisa ficar depois desses dois
 * middlewares para conseguir consultar req.body.
 */
app.use(
  express.json({
    limit: '10mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

/**
 * Auditoria centralizada.
 *
 * IMPORTANTE:
 * precisa ficar depois do express.json() e antes das rotas.
 */
app.use(auditoria);

/**
 * Arquivos públicos do sistema.
 *
 * Exemplos:
 * - imagens;
 * - documentos;
 * - arquivos da biblioteca;
 * - certificados;
 * - uploads.
 */
app.use(express.static('public'));

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS PRINCIPAIS
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  '/api/auth',
  require('./routes/auth')
);

app.use(
  '/api/formacoes',
  require('./routes/formacoes')
);

app.use(
  '/api/inscricoes',
  require('./routes/inscricoes')
);

app.use(
  '/api/frequencias',
  require('./routes/frequencias')
);

app.use(
  '/api/certificados',
  require('./routes/certificados')
);

app.use(
  '/api/usuarios',
  require('./routes/usuarios')
);

app.use(
  '/api/relatorios',
  require('./routes/relatorios')
);

app.use(
  '/api/propostas-formacao',
  require('./routes/propostasFormacao')
);

app.use(
  '/api/notificacoes',
  require('./routes/notificacoes')
);

app.use(
  '/api/regioes',
  require('./routes/regioes')
);

app.use(
  '/api/inventario-consumo',
  require('./routes/inventarioConsumo')
);

app.use(
  '/api/inventario-duraveis',
  require('./routes/inventarioDuraveis')
);



// ─────────────────────────────────────────────────────────────────────────────
// BIBLIOTECA
// ─────────────────────────────────────────────────────────────────────────────

const biblioteca = require('./routes/biblioteca');
const livrosBiblioteca = require('./routes/livros');

// As rotas de livros precisam ser montadas antes de /:id.
app.use(
  '/api/biblioteca/livros',
  livrosBiblioteca.publicRouter
);

app.use(
  '/api/admin/biblioteca/livros',
  livrosBiblioteca.adminRouter
);

app.use(
  '/api/biblioteca',
  biblioteca.publicRouter
);

app.use(
  '/api/admin/biblioteca',
  biblioteca.adminRouter
);

// ─────────────────────────────────────────────────────────────────────────────
// PESQUISAS E PESQUISADORES NEST
// ─────────────────────────────────────────────────────────────────────────────

const pesquisadoresNest = require(
  './routes/pesquisadoresNest'
);

app.use(
  '/api/pesquisadores-nest',
  pesquisadoresNest.publicRouter
);

app.use(
  '/api/admin/pesquisadores-nest',
  pesquisadoresNest.adminRouter
);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICAÇÃO DA API
// ─────────────────────────────────────────────────────────────────────────────

app.get(
  '/api/health',
  (req, res) => {
    return res.json({
      ok: true,
      ts: Date.now()
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ROTA NÃO ENCONTRADA
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  '/api',
  (req, res) => {
    return res.status(404).json({
      ok: false,
      erro: 'Rota não encontrada.'
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// TRATAMENTO GLOBAL DE ERROS
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  (err, req, res, next) => {
    console.error(
      '[ERRO GLOBAL]',
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    return res.status(500).json({
      ok: false,
      erro: 'Erro interno do servidor.'
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO DO SERVIDOR
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

app.listen(
  PORT,
  () => {
    console.log(
      `✅ API rodando em http://localhost:${PORT}`
    );

    /*
     * Executa a primeira verificação assim que o backend inicia
     * e repete a atualização automática a cada minuto.
     */
    iniciarAtualizacaoAutomaticaFormacoes();
  }
);