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
  return String(
    Math.floor(100000 + Math.random() * 900000)
  );
}

async function validarRegiao(regiaoId) {
  if (!regiaoId) {
    return false;
  }

  const [rows] = await db.query(
    `SELECT id
     FROM regioes
     WHERE id = ?
       AND ativo = 1
     LIMIT 1`,
    [regiaoId]
  );

  return rows.length > 0;
}

/**
 * POST /api/auth/login
 *
 * Realiza o login e registra tanto tentativas sem sucesso
 * quanto logins concluídos.
 */
router.post('/login', async (req, res) => {
  try {
    const {
      email,
      senha
    } = req.body;

    if (!email || !senha) {
      req.auditForce = true;

      req.auditAction =
        'LOGIN_FALHA';

      req.auditDescription =
        'Tentativa de login sem informar e-mail e senha corretamente.';

      return res.status(400).json({
        ok: false,
        erro: 'E-mail e senha obrigatórios.'
      });
    }

    const emailLogin =
      normalizarEmail(email);

    /**
     * A ação começa como falha.
     *
     * Caso o login seja concluído, os valores serão
     * substituídos por LOGIN.
     */
    req.auditForce = true;

    req.auditAction =
      'LOGIN_FALHA';

    req.auditDescription =
      `Tentativa de login sem sucesso para o e-mail ${emailLogin}.`;

    const [rows] = await db.query(
      `SELECT
         u.*,
         r.nome AS regiao_nome

       FROM usuarios u

       LEFT JOIN regioes r
         ON r.id = u.regiao_id

       WHERE LOWER(u.email) = ?
         AND u.status = 1

       LIMIT 1`,
      [emailLogin]
    );

    const user = rows[0];

    if (
      !user ||
      !(await bcrypt.compare(
        senha,
        user.senha_hash
      ))
    ) {
      return res.status(401).json({
        ok: false,
        erro: 'E-mail ou senha incorretos.'
      });
    }

    const primeiroAcesso =
      Boolean(user.primeiro_acesso);

    const token = jwt.sign(
      {
        id:
          user.id,

        nome:
          user.nome_completo,

        tipo:
          user.tipo_usuario,

        email:
          user.email,

        primeiro_acesso:
          primeiroAcesso,

        regiao_id:
          user.regiao_id || null,

        regiao_nome:
          user.regiao_nome || null
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          process.env.JWT_EXPIRES_IN || '2h'
      }
    );

    /**
     * Associa o log ao usuário que acabou de entrar.
     */
    req.auditUserId =
      user.id;

    req.auditAction =
      'LOGIN';

    req.auditDescription =
      `Login realizado por ${user.nome_completo} (${user.tipo_usuario}).`;

    return res.json({
      ok: true,

      token,

      id:
        user.id,

      tipo:
        user.tipo_usuario,

      nome:
        user.nome_completo,

      email:
        user.email,

      primeiro_acesso:
        primeiroAcesso,

      regiao_id:
        user.regiao_id || null,

      regiao_nome:
        user.regiao_nome || null
    });
  } catch (error) {
    req.auditForce = true;

    req.auditAction =
      'LOGIN_FALHA';

    req.auditDescription =
      `Tentativa de login não concluída por erro interno${
        req.body?.email
          ? ` para o e-mail ${normalizarEmail(
              req.body.email
            )}`
          : ''
      }.`;

    console.error(
      'Erro no login:',
      error
    );

    return res.status(500).json({
      ok: false,
      erro: 'Erro interno ao realizar login.'
    });
  }
});

/**
 * POST /api/auth/gerar-codigo-primeiro-acesso
 *
 * Gera um código de seis dígitos, salva apenas o hash
 * e envia o código para o e-mail do usuário.
 */
router.post(
  '/gerar-codigo-primeiro-acesso',
  auth(),
  async (req, res) => {
    try {
      const usuarioId =
        req.user.id;

      const [rows] = await db.query(
        `SELECT
           id,
           nome_completo,
           email,
           primeiro_acesso

         FROM usuarios

         WHERE id = ?
           AND status = 1

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

      const codigo =
        gerarCodigoConfirmacao();

      const codigoHash =
        await bcrypt.hash(
          codigo,
          12
        );

      await db.query(
        `UPDATE usuarios

         SET
           codigo_primeiro_acesso_hash = ?,
           codigo_primeiro_acesso_expira_em =
             DATE_ADD(NOW(), INTERVAL 10 MINUTE)

         WHERE id = ?`,
        [
          codigoHash,
          usuarioId
        ]
      );

      await enviarCodigoPrimeiroAcesso({
        para:
          user.email,

        nome:
          user.nome_completo,

        codigo
      });

      return res.json({
        ok: true,
        mensagem:
          'Código enviado para o e-mail cadastrado.'
      });
    } catch (error) {
      console.error(
        'Erro ao gerar/enviar código de primeiro acesso:',
        error
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro interno ao enviar código de confirmação.'
      });
    }
  }
);

/**
 * POST /api/auth/primeiro-acesso
 *
 * Confirma o código enviado por e-mail e permite que
 * o usuário defina a senha definitiva.
 */
router.post(
  '/primeiro-acesso',
  auth(),
  async (req, res) => {
    try {
      const {
        nome_completo,
        nome_usuario,
        codigo_confirmacao,
        nova_senha,
        confirmar_senha
      } = req.body;

      const usuarioId =
        req.user.id;

      const nomeFinal =
        String(
          nome_completo ||
          nome_usuario ||
          ''
        ).trim();

      const codigoInformado =
        String(
          codigo_confirmacao || ''
        ).trim();

      if (
        !nomeFinal ||
        nomeFinal.length < 3
      ) {
        return res.status(400).json({
          ok: false,
          erro: 'Informe o nome do usuário.'
        });
      }

      if (!codigoInformado) {
        return res.status(400).json({
          ok: false,
          erro:
            'Informe o código de confirmação.'
        });
      }

      if (
        !/^\d{6}$/.test(
          codigoInformado
        )
      ) {
        return res.status(400).json({
          ok: false,
          erro:
            'O código de confirmação deve ter 6 dígitos.'
        });
      }

      if (
        !nova_senha ||
        !confirmar_senha
      ) {
        return res.status(400).json({
          ok: false,
          erro:
            'Informe e confirme a nova senha.'
        });
      }

      if (
        nova_senha !==
        confirmar_senha
      ) {
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
          erro:
            'A senha deve ter ao menos 8 caracteres, uma letra maiúscula, uma letra minúscula e um número.'
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

         LEFT JOIN regioes r
           ON r.id = u.regiao_id

         WHERE u.id = ?
           AND u.status = 1

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
          erro:
            'Primeiro acesso já foi concluído.'
        });
      }

      if (
        !user.codigo_primeiro_acesso_hash ||
        !user.codigo_primeiro_acesso_expira_em
      ) {
        return res.status(400).json({
          ok: false,
          erro:
            'Gere um código de confirmação antes de continuar.'
        });
      }

      const dataExpiracao =
        new Date(
          user.codigo_primeiro_acesso_expira_em
        );

      if (
        Number.isNaN(
          dataExpiracao.getTime()
        ) ||
        dataExpiracao.getTime() <
          Date.now()
      ) {
        return res.status(400).json({
          ok: false,
          erro:
            'O código de confirmação expirou. Gere um novo código.'
        });
      }

      const codigoValido =
        await bcrypt.compare(
          codigoInformado,
          user.codigo_primeiro_acesso_hash
        );

      if (!codigoValido) {
        return res.status(400).json({
          ok: false,
          erro:
            'Código de confirmação inválido.'
        });
      }

      const hash =
        await bcrypt.hash(
          nova_senha,
          12
        );

      await db.query(
        `UPDATE usuarios

         SET
           nome_completo = ?,
           senha_hash = ?,
           primeiro_acesso = 0,
           codigo_primeiro_acesso_hash = NULL,
           codigo_primeiro_acesso_expira_em = NULL

         WHERE id = ?`,
        [
          nomeFinal,
          hash,
          usuarioId
        ]
      );

      return res.json({
        ok: true,

        mensagem:
          'Primeiro acesso concluído com sucesso.',

        user: {
          id:
            user.id,

          nome:
            nomeFinal,

          email:
            user.email,

          tipo:
            user.tipo_usuario,

          primeiro_acesso:
            false,

          regiao_id:
            user.regiao_id || null,

          regiao_nome:
            user.regiao_nome || null
        }
      });
    } catch (error) {
      console.error(
        'Erro no primeiro acesso:',
        error
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro interno ao concluir primeiro acesso.'
      });
    }
  }
);

/**
 * POST /api/auth/cadastro
 *
 * Cadastro público de participante.
 */
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

    if (
      !nome_completo ||
      !email ||
      !cpf ||
      !senha
    ) {
      return res.status(400).json({
        ok: false,
        erro: 'Campos obrigatórios faltando.'
      });
    }

    if (!regiao_id) {
      return res.status(400).json({
        ok: false,
        erro:
          'Selecione a região do participante.'
      });
    }

    const regiaoExiste =
      await validarRegiao(
        regiao_id
      );

    if (!regiaoExiste) {
      return res.status(400).json({
        ok: false,
        erro:
          'Região inválida ou inativa.'
      });
    }

    if (
      String(senha).length < 8
    ) {
      return res.status(400).json({
        ok: false,
        erro:
          'Senha deve ter ao menos 8 caracteres.'
      });
    }

    const emailNormalizado =
      normalizarEmail(email);

    const [duplicados] =
      await db.query(
        `SELECT id
         FROM usuarios
         WHERE LOWER(email) = ?
            OR cpf = ?`,
        [
          emailNormalizado,
          cpf
        ]
      );

    if (duplicados.length) {
      return res.status(409).json({
        ok: false,
        erro:
          'E-mail ou CPF já cadastrado.'
      });
    }

    const hash =
      await bcrypt.hash(
        senha,
        12
      );

    const [result] =
      await db.query(
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
         VALUES
         (
           ?,
           ?,
           ?,
           ?,
           ?,
           ?,
           'participante',
           ?,
           1
         )`,
        [
          String(
            nome_completo
          ).trim(),

          emailNormalizado,

          cpf,

          telefone || null,

          data_nascimento || null,

          regiao_id,

          hash
        ]
      );

    /**
     * Como o participante ainda não estava autenticado,
     * informamos manualmente o ID recém-criado.
     */
    req.auditUserId =
      result.insertId;

    req.auditAction =
      'USUARIO_AUTOCADASTRO';

    req.auditDescription =
      `Novo participante cadastrado: ${String(
        nome_completo
      ).trim()} (${emailNormalizado}).`;

    const token = jwt.sign(
      {
        id:
          result.insertId,

        nome:
          String(
            nome_completo
          ).trim(),

        tipo:
          'participante',

        email:
          emailNormalizado,

        primeiro_acesso:
          true,

        regiao_id
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          process.env.JWT_EXPIRES_IN || '2h'
      }
    );

    return res.status(201).json({
      ok: true,

      id:
        result.insertId,

      token,

      tipo:
        'participante',

      nome:
        String(
          nome_completo
        ).trim(),

      email:
        emailNormalizado,

      primeiro_acesso:
        true,

      mensagem:
        'Cadastro realizado com sucesso.'
    });
  } catch (error) {
    console.error(
      'Erro no cadastro:',
      error
    );

    return res.status(500).json({
      ok: false,
      erro:
        'Erro interno ao realizar cadastro.'
    });
  }
});

/**
 * POST /api/auth/logout
 *
 * Registra o encerramento da sessão antes de o frontend
 * remover o token do navegador.
 */
router.post(
  '/logout',

  auth(
    'admin',
    'coordenador',
    'equipe',
    'participante'
  ),

  (req, res) => {
    req.auditAction =
      'LOGOUT';

    req.auditDescription =
      'Encerrou a sessão pelo botão Sair.';

    return res.json({
      ok: true,
      mensagem:
        'Sessão encerrada com sucesso.'
    });
  }
);

/**
 * POST /api/auth/navegacao
 *
 * Recebe do frontend a página acessada pelo usuário.
 */
router.post(
  '/navegacao',

  auth(
    'admin',
    'coordenador',
    'equipe',
    'participante'
  ),

  (req, res) => {
    const rota =
      String(
        req.body?.rota || '/'
      ).slice(0, 220);

    const titulo =
      String(
        req.body?.titulo ||
        'Página do sistema'
      ).slice(0, 160);

    req.auditAction =
      'PAGINA_ACESSADA';

    req.auditDescription =
      `Acessou a página "${titulo}" (${rota}).`;

    return res
      .status(204)
      .end();
  }
);

/**
 * GET /api/auth/me
 *
 * Retorna os dados carregados pelo middleware de autenticação.
 */
router.get(
  '/me',
  auth(),
  (req, res) => {
    return res.json({
      ok: true,
      user: req.user
    });
  }
);

/**
 * POST /api/auth/verificar-cpf
 */
router.post(
  '/verificar-cpf',
  async (req, res) => {
    try {
      const {
        cpf
      } = req.body;

      if (!cpf) {
        return res.status(400).json({
          ok: false,
          erro: 'CPF obrigatório.'
        });
      }

      const [rows] =
        await db.query(
          `SELECT id
           FROM usuarios
           WHERE cpf = ?`,
          [cpf]
        );

      return res.json({
        ok: true,
        disponivel:
          rows.length === 0
      });
    } catch (error) {
      console.error(
        'Erro ao verificar CPF:',
        error
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro interno ao verificar CPF.'
      });
    }
  }
);

/**
 * POST /api/auth/verificar-email
 */
router.post(
  '/verificar-email',
  async (req, res) => {
    try {
      const {
        email
      } = req.body;

      if (!email) {
        return res.status(400).json({
          ok: false,
          erro: 'E-mail obrigatório.'
        });
      }

      const emailNormalizado =
        normalizarEmail(email);

      const [rows] =
        await db.query(
          `SELECT id
           FROM usuarios
           WHERE LOWER(email) = ?`,
          [emailNormalizado]
        );

      return res.json({
        ok: true,
        disponivel:
          rows.length === 0
      });
    } catch (error) {
      console.error(
        'Erro ao verificar e-mail:',
        error
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro interno ao verificar e-mail.'
      });
    }
  }
);

module.exports = router;