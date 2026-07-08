require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 SERVIR ARQUIVOS ESTÁTICOS (IMAGENS, CERTIFICADO, ETC)
app.use(express.static('public'));

// Rotas
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/formacoes',   require('./routes/formacoes'));
app.use('/api/inscricoes',  require('./routes/inscricoes'));
app.use('/api/frequencias', require('./routes/frequencias'));
app.use('/api/certificados',require('./routes/certificados'));
app.use('/api/usuarios',    require('./routes/usuarios'));
app.use('/api/relatorios',  require('./routes/relatorios'));
app.use('/api/propostas-formacao', require('./routes/propostasFormacao'));
app.use('/api/notificacoes', require('./routes/notificacoes'));
app.use('/api/regioes', require('./routes/regioes'));
app.use('/api/inventario-consumo', require('./routes/inventarioConsumo'));


const biblioteca = require('./routes/biblioteca');
app.use('/api/biblioteca', biblioteca.publicRouter);
app.use('/api/admin/biblioteca', biblioteca.adminRouter);

const pesquisadoresNest = require('./routes/pesquisadoresNest');
app.use('/api/pesquisadores-nest', pesquisadoresNest.publicRouter);
app.use('/api/admin/pesquisadores-nest', pesquisadoresNest.adminRouter);

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// Erro global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ API rodando em http://localhost:${PORT}`));