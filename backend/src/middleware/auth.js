const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Evita vários registros de SESSAO_EXPIRADA para o mesmo usuário
 * em um intervalo muito curto.
 */
const expiracoesRegistradas = new Map();

/**
 * Remove registros antigos do controle em memória.
 *
 * Isso evita que o Map cresça indefinidamente caso o servidor
 * permaneça ligado durante muito tempo.
 */
function limparExpiracoesAntigas() {
  const agora = Date.now();
  const limite = 10 * 60 * 1000;

  for (const [usuarioId, horario] of expiracoesRegistradas.entries()) {
    if (agora - horario > limite) {
      expiracoesRegistradas.delete(usuarioId);
    }
  }
}

/**
 * Middleware de autenticação.
 *
 * Exemplos:
 *
 * auth()
 *
 * auth('admin')
 *
 * auth('admin', 'coordenador')
 */
function authMiddleware(...tiposPermitidos) {
  return async (req, res, next) => {
    const cabecalho =
      req.headers.authorization || '';

    const token =
      cabecalho.startsWith('Bearer ')
        ? cabecalho.slice(7).trim()
        : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        erro: 'Não autenticado.'
      });
    }

    try {
      if (!process.env.JWT_SECRET) {
        console.error(
          '[AUTH] A variável JWT_SECRET não foi configurada.'
        );

        return res.status(500).json({
          ok: false,
          erro: 'Configuração de autenticação indisponível.'
        });
      }

      /**
       * Valida assinatura e expiração do token.
       */
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      if (!payload?.id) {
        return res.status(401).json({
          ok: false,
          erro: 'Token inválido.'
        });
      }

      /**
       * Busca novamente o usuário no banco.
       *
       * Isso impede que usuários desativados continuem acessando
       * o sistema com um token emitido anteriormente.
       */
      const [rows] = await db.query(
        `SELECT
           u.id,
           u.nome_completo,
           u.email,
           u.cpf,
           u.telefone,
           u.data_nascimento,
           u.tipo_usuario,
           u.primeiro_acesso,
           u.status,
           u.regiao_id,
           r.nome AS regiao_nome

         FROM usuarios u

         LEFT JOIN regioes r
           ON r.id = u.regiao_id

         WHERE u.id = ?
           AND u.status = 1

         LIMIT 1`,
        [payload.id]
      );

      const usuario = rows[0];

      if (!usuario) {
        return res.status(401).json({
          ok: false,
          erro: 'Usuário inválido ou inativo.'
        });
      }

      /**
       * Dados disponíveis para todas as rotas autenticadas.
       *
       * O middleware de auditoria utiliza principalmente:
       *
       * req.user.id
       * req.user.nome_completo
       * req.user.email
       * req.user.tipo
       */
      req.user = {
        id: usuario.id,

        nome:
          usuario.nome_completo,

        nome_completo:
          usuario.nome_completo,

        email:
          usuario.email,

        cpf:
          usuario.cpf,

        telefone:
          usuario.telefone,

        data_nascimento:
          usuario.data_nascimento,

        tipo:
          usuario.tipo_usuario,

        tipo_usuario:
          usuario.tipo_usuario,

        primeiro_acesso:
          Boolean(usuario.primeiro_acesso),

        status:
          Number(usuario.status),

        regiao_id:
          usuario.regiao_id,

        regiao_nome:
          usuario.regiao_nome
      };

      /**
       * Durante o primeiro acesso, o usuário só pode utilizar
       * as rotas necessárias para concluir o cadastro e sair.
       */
      const rotasPermitidasPrimeiroAcesso = [
        '/auth/primeiro-acesso',
        '/auth/gerar-codigo-primeiro-acesso',
        '/auth/navegacao',
        '/auth/logout',
        '/auth/me'
      ];

      const rotaAtual =
        String(req.originalUrl || '');

      const rotaLiberadaPrimeiroAcesso =
        rotasPermitidasPrimeiroAcesso.some(
          rotaPermitida =>
            rotaAtual.includes(rotaPermitida)
        );

      if (
        req.user.primeiro_acesso &&
        !rotaLiberadaPrimeiroAcesso
      ) {
        return res.status(403).json({
          ok: false,
          erro: 'Primeiro acesso pendente.',
          primeiro_acesso: true
        });
      }

      /**
       * Verifica se o perfil do usuário possui permissão para
       * acessar a rota.
       *
       * Quando auth() é utilizado sem parâmetros, qualquer
       * usuário autenticado pode acessar.
       */
      if (
        tiposPermitidos.length > 0 &&
        !tiposPermitidos.includes(req.user.tipo)
      ) {
        return res.status(403).json({
          ok: false,
          erro: 'Acesso negado.'
        });
      }

      return next();
    } catch (erro) {
      /**
       * Quando o token expirou, tentamos recuperar apenas o ID
       * contido nele para associar o evento ao usuário correto.
       *
       * A assinatura ainda é validada. Apenas a expiração é
       * temporariamente ignorada para identificar o usuário.
       */
      if (
        erro?.name === 'TokenExpiredError' &&
        token
      ) {
        try {
          const payloadExpirado = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
              ignoreExpiration: true
            }
          );

          const usuarioId =
            payloadExpirado?.id;

          if (usuarioId) {
            limparExpiracoesAntigas();

            const agora = Date.now();

            const ultimoRegistro =
              expiracoesRegistradas.get(usuarioId) || 0;

            /**
             * Registra no máximo uma expiração por usuário
             * a cada 60 segundos.
             */
            if (
              agora - ultimoRegistro >
              60 * 1000
            ) {
              expiracoesRegistradas.set(
                usuarioId,
                agora
              );

              /**
               * Essas propriedades serão utilizadas pelo
               * middleware central de auditoria.
               */
              req.auditUserId =
                usuarioId;

              req.auditForce =
                true;

              req.auditAction =
                'SESSAO_EXPIRADA';

              req.auditDescription =
                'A sessão foi encerrada automaticamente porque o token de acesso expirou.';
            }
          }
        } catch {
          /**
           * Token com assinatura inválida:
           * não é seguro associar a tentativa a um usuário.
           */
        }
      }

      if (
        erro?.name !== 'TokenExpiredError' &&
        erro?.name !== 'JsonWebTokenError' &&
        erro?.name !== 'NotBeforeError'
      ) {
        console.error(
          '[AUTH] Erro ao autenticar usuário:',
          erro
        );
      }

      return res.status(401).json({
        ok: false,
        erro: 'Token inválido ou expirado.'
      });
    }
  };
}

module.exports = authMiddleware;