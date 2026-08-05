const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

/**
 * Converte um valor em número inteiro positivo.
 */
function inteiroPositivo(valor) {
  const numero = Number.parseInt(valor, 10);

  return Number.isInteger(numero) && numero > 0
    ? numero
    : null;
}

/**
 * GET /api/inscricoes
 *
 * Lista inscrições.
 *
 * Perfis permitidos:
 * - admin;
 * - coordenador;
 * - equipe.
 *
 * Filtro opcional:
 * ?formacao_id=1
 */
router.get(
  '/',
  auth('admin', 'coordenador', 'equipe'),
  async (req, res) => {
    try {
      const formacaoId =
        inteiroPositivo(req.query.formacao_id);

      let sql = `
        SELECT
          i.id,
          i.usuario_id,
          i.formacao_id,
          i.data_inscricao,
          i.status,
          i.presenca,

          u.nome_completo,
          u.email,
          u.cpf,
          u.telefone,

          f.titulo AS formacao_titulo,
          f.data_inicio,
          f.data_fim,
          f.carga_horaria,
          f.local,
          f.status AS status_formacao,

          (
            SELECT COUNT(*)
            FROM frequencias fq
            WHERE fq.inscricao_id = i.id
          ) AS total_aulas,

          (
            SELECT IFNULL(SUM(fq.presente), 0)
            FROM frequencias fq
            WHERE fq.inscricao_id = i.id
          ) AS presentes

        FROM inscricoes i

        JOIN usuarios u
          ON u.id = i.usuario_id

        JOIN formacoes f
          ON f.id = i.formacao_id

        WHERE 1 = 1
      `;

      const parametros = [];

      if (formacaoId) {
        sql += `
          AND i.formacao_id = ?
        `;

        parametros.push(formacaoId);
      }

      sql += `
        ORDER BY i.data_inscricao DESC
      `;

      const [rows] = await db.query(
        sql,
        parametros
      );

      req.auditAction =
        'INSCRICOES_CONSULTADAS';

      req.auditDescription = formacaoId
        ? `Consultou as inscrições da formação #${formacaoId}.`
        : 'Consultou a lista geral de inscrições.';

      return res.json({
        ok: true,
        data: rows
      });
    } catch (erro) {
      console.error(
        '[INSCRIÇÕES] Erro ao listar inscrições:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao carregar inscrições.'
      });
    }
  }
);

/**
 * GET /api/inscricoes/minhas
 *
 * Lista as inscrições do participante autenticado.
 */
router.get(
  '/minhas',
  auth('participante'),
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT
           i.*,

           f.titulo,
           f.data_inicio,
           f.data_fim,
           f.carga_horaria,
           f.local,
           f.status AS status_formacao,

           (
             SELECT COUNT(*)
             FROM frequencias fq
             WHERE fq.inscricao_id = i.id
           ) AS total_aulas,

           (
             SELECT IFNULL(SUM(fq.presente), 0)
             FROM frequencias fq
             WHERE fq.inscricao_id = i.id
           ) AS presentes

         FROM inscricoes i

         JOIN formacoes f
           ON f.id = i.formacao_id

         WHERE i.usuario_id = ?

         ORDER BY f.data_inicio DESC`,
        [req.user.id]
      );

      req.auditAction =
        'MINHAS_INSCRICOES_CONSULTADAS';

      req.auditDescription =
        'Consultou as próprias inscrições em formações.';

      return res.json({
        ok: true,
        data: rows
      });
    } catch (erro) {
      console.error(
        '[INSCRIÇÕES] Erro ao carregar inscrições do participante:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro ao carregar suas inscrições.'
      });
    }
  }
);

/**
 * POST /api/inscricoes/admin
 *
 * Permite que um administrador ou coordenador inscreva
 * um participante em uma formação.
 *
 * Body:
 * {
 *   "usuario_id": 10,
 *   "formacao_id": 5
 * }
 */
router.post(
  '/admin',
  auth('admin', 'coordenador'),
  async (req, res) => {
    const usuarioId =
      inteiroPositivo(req.body.usuario_id);

    const formacaoId =
      inteiroPositivo(req.body.formacao_id);

    if (!usuarioId || !formacaoId) {
      return res.status(400).json({
        ok: false,
        erro:
          'usuario_id e formacao_id são obrigatórios.'
      });
    }

    let conexao;

    try {
      /**
       * Confirma se o usuário existe, está ativo
       * e possui o perfil participante.
       */
      const [[participante]] =
        await db.query(
          `SELECT
             id,
             nome_completo,
             email,
             tipo_usuario

           FROM usuarios

           WHERE id = ?
             AND status = 1

           LIMIT 1`,
          [usuarioId]
        );

      if (!participante) {
        return res.status(404).json({
          ok: false,
          erro:
            'Participante não encontrado ou inativo.'
        });
      }

      if (
        participante.tipo_usuario !==
        'participante'
      ) {
        return res.status(400).json({
          ok: false,
          erro:
            'Apenas participantes podem ser inscritos.'
        });
      }

      conexao =
        await db.getConnection();

      await conexao.beginTransaction();

      /**
       * Bloqueia a formação durante a operação para impedir
       * que duas inscrições ocupem a última vaga.
       */
      const [[formacao]] =
        await conexao.query(
          `SELECT
             id,
             titulo,
             vagas_disponiveis,
             status

           FROM formacoes

           WHERE id = ?

           FOR UPDATE`,
          [formacaoId]
        );

      if (!formacao) {
        await conexao.rollback();

        return res.status(404).json({
          ok: false,
          erro: 'Formação não encontrada.'
        });
      }

      if (formacao.status !== 'aberta') {
        await conexao.rollback();

        return res.status(400).json({
          ok: false,
          erro:
            'Formação não está disponível para inscrições.'
        });
      }

      if (
        Number(formacao.vagas_disponiveis) <= 0
      ) {
        await conexao.rollback();

        return res.status(400).json({
          ok: false,
          erro:
            'Sem vagas disponíveis nesta formação.'
        });
      }

      const [[inscricaoExistente]] =
        await conexao.query(
          `SELECT
             id,
             status

           FROM inscricoes

           WHERE usuario_id = ?
             AND formacao_id = ?

           LIMIT 1`,
          [
            usuarioId,
            formacaoId
          ]
        );

      if (inscricaoExistente) {
        await conexao.rollback();

        return res.status(409).json({
          ok: false,
          erro:
            inscricaoExistente.status ===
            'cancelada'
              ? 'O participante já possui uma inscrição cancelada nesta formação.'
              : 'Participante já está inscrito nesta formação.'
        });
      }

      const [resultado] =
        await conexao.query(
          `INSERT INTO inscricoes
             (
               usuario_id,
               formacao_id,
               status
             )
           VALUES (?, ?, 'confirmada')`,
          [
            usuarioId,
            formacaoId
          ]
        );

      await conexao.query(
        `UPDATE formacoes

         SET vagas_disponiveis =
           vagas_disponiveis - 1

         WHERE id = ?`,
        [formacaoId]
      );

      await conexao.commit();

      /**
       * O middleware central fará a gravação na tabela
       * logs_atividades depois que a resposta terminar.
       */
      req.auditAction =
        'PARTICIPANTE_INSCRITO';

      req.auditDescription =
        `Inscreveu o participante "${participante.nome_completo}" ` +
        `na formação "${formacao.titulo}", gerando a inscrição ` +
        `#${resultado.insertId}.`;

      return res.status(201).json({
        ok: true,
        id: resultado.insertId,
        mensagem:
          'Participante inscrito com sucesso.'
      });
    } catch (erro) {
      if (conexao) {
        await conexao
          .rollback()
          .catch(() => {});
      }

      console.error(
        '[INSCRIÇÕES] Erro ao inscrever participante:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao realizar inscrição.'
      });
    } finally {
      if (conexao) {
        conexao.release();
      }
    }
  }
);

/**
 * POST /api/inscricoes
 *
 * Realiza a inscrição do próprio participante.
 *
 * Body:
 * {
 *   "formacao_id": 5
 * }
 */
router.post(
  '/',
  auth('participante'),
  async (req, res) => {
    const formacaoId =
      inteiroPositivo(req.body.formacao_id);

    if (!formacaoId) {
      return res.status(400).json({
        ok: false,
        erro: 'formacao_id obrigatório.'
      });
    }

    const usuarioId =
      req.user.id;

    let conexao;

    try {
      conexao =
        await db.getConnection();

      await conexao.beginTransaction();

      const [[formacao]] =
        await conexao.query(
          `SELECT
             id,
             titulo,
             vagas_disponiveis,
             status

           FROM formacoes

           WHERE id = ?

           FOR UPDATE`,
          [formacaoId]
        );

      if (!formacao) {
        await conexao.rollback();

        return res.status(404).json({
          ok: false,
          erro: 'Formação não encontrada.'
        });
      }

      if (formacao.status !== 'aberta') {
        await conexao.rollback();

        return res.status(400).json({
          ok: false,
          erro:
            'Formação não está disponível.'
        });
      }

      if (
        Number(formacao.vagas_disponiveis) <= 0
      ) {
        await conexao.rollback();

        return res.status(400).json({
          ok: false,
          erro: 'Sem vagas disponíveis.'
        });
      }

      const [[inscricaoExistente]] =
        await conexao.query(
          `SELECT
             id,
             status

           FROM inscricoes

           WHERE usuario_id = ?
             AND formacao_id = ?

           LIMIT 1`,
          [
            usuarioId,
            formacaoId
          ]
        );

      if (inscricaoExistente) {
        await conexao.rollback();

        return res.status(409).json({
          ok: false,
          erro:
            inscricaoExistente.status ===
            'cancelada'
              ? 'Você já possui uma inscrição cancelada nesta formação.'
              : 'Você já está inscrito nesta formação.'
        });
      }

      const [resultado] =
        await conexao.query(
          `INSERT INTO inscricoes
             (
               usuario_id,
               formacao_id,
               status
             )
           VALUES (?, ?, 'confirmada')`,
          [
            usuarioId,
            formacaoId
          ]
        );

      await conexao.query(
        `UPDATE formacoes

         SET vagas_disponiveis =
           vagas_disponiveis - 1

         WHERE id = ?`,
        [formacaoId]
      );

      await conexao.commit();

      req.auditAction =
        'INSCRICAO_REALIZADA';

      req.auditDescription =
        `Realizou inscrição na formação "${formacao.titulo}", ` +
        `gerando a inscrição #${resultado.insertId}.`;

      return res.status(201).json({
        ok: true,
        id: resultado.insertId,
        mensagem:
          'Inscrição realizada com sucesso.'
      });
    } catch (erro) {
      if (conexao) {
        await conexao
          .rollback()
          .catch(() => {});
      }

      console.error(
        '[INSCRIÇÕES] Erro na autoinscrição:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao realizar inscrição.'
      });
    } finally {
      if (conexao) {
        conexao.release();
      }
    }
  }
);

/**
 * DELETE /api/inscricoes/:id
 *
 * Cancela uma inscrição.
 *
 * Participante:
 * - pode cancelar somente a própria inscrição;
 * - precisa cancelar com pelo menos 24 horas de antecedência.
 *
 * Admin e coordenador:
 * - podem cancelar qualquer inscrição;
 * - não estão sujeitos ao limite de 24 horas.
 */
router.delete(
  '/:id',
  auth(
    'participante',
    'admin',
    'coordenador'
  ),
  async (req, res) => {
    const inscricaoId =
      inteiroPositivo(req.params.id);

    if (!inscricaoId) {
      return res.status(400).json({
        ok: false,
        erro: 'ID da inscrição inválido.'
      });
    }

    let conexao;

    try {
      conexao =
        await db.getConnection();

      await conexao.beginTransaction();

      /**
       * Bloqueia a inscrição para evitar que dois
       * cancelamentos devolvam duas vagas.
       */
      const [[inscricao]] =
        await conexao.query(
          `SELECT
             i.id,
             i.usuario_id,
             i.formacao_id,
             i.status,

             u.nome_completo,

             f.titulo,
             f.data_inicio

           FROM inscricoes i

           JOIN usuarios u
             ON u.id = i.usuario_id

           JOIN formacoes f
             ON f.id = i.formacao_id

           WHERE i.id = ?

           FOR UPDATE`,
          [inscricaoId]
        );

      if (!inscricao) {
        await conexao.rollback();

        return res.status(404).json({
          ok: false,
          erro: 'Inscrição não encontrada.'
        });
      }

      if (
        req.user.tipo === 'participante' &&
        Number(inscricao.usuario_id) !==
          Number(req.user.id)
      ) {
        await conexao.rollback();

        return res.status(403).json({
          ok: false,
          erro: 'Acesso negado.'
        });
      }

      if (
        inscricao.status === 'cancelada'
      ) {
        await conexao.rollback();

        return res.status(409).json({
          ok: false,
          erro:
            'Esta inscrição já está cancelada.'
        });
      }

      if (
        req.user.tipo === 'participante'
      ) {
        const inicioFormacao =
          new Date(inscricao.data_inicio);

        if (
          Number.isNaN(
            inicioFormacao.getTime()
          )
        ) {
          await conexao.rollback();

          return res.status(400).json({
            ok: false,
            erro:
              'A data de início da formação é inválida.'
          });
        }

        const horasAteInicio =
          (
            inicioFormacao.getTime() -
            Date.now()
          ) / 3600000;

        if (horasAteInicio < 24) {
          await conexao.rollback();

          return res.status(400).json({
            ok: false,
            erro:
              'O cancelamento exige pelo menos 24 horas de antecedência.'
          });
        }
      }

      await conexao.query(
        `UPDATE inscricoes

         SET status = 'cancelada'

         WHERE id = ?`,
        [inscricaoId]
      );

      await conexao.query(
        `UPDATE formacoes

         SET vagas_disponiveis =
           vagas_disponiveis + 1

         WHERE id = ?`,
        [inscricao.formacao_id]
      );

      await conexao.commit();

      req.auditAction =
        'INSCRICAO_CANCELADA';

      if (
        req.user.tipo === 'participante'
      ) {
        req.auditDescription =
          `Cancelou a própria inscrição #${inscricaoId} ` +
          `na formação "${inscricao.titulo}".`;
      } else {
        req.auditDescription =
          `Cancelou a inscrição #${inscricaoId} do participante ` +
          `"${inscricao.nome_completo}" na formação ` +
          `"${inscricao.titulo}".`;
      }

      return res.json({
        ok: true,
        mensagem:
          'Inscrição cancelada com sucesso.'
      });
    } catch (erro) {
      if (conexao) {
        await conexao
          .rollback()
          .catch(() => {});
      }

      console.error(
        '[INSCRIÇÕES] Erro ao cancelar inscrição:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao cancelar inscrição.'
      });
    } finally {
      if (conexao) {
        conexao.release();
      }
    }
  }
);

module.exports = router;