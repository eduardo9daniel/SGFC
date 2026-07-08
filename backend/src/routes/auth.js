const { enviarCodigoPrimeiroAcesso } = require('../utils/email');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function gerarCodigoConfirmacao() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function validarRegiao(regiaoId) {
  if (!regiaoId) return false;

  const [rows] = await db.query(
    `SELECT id 
     FROM regioes 
     WHERE id = ? AND ativo = 1 
     LIMIT 1`,
    [regiaoId]
  );

  return rows.length > 0;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        ok: false,
        erro: 'E-mail e senha obrigatórios.'
      });
    }

    const emailLogin = normalizarEmail(email);

    const [rows] = await db.query(
      `SELECT 
         u.*,
         r.nome AS regiao_nome
       FROM usuarios u
       LEFT JOIN regioes r ON r.id = u.regiao_id
       WHERE LOWER(u.email) = ? 
       AND u.status = 1 
       LIMIT 1`,
      [emailLogin]
    );

    const user = rows[0];

    if (!user || !(await bcrypt.compare(senha, user.senha_hash))) {
      return res.status(401).json({
        ok: false,
        erro: 'E-mail ou senha incorretos.'
      });
    }

    const primeiroAcesso = !!user.primeiro_acesso;

    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome_completo,
        tipo: user.tipo_usuario,
        email: user.email,
        primeiro_acesso: primeiroAcesso,
        regiao_id: user.regiao_id || null,
        regiao_nome: user.regiao_nome || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
    );

    await db.query(
      'INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?,?,?,?)',
      [user.id, 'login', 'Login realizado', req.ip]
    );

    return res.json({
      ok: true,
      token,
      id: user.id,
      tipo: user.tipo_usuario,
      nome: user.nome_completo,
      email: user.email,
      primeiro_acesso: primeiroAcesso,
      regiao_id: user.regiao_id || null,
      regiao_nome: user.regiao_nome || null
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({
      ok: false,
      erro: 'Erro interno ao realizar login.'
    });
  }
});

// POST /api/auth/gerar-codigo-primeiro-acesso
router.post('/gerar-codigo-primeiro-acesso', auth(), async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const [rows] = await db.query(
      `SELECT 
         id, 
         nome_completo, 
         email, 
         primeiro_acesso 
       FROM usuarios 
       WHERE id = ? AND status = 1 
       LIMIT 1`,
      [usuarioId]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        ok: false,
        erro: 'Usuário não encontrado.'
      });
    }

    if (!user.primeiro_acesso) {
      return res.status(400).json({
        ok: false,
        erro: 'Primeiro acesso já foi concluído.'
      });
    }

    const codigo = gerarCodigoConfirmacao();
    const codigoHash = await bcrypt.hash(codigo, 12);

    await db.query(
      `UPDATE usuarios
       SET codigo_primeiro_acesso_hash = ?,
           codigo_primeiro_acesso_expira_em = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
       WHERE id = ?`,
      [codigoHash, usuarioId]
    );

    await enviarCodigoPrimeiroAcesso({
      para: user.email,
      nome: user.nome_completo,
      codigo
    });

    await db.query(
      'INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?,?,?,?)',
      [
        usuarioId,
        'geracao_codigo_primeiro_acesso',
        'Código de primeiro acesso enviado por e-mail',
        req.ip
      ]
    );

    return res.json({
      ok: true,
      mensagem: 'Código enviado para o e-mail cadastrado.'
    });

  } catch (error) {
    console.error('Erro ao gerar/enviar código de primeiro acesso:', error);

    return res.status(500).json({
      ok: false,
      erro: 'Erro interno ao enviar código de confirmação.'
    });
  }
});

// POST /api/auth/primeiro-acesso
router.post('/primeiro-acesso', auth(), async (req, res) => {
  try {
    const {
      nome_completo,
      nome_usuario,
      codigo_confirmacao,
      nova_senha,
      confirmar_senha
    } = req.body;

    const usuarioId = req.user.id;

    const nomeFinal = String(nome_completo || nome_usuario || '').trim();
    const codigoInformado = String(codigo_confirmacao || '').trim();

    if (!nomeFinal || nomeFinal.length < 3) {
      return res.status(400).json({
        ok: false,
        erro: 'Informe o nome do usuário.'
      });
    }

    if (!codigoInformado) {
      return res.status(400).json({
        ok: false,
        erro: 'Informe o código de confirmação.'
      });
    }

    if (!/^\d{6}$/.test(codigoInformado)) {
      return res.status(400).json({
        ok: false,
        erro: 'O código de confirmação deve ter 6 dígitos.'
      });
    }

    if (!nova_senha || !confirmar_senha) {
      return res.status(400).json({
        ok: false,
        erro: 'Informe e confirme a nova senha.'
      });
    }

    if (nova_senha !== confirmar_senha) {
      return res.status(400).json({
        ok: false,
        erro: 'As senhas não coincidem.'
      });
    }

    const senhaForte =
      nova_senha.length >= 8 &&
      /[A-ZÀ-Ý]/.test(nova_senha) &&
      /[a-zà-ÿ]/.test(nova_senha) &&
      /\d/.test(nova_senha);

    if (!senhaForte) {
      return res.status(400).json({
        ok: false,
        erro: 'A senha deve ter ao menos 8 caracteres, uma letra maiúscula, uma letra minúscula e um número.'
      });
    }

    const [rows] = await db.query(
      `SELECT 
         u.id, 
         u.nome_completo, 
         u.email, 
         u.tipo_usuario, 
         u.primeiro_acesso,
         u.regiao_id,
         r.nome AS regiao_nome,
         u.codigo_primeiro_acesso_hash,
         u.codigo_primeiro_acesso_expira_em
       FROM usuarios u
       LEFT JOIN regioes r ON r.id = u.regiao_id
       WHERE u.id = ? AND u.status = 1 
       LIMIT 1`,
      [usuarioId]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        ok: false,
        erro: 'Usuário não encontrado.'
      });
    }

    if (!user.primeiro_acesso) {
      return res.status(400).json({
        ok: false,
        erro: 'Primeiro acesso já foi concluído.'
      });
    }

    if (!user.codigo_primeiro_acesso_hash || !user.codigo_primeiro_acesso_expira_em) {
      return res.status(400).json({
        ok: false,
        erro: 'Gere um código de confirmação antes de continuar.'
      });
    }

    const dataExpiracao = new Date(user.codigo_primeiro_acesso_expira_em);

    if (
      Number.isNaN(dataExpiracao.getTime()) ||
      dataExpiracao.getTime() < Date.now()
    ) {
      return res.status(400).json({
        ok: false,
        erro: 'O código de confirmação expirou. Gere um novo código.'
      });
    }

    const codigoValido = await bcrypt.compare(
      codigoInformado,
      user.codigo_primeiro_acesso_hash
    );

    if (!codigoValido) {
      return res.status(400).json({
        ok: false,
        erro: 'Código de confirmação inválido.'
      });
    }

    const hash = await bcrypt.hash(nova_senha, 12);

    await db.query(
      `UPDATE usuarios
       SET nome_completo = ?, 
           senha_hash = ?, 
           primeiro_acesso = 0,
           codigo_primeiro_acesso_hash = NULL,
           codigo_primeiro_acesso_expira_em = NULL
       WHERE id = ?`,
      [nomeFinal, hash, usuarioId]
    );

    await db.query(
      'INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?,?,?,?)',
      [
        usuarioId,
        'primeiro_acesso',
        'Dados confirmados e senha definida no primeiro acesso',
        req.ip
      ]
    );

    return res.json({
      ok: true,
      mensagem: 'Primeiro acesso concluído com sucesso.',
      user: {
        id: user.id,
        nome: nomeFinal,
        email: user.email,
        tipo: user.tipo_usuario,
        primeiro_acesso: false,
        regiao_id: user.regiao_id || null,
        regiao_nome: user.regiao_nome || null
      }
    });

  } catch (error) {
    console.error('Erro no primeiro acesso:', error);

    return res.status(500).json({
      ok: false,
      erro: 'Erro interno ao concluir primeiro acesso.'
    });
  }
});

// POST /api/auth/cadastro
router.post('/cadastro', async (req, res) => {
  try {
    const {
      nome_completo,
      email,
      cpf,
      telefone,
      data_nascimento,
      regiao_id,
      senha
    } = req.body;

    if (!nome_completo || !email || !cpf || !senha) {
      return res.status(400).json({
        ok: false,
        erro: 'Campos obrigatórios faltando.'
      });
    }

    if (!regiao_id) {
      return res.status(400).json({
        ok: false,
        erro: 'Selecione a região do participante.'
      });
    }

    const regiaoExiste = await validarRegiao(regiao_id);

    if (!regiaoExiste) {
      return res.status(400).json({
        ok: false,
        erro: 'Região inválida ou inativa.'
      });
    }

    if (senha.length < 8) {
      return res.status(400).json({
        ok: false,
        erro: 'Senha deve ter ao menos 8 caracteres.'
      });
    }

    const emailNormalizado = normalizarEmail(email);

    const [dup] = await db.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = ? OR cpf = ?',
      [emailNormalizado, cpf]
    );

    if (dup.length) {
      return res.status(409).json({
        ok: false,
        erro: 'E-mail ou CPF já cadastrado.'
      });
    }

    const hash = await bcrypt.hash(senha, 12);

    const [result] = await db.query(
      `INSERT INTO usuarios 
       (
        nome_completo, 
        email, 
        cpf, 
        telefone, 
        data_nascimento,
        regiao_id,
        tipo_usuario, 
        senha_hash, 
        primeiro_acesso
       )
       VALUES (?, ?, ?, ?, ?, ?, 'participante', ?, 1)`,
      [
        nome_completo,
        emailNormalizado,
        cpf,
        telefone || null,
        data_nascimento || null,
        regiao_id,
        hash
      ]
    );

    await db.query(
      'INSERT INTO logs_atividades (usuario_id, acao, descricao, ip) VALUES (?,?,?,?)',
      [result.insertId, 'cadastro', 'Novo participante cadastrado', req.ip]
    );

    const token = jwt.sign(
  {
    id: result.insertId,
    nome: nome_completo,
    tipo: 'participante',
    email: emailNormalizado,
    primeiro_acesso: true,
    regiao_id
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
);

return res.status(201).json({
  ok: true,
  id: result.insertId,
  token,
  tipo: 'participante',
  nome: nome_completo,
  email: emailNormalizado,
  primeiro_acesso: true,
  mensagem: 'Cadastro realizado com sucesso.'
});

  } catch (error) {
    console.error('Erro no cadastro:', error);
    return res.status(500).json({
      ok: false,
      erro: 'Erro interno ao realizar cadastro.'
    });
  }
});

// GET /api/auth/me
router.get('/me', auth(), (req, res) => {
  return res.json({
    ok: true,
    user: req.user
  });
});

// POST /api/auth/verificar-cpf
router.post('/verificar-cpf', async (req, res) => {
  try {
    const { cpf } = req.body;

    if (!cpf) {
      return res.status(400).json({
        ok: false,
        erro: 'CPF obrigatório.'
      });
    }

    const [rows] = await db.query(
      'SELECT id FROM usuarios WHERE cpf = ?',
      [cpf]
    );

    return res.json({
      ok: true,
      disponivel: rows.length === 0
    });

  } catch (error) {
    console.error('Erro ao verificar CPF:', error);
    return res.status(500).json({
      ok: false,
      erro: 'Erro interno ao verificar CPF.'
    });
  }
});

// POST /api/auth/verificar-email
router.post('/verificar-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        ok: false,
        erro: 'E-mail obrigatório.'
      });
    }

    const emailNormalizado = normalizarEmail(email);

    const [rows] = await db.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = ?',
      [emailNormalizado]
    );

    return res.json({
      ok: true,
      disponivel: rows.length === 0
    });

  } catch (error) {
    console.error('Erro ao verificar e-mail:', error);
    return res.status(500).json({
      ok: false,
      erro: 'Erro interno ao verificar e-mail.'
    });
  }
});

module.exports = router;