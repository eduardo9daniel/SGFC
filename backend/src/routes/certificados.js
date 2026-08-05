/**
 * routes/certificados.js — versão completa com QR Code,
 * autenticidade e auditoria centralizada
 *
 * Dependências:
 *   npm install qrcode express-rate-limit puppeteer
 */

const router = require('express').Router();
const crypto = require('crypto');
const puppeteer = require('puppeteer');
const rateLimit = require('express-rate-limit');

const db = require('../config/db');
const auth = require('../middleware/auth');

const {
  gerarQRCodeDataURL,
  gerarQRCodeBuffer,
  urlValidacao
} = require('../utils/qrcode');

const {
  gerarHTMLCertificado
} = require('../utils/certificadoTemplate');

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER DA VALIDAÇÃO PÚBLICA
// ─────────────────────────────────────────────────────────────────────────────

const validacaoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    erro: 'Muitas consultas. Aguarde um momento.'
  }
});

const CERT_MIN = parseInt(
  process.env.CERT_MIN_FREQUENCIA || '75',
  10
);

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

async function calcFreq(inscricaoId) {
  const [[resultado]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       IFNULL(SUM(presente), 0) AS presentes
     FROM frequencias
     WHERE inscricao_id = ?`,
    [inscricaoId]
  );

  if (
    !resultado ||
    Number(resultado.total) === 0
  ) {
    return 0;
  }

  return Math.round(
    (
      Number(resultado.presentes) /
      Number(resultado.total)
    ) * 100
  );
}

/**
 * Registra consultas públicas de autenticidade.
 *
 * Esses registros permanecem na tabela
 * logs_consultas_certificados e são diferentes dos registros
 * de auditoria de usuários autenticados.
 */
async function logConsulta(
  certificadoId,
  hash,
  req,
  resultado
) {
  try {
    const encaminhado =
      req.headers['x-forwarded-for'];

    const ip = encaminhado
      ? String(encaminhado).split(',')[0].trim()
      : req.ip || null;

    await db.query(
      `INSERT INTO logs_consultas_certificados
         (
           certificado_id,
           hash_consultado,
           ip,
           user_agent,
           referer,
           resultado
         )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        certificadoId,
        hash,
        ip,
        String(
          req.headers['user-agent'] || ''
        ).substring(0, 500),
        String(
          req.headers.referer || ''
        ).substring(0, 500),
        resultado
      ]
    );

    if (certificadoId) {
      await db.query(
        `UPDATE certificados
         SET total_consultas =
           IFNULL(total_consultas, 0) + 1
         WHERE id = ?`,
        [certificadoId]
      );
    }
  } catch (erro) {
    console.error(
      '[CERTIFICADOS] Erro ao registrar consulta:',
      erro.message
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTAGEM DE CERTIFICADOS DE UMA FORMAÇÃO
// GET /api/certificados?formacao_id=
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/',
  auth('admin', 'coordenador', 'equipe'),
  async (req, res) => {
    try {
      const { formacao_id } = req.query;

      if (!formacao_id) {
        return res.status(400).json({
          ok: false,
          erro: 'formacao_id obrigatório.'
        });
      }

      const [rows] = await db.query(
        `SELECT
           i.id AS inscricao_id,

           u.nome_completo,
           u.cpf,
           u.email,

           f.titulo,
           f.carga_horaria,
           f.data_inicio,
           f.data_fim,

           c.id AS certificado_id,
           c.codigo_validacao,
           c.hash_unico,
           c.status AS cert_status,
           c.data_emissao,
           c.carga_horaria_cursada,
           c.total_consultas,

           (
             SELECT COUNT(*)
             FROM frequencias fq
             WHERE fq.inscricao_id = i.id
           ) AS total_aulas,

           (
             SELECT IFNULL(SUM(fq.presente), 0)
             FROM frequencias fq
             WHERE fq.inscricao_id = i.id
           ) AS total_presentes

         FROM inscricoes i

         JOIN usuarios u
           ON u.id = i.usuario_id

         JOIN formacoes f
           ON f.id = i.formacao_id

         LEFT JOIN certificados c
           ON c.inscricao_id = i.id

         WHERE i.formacao_id = ?
           AND i.status = 'confirmada'

         ORDER BY u.nome_completo`,
        [formacao_id]
      );

      return res.json({
        ok: true,
        data: rows
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro ao listar certificados:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao carregar certificados.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICADOS DO PARTICIPANTE
// GET /api/certificados/meus
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/meus',
  auth('participante'),
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT
           c.*,
           f.titulo,
           f.data_inicio,
           f.data_fim,
           u.nome_completo

         FROM certificados c

         JOIN inscricoes i
           ON i.id = c.inscricao_id

         JOIN formacoes f
           ON f.id = i.formacao_id

         JOIN usuarios u
           ON u.id = i.usuario_id

         WHERE i.usuario_id = ?

         ORDER BY c.data_emissao DESC`,
        [req.user.id]
      );

      return res.json({
        ok: true,
        data: rows
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro ao carregar certificados do participante:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao carregar seus certificados.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO PÚBLICA POR HASH
// GET /api/certificados/validar/:hash
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/validar/:hash',
  validacaoLimiter,
  async (req, res) => {
    try {
      const { hash } = req.params;

      if (!/^[0-9a-f-]{8,40}$/i.test(hash)) {
        return res.status(400).json({
          ok: false,
          erro: 'Hash inválido.'
        });
      }

      const [rows] = await db.query(
        `SELECT
           c.id,
           c.hash_unico,
           c.codigo_validacao,
           c.status,
           c.data_emissao,
           c.data_validade,
           c.carga_horaria_cursada,
           c.total_consultas,
           c.motivo_status,

           u.nome_completo,
           u.email,
           u.cpf,

           f.titulo,
           f.carga_horaria,
           f.data_inicio,
           f.data_fim,
           f.instrutor,
           f.local

         FROM certificados c

         JOIN inscricoes i
           ON i.id = c.inscricao_id

         JOIN usuarios u
           ON u.id = i.usuario_id

         JOIN formacoes f
           ON f.id = i.formacao_id

         WHERE c.hash_unico = ?

         LIMIT 1`,
        [hash]
      );

      if (!rows.length) {
        /*
         * O uso de NULL evita tentar associar uma consulta
         * inválida a um certificado inexistente.
         */
        await logConsulta(
          null,
          hash,
          req,
          'nao_encontrado'
        );

        return res.status(404).json({
          ok: false,
          erro: 'Certificado não encontrado.'
        });
      }

      const certificado = rows[0];

      const resultado =
        certificado.status === 'ativo'
          ? 'encontrado'
          : 'cancelado';

      await logConsulta(
        certificado.id,
        hash,
        req,
        resultado
      );

      return res.json({
        ok: true,
        data: certificado
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro na validação por hash:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao validar certificado.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO PÚBLICA POR CÓDIGO LEGADO
// GET /api/certificados/validar-codigo/:codigo
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/validar-codigo/:codigo',
  validacaoLimiter,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT
           c.*,
           u.nome_completo,
           f.titulo,
           f.carga_horaria,
           f.data_inicio,
           f.data_fim,
           f.instrutor

         FROM certificados c

         JOIN inscricoes i
           ON i.id = c.inscricao_id

         JOIN usuarios u
           ON u.id = i.usuario_id

         JOIN formacoes f
           ON f.id = i.formacao_id

         WHERE c.codigo_validacao = ?

         LIMIT 1`,
        [req.params.codigo]
      );

      if (!rows.length) {
        return res.status(404).json({
          ok: false,
          erro: 'Certificado não encontrado.'
        });
      }

      return res.json({
        ok: true,
        data: rows[0]
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro na validação por código:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao validar certificado.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE PÚBLICO
// GET /api/certificados/qrcode/:hash.png
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/qrcode/:hash.png',
  async (req, res) => {
    try {
      const buffer = await gerarQRCodeBuffer(
        req.params.hash
      );

      res.set(
        'Content-Type',
        'image/png'
      );

      res.set(
        'Cache-Control',
        'public, max-age=86400'
      );

      return res.send(buffer);
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro ao gerar QR Code:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao gerar QR Code.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// EMISSÃO OU REEMISSÃO
// POST /api/certificados
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/',
  auth('admin', 'coordenador'),
  async (req, res) => {
    try {
      const {
        inscricao_id,
        carga_horaria_cursada
      } = req.body;

      if (!inscricao_id) {
        return res.status(400).json({
          ok: false,
          erro: 'inscricao_id obrigatório.'
        });
      }

      const frequencia =
        await calcFreq(inscricao_id);

      if (frequencia < CERT_MIN) {
        return res.status(400).json({
          ok: false,
          erro:
            `Frequência insuficiente (${frequencia}%). ` +
            `Mínimo: ${CERT_MIN}%.`
        });
      }

      const [[dadosParticipante]] =
        await db.query(
          `SELECT
             u.nome_completo,
             u.email,
             u.cpf,

             f.titulo,
             f.carga_horaria,
             f.data_inicio,
             f.data_fim,
             f.instrutor,
             f.local,
             f.proposito,
             f.conteudo_programatico,
             f.publico,
             f.responsavel_nome,
             f.setor_demandante,

             i.id AS inscricao_id

           FROM inscricoes i

           JOIN usuarios u
             ON u.id = i.usuario_id

           JOIN formacoes f
             ON f.id = i.formacao_id

           WHERE i.id = ?

           LIMIT 1`,
          [inscricao_id]
        );

      if (!dadosParticipante) {
        return res.status(404).json({
          ok: false,
          erro: 'Inscrição não encontrada.'
        });
      }

      const hashUnico =
        crypto.randomUUID();

      const codigoValidacao =
        crypto
          .randomBytes(8)
          .toString('hex')
          .toUpperCase() +
        '-' +
        new Date()
          .toISOString()
          .slice(0, 10)
          .replace(/-/g, '');

      const dadosCompletos = {
        participante: {
          nome:
            dadosParticipante.nome_completo,
          email:
            dadosParticipante.email,
          cpf:
            dadosParticipante.cpf
        },

        formacao: {
          titulo:
            dadosParticipante.titulo,
          carga_horaria:
            dadosParticipante.carga_horaria,
          data_inicio:
            dadosParticipante.data_inicio,
          data_fim:
            dadosParticipante.data_fim,
          instrutor:
            dadosParticipante.instrutor,
          local:
            dadosParticipante.local,
          proposito:
            dadosParticipante.proposito,
          conteudo_programatico:
            dadosParticipante.conteudo_programatico,
          publico:
            dadosParticipante.publico,
          responsavel:
            dadosParticipante.responsavel_nome ||
            dadosParticipante.instrutor,
          setor_demandante:
            dadosParticipante.setor_demandante
        },

        emissao: {
          data: new Date().toISOString(),
          emitido_por: req.user.id
        }
      };

      await db.query(
        `INSERT INTO certificados
           (
             inscricao_id,
             codigo_validacao,
             hash_unico,
             status,
             data_emissao,
             carga_horaria_cursada,
             dados_completos
           )
         VALUES (
           ?,
           ?,
           ?,
           'ativo',
           CURDATE(),
           ?,
           ?
         )

         ON DUPLICATE KEY UPDATE
           codigo_validacao =
             VALUES(codigo_validacao),

           hash_unico =
             VALUES(hash_unico),

           status =
             'ativo',

           data_emissao =
             CURDATE(),

           carga_horaria_cursada =
             VALUES(carga_horaria_cursada),

           dados_completos =
             VALUES(dados_completos)`,
        [
          inscricao_id,
          codigoValidacao,
          hashUnico,
          carga_horaria_cursada ||
            dadosParticipante.carga_horaria,
          JSON.stringify(dadosCompletos)
        ]
      );

      const qrCodeDataUrl =
        await gerarQRCodeDataURL(
          hashUnico
        );

      const urlDeValidacao =
        urlValidacao(hashUnico);

      /*
       * Não fazemos INSERT em logs_atividades aqui.
       *
       * O middleware central registra a ação depois
       * que a resposta for concluída.
       */
      req.auditAction =
        'CERTIFICADO_EMITIDO';

      req.auditDescription =
        `Emitiu o certificado da inscrição #${inscricao_id} ` +
        `para "${dadosParticipante.nome_completo}" na formação ` +
        `"${dadosParticipante.titulo}".`;

      return res.status(201).json({
        ok: true,
        codigo: codigoValidacao,
        hash: hashUnico,
        url_validacao: urlDeValidacao,
        qr_code_data_url: qrCodeDataUrl
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro ao emitir certificado:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao emitir certificado.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// REVOGAÇÃO OU SUBSTITUIÇÃO
// PATCH /api/certificados/:id/revogar
// ─────────────────────────────────────────────────────────────────────────────

router.patch(
  '/:id/revogar',
  auth('admin', 'coordenador'),
  async (req, res) => {
    try {
      const {
        status,
        motivo
      } = req.body;

      if (
        ![
          'cancelado',
          'substituido'
        ].includes(status)
      ) {
        return res.status(400).json({
          ok: false,
          erro:
            "status deve ser 'cancelado' ou 'substituido'."
        });
      }

      const [[certificado]] =
        await db.query(
          `SELECT
             c.id,
             c.hash_unico,
             u.nome_completo,
             f.titulo

           FROM certificados c

           JOIN inscricoes i
             ON i.id = c.inscricao_id

           JOIN usuarios u
             ON u.id = i.usuario_id

           JOIN formacoes f
             ON f.id = i.formacao_id

           WHERE c.id = ?

           LIMIT 1`,
          [req.params.id]
        );

      if (!certificado) {
        return res.status(404).json({
          ok: false,
          erro: 'Certificado não encontrado.'
        });
      }

      await db.query(
        `UPDATE certificados
         SET
           status = ?,
           motivo_status = ?
         WHERE id = ?`,
        [
          status,
          motivo || null,
          req.params.id
        ]
      );

      req.auditAction =
        'CERTIFICADO_STATUS_ALTERADO';

      req.auditDescription =
        `Alterou o certificado #${req.params.id}, pertencente a ` +
        `"${certificado.nome_completo}", para o status "${status}". ` +
        `Motivo: ${motivo || 'não informado'}.`;

      return res.json({
        ok: true,
        mensagem:
          `Certificado marcado como ${status}.`
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro ao alterar certificado:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao atualizar certificado.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE DE UM CERTIFICADO
// GET /api/certificados/:id/qrcode
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/:id/qrcode',
  auth(
    'admin',
    'coordenador',
    'participante'
  ),
  async (req, res) => {
    try {
      const [[certificado]] =
        await db.query(
          `SELECT
             c.hash_unico,
             i.usuario_id AS participante_id

           FROM certificados c

           JOIN inscricoes i
             ON i.id = c.inscricao_id

           WHERE c.id = ?

           LIMIT 1`,
          [req.params.id]
        );

      if (!certificado) {
        return res.status(404).json({
          ok: false,
          erro: 'Certificado não encontrado.'
        });
      }

      if (
        req.user.tipo === 'participante' &&
        Number(
          certificado.participante_id
        ) !== Number(req.user.id)
      ) {
        return res.status(403).json({
          ok: false,
          erro:
            'Você não tem permissão para consultar este certificado.'
        });
      }

      const qrCodeDataUrl =
        await gerarQRCodeDataURL(
          certificado.hash_unico
        );

      return res.json({
        ok: true,
        qr_code_data_url: qrCodeDataUrl,
        url_validacao:
          urlValidacao(
            certificado.hash_unico
          )
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro ao consultar QR Code:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro: 'Erro ao consultar QR Code.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRICO DE VALIDAÇÕES DO CERTIFICADO
// GET /api/certificados/:id/logs
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/:id/logs',
  auth(
    'admin',
    'coordenador',
    'equipe'
  ),
  async (req, res) => {
    try {
      const [logs] = await db.query(
        `SELECT
           id,
           ip,
           user_agent,
           resultado,
           data_consulta

         FROM logs_consultas_certificados

         WHERE certificado_id = ?

         ORDER BY data_consulta DESC

         LIMIT 100`,
        [req.params.id]
      );

      return res.json({
        ok: true,
        data: logs
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro ao carregar consultas:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro ao carregar o histórico de consultas.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO EM MASSA
// POST /api/certificados/validar-massa
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/validar-massa',
  async (req, res) => {
    try {
      const apiKey =
        req.headers['x-api-key'];

      if (!apiKey) {
        return res.status(401).json({
          ok: false,
          erro: 'X-API-Key obrigatório.'
        });
      }

      const [[chave]] =
        await db.query(
          `SELECT
             id,
             nome

           FROM api_keys_certificados

           WHERE api_key = ?
             AND ativo = 1

           LIMIT 1`,
          [apiKey]
        );

      if (!chave) {
        return res.status(403).json({
          ok: false,
          erro:
            'Chave inválida ou desativada.'
        });
      }

      await db.query(
        `UPDATE api_keys_certificados
         SET ultimo_uso = NOW()
         WHERE id = ?`,
        [chave.id]
      );

      const { hashes } = req.body;

      if (
        !Array.isArray(hashes) ||
        hashes.length === 0
      ) {
        return res.status(400).json({
          ok: false,
          erro: 'Envie um array de hashes.'
        });
      }

      if (hashes.length > 100) {
        return res.status(400).json({
          ok: false,
          erro:
            'Máximo de 100 hashes por requisição.'
        });
      }

      const placeholders =
        hashes.map(() => '?').join(',');

      const [rows] = await db.query(
        `SELECT
           c.hash_unico,
           c.status,
           c.data_emissao,
           u.nome_completo,
           f.titulo,
           f.carga_horaria

         FROM certificados c

         JOIN inscricoes i
           ON i.id = c.inscricao_id

         JOIN usuarios u
           ON u.id = i.usuario_id

         JOIN formacoes f
           ON f.id = i.formacao_id

         WHERE c.hash_unico IN (${placeholders})`,
        hashes
      );

      const resultado =
        hashes.map(hash => {
          const certificado =
            rows.find(
              item =>
                item.hash_unico === hash
            );

          if (!certificado) {
            return {
              hash,
              valido: false,
              erro: 'não encontrado'
            };
          }

          return {
            hash,
            valido:
              certificado.status === 'ativo',
            ...certificado
          };
        });

      return res.json({
        ok: true,
        consultado_por: chave.nome,
        total: hashes.length,
        data: resultado
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro na validação em massa:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro ao validar os certificados.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATÓRIO DE CONSULTAS
// GET /api/certificados/relatorio-consultas
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/relatorio-consultas',
  auth('admin'),
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `SELECT
           c.id,
           c.hash_unico,
           c.codigo_validacao,
           c.status,
           c.total_consultas,
           c.data_emissao,
           u.nome_completo,
           f.titulo

         FROM certificados c

         JOIN inscricoes i
           ON i.id = c.inscricao_id

         JOIN usuarios u
           ON u.id = i.usuario_id

         JOIN formacoes f
           ON f.id = i.formacao_id

         ORDER BY c.total_consultas DESC

         LIMIT 50`
      );

      return res.json({
        ok: true,
        data: rows
      });
    } catch (erro) {
      console.error(
        '[CERTIFICADOS] Erro no relatório de consultas:',
        erro
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro ao carregar o relatório de consultas.'
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GERAÇÃO DO PDF
// GET /api/certificados/:codigo/pdf
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/:codigo/pdf',
  auth(
    'admin',
    'coordenador',
    'equipe',
    'participante'
  ),
  async (req, res) => {
    const { codigo } = req.params;

    let certificado;

    try {
      const [rows] = await db.query(
        `SELECT
           c.id,
           c.hash_unico,
           c.codigo_validacao,
           c.status,
           c.data_emissao,
           c.carga_horaria_cursada,

           i.usuario_id AS participante_id,

           u.nome_completo,

           f.titulo,
           f.carga_horaria,
           f.data_inicio,
           f.data_fim,
           f.proposito,
           f.conteudo_programatico,
           f.publico,
           f.local,
           COALESCE(f.responsavel_nome, f.instrutor) AS responsavel,
           f.setor_demandante

         FROM certificados c

         JOIN inscricoes i
           ON i.id = c.inscricao_id

         JOIN usuarios u
           ON u.id = i.usuario_id

         JOIN formacoes f
           ON f.id = i.formacao_id

         WHERE c.hash_unico = ?
            OR c.codigo_validacao = ?

         LIMIT 1`,
        [
          codigo,
          codigo
        ]
      );

      if (!rows.length) {
        return res.status(404).json({
          ok: false,
          erro: 'Certificado não encontrado.'
        });
      }

      certificado = rows[0];

      /*
       * Participantes só podem baixar o próprio
       * certificado.
       */
      if (
        req.user.tipo === 'participante' &&
        Number(
          certificado.participante_id
        ) !== Number(req.user.id)
      ) {
        return res.status(403).json({
          ok: false,
          erro:
            'Você não tem permissão para baixar este certificado.'
        });
      }

      /*
       * Certificados cancelados ou substituídos
       * não podem ser baixados.
       */
      if (
        certificado.status !== 'ativo'
      ) {
        return res.status(409).json({
          ok: false,
          erro:
            'Este certificado não está ativo e não pode ser baixado.'
        });
      }
    } catch (erroBanco) {
      console.error(
        '[CERTIFICADOS PDF] Erro no banco:',
        erroBanco
      );

      return res.status(500).json({
        ok: false,
        erro:
          'Erro ao buscar certificado.',

        detalhe:
          process.env.NODE_ENV !==
          'production'
            ? erroBanco.message
            : undefined
      });
    }

    let browser;

    try {
      const qrCodeDataUrl =
        await gerarQRCodeDataURL(
          certificado.hash_unico
        );

      const html =
        gerarHTMLCertificado({
          nome_completo:
            certificado.nome_completo,

          titulo:
            certificado.titulo,

          tipo:
            'Curso',

          data_inicio:
            certificado.data_inicio,

          data_fim:
            certificado.data_fim,

          carga_horaria:
            certificado.carga_horaria,

          carga_horaria_cursada:
            certificado.carga_horaria_cursada,

          proposito:
            certificado.proposito,

          conteudo_programatico:
            certificado.conteudo_programatico,

          publico:
            certificado.publico,

          local:
            certificado.local,

          responsavel:
            certificado.responsavel,

          setor_demandante:
            certificado.setor_demandante,

          data_emissao:
            certificado.data_emissao,

          qr_code_data_url:
            qrCodeDataUrl,

          hash_unico:
            certificado.hash_unico
        });

      browser =
        await puppeteer.launch({
          headless: 'new',

          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        });

      const page =
        await browser.newPage();

      await page.setContent(
        html,
        {
          waitUntil:
            'domcontentloaded',

          timeout:
            15000
        }
      );

      /*
       * Aguarda fontes por até 5 segundos.
       */
      await page.evaluate(() =>
        Promise.race([
          document.fonts.ready,

          new Promise(resolve =>
            setTimeout(
              resolve,
              5000
            )
          )
        ])
      );

      await page.setViewport({
        width: 1122,
        height: 794,
        deviceScaleFactor: 2
      });

      const pdfRaw =
        await page.pdf({
          width: '297mm',
          height: '210mm',
          printBackground: true,

          margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }
        });

      /*
       * Puppeteer v20+ pode retornar Uint8Array.
       */
      const pdfBuffer =
        Buffer.from(pdfRaw);

      /*
       * O middleware de auditoria registrará o download.
       *
       * Não deve existir um INSERT direto em
       * logs_atividades nesta rota.
       */
      req.auditAction =
        'CERTIFICADO_PDF_BAIXADO';

      req.auditDescription =
        `Baixou o PDF do certificado #${certificado.id}, ` +
        `pertencente a "${certificado.nome_completo}", ` +
        `da formação "${certificado.titulo}".`;

      const nomeSeguro =
        certificado.nome_completo
          .normalize('NFD')
          .replace(
            /[\u0300-\u036f]/g,
            ''
          )
          .replace(
            /[^a-zA-Z0-9]/g,
            '_'
          );

      res.set({
        'Content-Type':
          'application/pdf',

        'Content-Disposition':
          `attachment; filename="Certificado_${nomeSeguro}.pdf"`,

        'Content-Length':
          pdfBuffer.length
      });

      return res.end(pdfBuffer);
    } catch (erro) {
      console.error(
        '[CERTIFICADOS PDF] Erro:',
        erro
      );

      if (!res.headersSent) {
        return res.status(500).json({
          ok: false,
          erro:
            'Erro ao gerar PDF.',

          detalhe:
            process.env.NODE_ENV !==
            'production'
              ? erro.message
              : undefined
        });
      }

      return undefined;
    } finally {
      if (browser) {
        await browser
          .close()
          .catch(() => {});
      }
    }
  }
);

module.exports = router;