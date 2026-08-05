const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

const STATUS_VALIDOS = [
  'aberta',
  'andamento',
  'concluida',
  'cancelada'
];

const TURNOS_VALIDOS = [
  'manha',
  'tarde',
  'noite'
];

function parseJsonCampo(valor, fallback) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return fallback;
  }

  if (typeof valor === 'object') {
    return valor;
  }

  try {
    return JSON.parse(valor);
  } catch {
    return fallback;
  }
}

function normalizarFormacao(row) {
  if (!row) {
    return row;
  }

  return {
    ...row,
    turnos: parseJsonCampo(
      row.turnos,
      []
    ),
    equipamentos: parseJsonCampo(
      row.equipamentos,
      {}
    )
  };
}

function numeroNaoNegativo(valor) {
  const numero = Number(valor || 0);

  return Number.isFinite(numero) &&
    numero >= 0
    ? numero
    : 0;
}

function horaOuNull(valor) {
  return valor
    ? String(valor).slice(0, 5)
    : null;
}

function dadosDoBody(body = {}) {
  const responsavel =
    body.responsavel || {};

  const convidados =
    body.convidados || {};

  const turnos = Array.isArray(body.turnos)
    ? body.turnos.filter(turno =>
        TURNOS_VALIDOS.includes(turno)
      )
    : [];

  const qtdManha = numeroNaoNegativo(
    convidados.manha ?? body.qtd_manha
  );

  const qtdTarde = numeroNaoNegativo(
    convidados.tarde ?? body.qtd_tarde
  );

  const qtdNoite = numeroNaoNegativo(
    convidados.noite ?? body.qtd_noite
  );

  const totalCalculado =
    qtdManha +
    qtdTarde +
    qtdNoite;

  const vagas =
    totalCalculado ||
    numeroNaoNegativo(body.vagas);

  return {
    titulo:
      String(body.titulo || '').trim(),

    setorDemandante:
      String(
        body.setor ||
        body.setor_demandante ||
        ''
      ).trim(),

    proposito:
      String(
        body.proposito ||
        body.descricao ||
        ''
      ).trim(),

          conteudoProgramatico:
      String(
        body.conteudo_programatico ??
        body.conteudoProgramatico ??
        ''
      ).trim(),

    cargaHoraria:
      numeroNaoNegativo(
        body.carga_horaria
      ),

    dataInicio:
      body.dataEncontro ||
      body.data_inicio ||
      null,

    dataFim:
      body.data_fim ||
      body.dataFim ||
      body.dataEncontro ||
      body.data_inicio ||
      null,

    local:
      String(
        body.espaco ||
        body.local ||
        ''
      ).trim(),

    publico:
      String(body.publico || '').trim(),

    onibus:
      body.onibus === 'sim'
        ? 'sim'
        : 'nao',

    responsavelNome:
      String(
        responsavel.nome ||
        body.responsavel_nome ||
        body.instrutor ||
        ''
      ).trim(),

    responsavelTelefone:
      String(
        responsavel.telefone ||
        body.responsavel_telefone ||
        ''
      ).trim(),

    responsavelEmail:
      String(
        responsavel.email ||
        body.responsavel_email ||
        ''
      ).trim(),

    repete:
      body.repete === 'sim'
        ? 'sim'
        : 'nao',

    outrasDatas:
      String(
        body.outrasDatas ||
        body.outras_datas ||
        ''
      ).trim() || null,

    turnos,
    qtdManha,
    qtdTarde,
    qtdNoite,

    horaInicioManha:
      horaOuNull(
        body.horaInicioManha ||
        body.hora_inicio_manha
      ),

    horaFimManha:
      horaOuNull(
        body.horaFimManha ||
        body.hora_fim_manha
      ),

    horaInicioTarde:
      horaOuNull(
        body.horaInicioTarde ||
        body.hora_inicio_tarde
      ),

    horaFimTarde:
      horaOuNull(
        body.horaFimTarde ||
        body.hora_fim_tarde
      ),

    horaInicioNoite:
      horaOuNull(
        body.horaInicioNoite ||
        body.hora_inicio_noite
      ),

    horaFimNoite:
      horaOuNull(
        body.horaFimNoite ||
        body.hora_fim_noite
      ),

    horaChegada:
      horaOuNull(
        body.horaChegada ||
        body.hora_chegada
      ),

    equipamentos:
      body.equipamentos &&
      typeof body.equipamentos === 'object'
        ? body.equipamentos
        : {},

    layoutCadeiras:
      String(
        body.layoutCadeiras ||
        body.layout_cadeiras ||
        ''
      ).trim() || null,

    mesas:
      body.mesas === 'sim'
        ? 'sim'
        : 'nao',

    qtdMesas:
      body.mesas === 'sim'
        ? numeroNaoNegativo(
            body.qtdMesas ??
            body.qtd_mesas
          )
        : null,

    acessibilidade:
      String(
        body.acessibilidade || ''
      ).trim() || null,

    coffee:
      String(
        body.coffee || ''
      ).trim() || null,

    convidadosEspeciais:
      String(
        body.convidadosEspeciais ||
        body.convidados_especiais ||
        ''
      ).trim() || null,

    observacoes:
      String(
        body.observacoes || ''
      ).trim() || null,

    vagas,

    status:
      STATUS_VALIDOS.includes(body.status)
        ? body.status
        : 'aberta'
  };
}

function validarDados(dados) {
  if (!dados.titulo) {
    return 'Informe o título do encontro.';
  }

  if (!dados.setorDemandante) {
    return 'Informe o setor demandante.';
  }

  if (!dados.proposito) {
    return 'Informe o propósito do encontro.';
  }

  if (!dados.cargaHoraria) {
    return 'Informe a carga horária.';
  }

  if (
    !dados.responsavelNome ||
    !dados.responsavelTelefone ||
    !dados.responsavelEmail
  ) {
    return 'Preencha nome, telefone e e-mail do responsável.';
  }

  if (!dados.dataInicio) {
    return 'Informe a data do encontro.';
  }

  if (!dados.turnos.length) {
    return 'Selecione ao menos um turno.';
  }

  const horarios = {
    manha: [
      dados.horaInicioManha,
      dados.horaFimManha
    ],

    tarde: [
      dados.horaInicioTarde,
      dados.horaFimTarde
    ],

    noite: [
      dados.horaInicioNoite,
      dados.horaFimNoite
    ]
  };

  for (const turno of dados.turnos) {
    const [inicio, fim] =
      horarios[turno];

    if (!inicio || !fim) {
      return (
        `Informe os horários ` +
        `do turno ${turno}.`
      );
    }

    if (inicio >= fim) {
      return (
        `O horário final do turno ` +
        `${turno} deve ser posterior ao início.`
      );
    }
  }

  return null;
}

function montarHorarioResumo(dados) {
  const labels = {
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite'
  };

  const horarios = {
    manha: [
      dados.horaInicioManha,
      dados.horaFimManha
    ],

    tarde: [
      dados.horaInicioTarde,
      dados.horaFimTarde
    ],

    noite: [
      dados.horaInicioNoite,
      dados.horaFimNoite
    ]
  };

  return dados.turnos
    .map(turno => {
      const [inicio, fim] =
        horarios[turno];

      return (
        `${labels[turno]}: ` +
        `${inicio} às ${fim}`
      );
    })
    .join(' | ');
}

function dataIsoSegura(valor) {
  if (!valor) {
    return null;
  }

  if (
    valor instanceof Date &&
    !Number.isNaN(valor.getTime())
  ) {
    const ano = valor.getFullYear();

    const mes = String(
      valor.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      valor.getDate()
    ).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
  }

  const texto =
    String(valor).trim();

  if (
    /^\d{4}-\d{2}-\d{2}/.test(texto)
  ) {
    return texto.slice(0, 10);
  }

  const brasileira = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  );

  if (brasileira) {
    return (
      `${brasileira[3]}-` +
      `${brasileira[2]}-` +
      `${brasileira[1]}`
    );
  }

  return null;
}

function dataParaNumero(data) {
  const [ano, mes, dia] =
    data.split('-').map(Number);

  return Date.UTC(
    ano,
    mes - 1,
    dia
  );
}

function numeroParaData(numero) {
  const data = new Date(numero);

  return data
    .toISOString()
    .slice(0, 10);
}

function datasNoIntervalo(
  inicio,
  fim,
  limiteInicio,
  limiteFim
) {
  const inicioValido =
    dataIsoSegura(inicio);

  const fimValido =
    dataIsoSegura(fim) ||
    inicioValido;

  if (
    !inicioValido ||
    !fimValido
  ) {
    return [];
  }

  const primeiro = Math.max(
    dataParaNumero(inicioValido),
    dataParaNumero(limiteInicio)
  );

  const ultimo = Math.min(
    dataParaNumero(fimValido),
    dataParaNumero(limiteFim)
  );

  if (primeiro > ultimo) {
    return [];
  }

  const datas = [];

  const umDia =
    24 * 60 * 60 * 1000;

  for (
    let atual = primeiro;
    atual <= ultimo;
    atual += umDia
  ) {
    datas.push(
      numeroParaData(atual)
    );
  }

  return datas;
}

function extrairOutrasDatas(valor) {
  if (!valor) {
    return [];
  }

  return String(valor)
    .split(/[;,\n|]+/)
    .map(parte => parte.trim())
    .filter(Boolean)
    .map(dataIsoSegura)
    .filter(Boolean);
}

function turnosDaFormacao(row) {
  const turnosInformados =
    parseJsonCampo(
      row.turnos,
      []
    );

  const turnos =
    Array.isArray(turnosInformados)
      ? turnosInformados.filter(turno =>
          TURNOS_VALIDOS.includes(turno)
        )
      : [];

  if (turnos.length) {
    return turnos;
  }

  if (
    row.hora_inicio_manha ||
    row.hora_fim_manha
  ) {
    turnos.push('manha');
  }

  if (
    row.hora_inicio_tarde ||
    row.hora_fim_tarde
  ) {
    turnos.push('tarde');
  }

  if (
    row.hora_inicio_noite ||
    row.hora_fim_noite
  ) {
    turnos.push('noite');
  }

  return turnos;
}

function horariosDaFormacao(row) {
  return {
    manha: {
      inicio:
        horaOuNull(
          row.hora_inicio_manha
        ),

      fim:
        horaOuNull(
          row.hora_fim_manha
        )
    },

    tarde: {
      inicio:
        horaOuNull(
          row.hora_inicio_tarde
        ),

      fim:
        horaOuNull(
          row.hora_fim_tarde
        )
    },

    noite: {
      inicio:
        horaOuNull(
          row.hora_inicio_noite
        ),

      fim:
        horaOuNull(
          row.hora_fim_noite
        )
    }
  };
}

// GET /api/formacoes/agenda-semanal
router.get(
  '/agenda-semanal',
  auth(
    'admin',
    'coordenador',
    'equipe'
  ),
  async (req, res, next) => {
    try {
      const inicio =
        dataIsoSegura(
          req.query.inicio
        );

      const fim =
        dataIsoSegura(
          req.query.fim
        );

      if (!inicio || !fim) {
        return res.status(400).json({
          ok: false,
          erro:
            'Informe o início e o fim da semana no formato AAAA-MM-DD.'
        });
      }

      const totalDias =
        Math.floor(
          (
            dataParaNumero(fim) -
            dataParaNumero(inicio)
          ) /
          (
            24 *
            60 *
            60 *
            1000
          )
        ) + 1;

      if (
        totalDias < 1 ||
        totalDias > 31
      ) {
        return res.status(400).json({
          ok: false,
          erro:
            'O período da agenda deve possuir entre 1 e 31 dias.'
        });
      }

      const [rows] =
        await db.query(
          `SELECT
            id,
            titulo,
            setor_demandante,
            local,
            status,
            vagas,
            data_inicio,
            data_fim,
            repete,
            outras_datas,
            turnos,
            qtd_manha,
            qtd_tarde,
            qtd_noite,
            equipamentos,
            hora_inicio_manha,
            hora_fim_manha,
            hora_inicio_tarde,
            hora_fim_tarde,
            hora_inicio_noite,
            hora_fim_noite
           FROM formacoes
           WHERE status <> 'cancelada'
             AND local IS NOT NULL
             AND TRIM(local) <> ''
             AND (
               (
                 data_inicio <= ?
                 AND COALESCE(
                   data_fim,
                   data_inicio
                 ) >= ?
               )
               OR (
                 repete = 'sim'
                 AND outras_datas IS NOT NULL
                 AND TRIM(outras_datas) <> ''
               )
             )
           ORDER BY
             local,
             data_inicio,
             titulo`,
          [
            fim,
            inicio
          ]
        );

      const ocupacoes = [];
      const chaves = new Set();

      for (const row of rows) {
        const datas = new Set([
          ...datasNoIntervalo(
            row.data_inicio,
            row.data_fim,
            inicio,
            fim
          ),

          ...extrairOutrasDatas(
            row.outras_datas
          ).filter(data =>
            data >= inicio &&
            data <= fim
          )
        ]);

        const turnos =
          turnosDaFormacao(row);

        const horarios =
          horariosDaFormacao(row);

        for (const data of datas) {
          const chave =
            `${row.id}-${data}`;

          if (chaves.has(chave)) {
            continue;
          }

          chaves.add(chave);

          ocupacoes.push({
            id: row.id,
            data,
            titulo: row.titulo,
            setor:
              row.setor_demandante,
            espaco: row.local,
            status: row.status,

            vagas:
              numeroNaoNegativo(
                row.vagas
              ),

            participantes: {
              manha:
                numeroNaoNegativo(
                  row.qtd_manha
                ),

              tarde:
                numeroNaoNegativo(
                  row.qtd_tarde
                ),

              noite:
                numeroNaoNegativo(
                  row.qtd_noite
                )
            },

            equipamentos:
              parseJsonCampo(
                row.equipamentos,
                {}
              ),

            turnos,
            horarios
          });
        }
      }

      ocupacoes.sort((a, b) =>
        a.data.localeCompare(b.data) ||
        a.espaco.localeCompare(
          b.espaco,
          'pt-BR'
        ) ||
        a.titulo.localeCompare(
          b.titulo,
          'pt-BR'
        )
      );

      return res.json({
        ok: true,
        data: {
          inicio,
          fim,
          ocupacoes
        }
      });
    } catch (err) {
      return next(err);
    }
  }
);

// GET /api/formacoes — público
router.get(
  '/',
  async (req, res, next) => {
    try {
      const {
        status,
        disponiveis
      } = req.query;

      let sql =
        'SELECT * FROM formacoes WHERE 1=1';

      const params = [];

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (disponiveis) {
        sql +=
          " AND vagas_disponiveis > 0 AND status = 'aberta'";
      }

      sql +=
        ' ORDER BY data_inicio DESC';

      const [rows] =
        await db.query(
          sql,
          params
        );

      return res.json({
        ok: true,
        data:
          rows.map(
            normalizarFormacao
          )
      });
    } catch (err) {
      return next(err);
    }
  }
);

// GET /api/formacoes/:id — público
router.get(
  '/:id',
  async (req, res, next) => {
    try {
      const [rows] =
        await db.query(
          `SELECT *
           FROM formacoes
           WHERE id = ?
           LIMIT 1`,
          [req.params.id]
        );

      if (!rows.length) {
        return res.status(404).json({
          ok: false,
          erro:
            'Formação não encontrada.'
        });
      }

      return res.json({
        ok: true,
        data:
          normalizarFormacao(
            rows[0]
          )
      });
    } catch (err) {
      return next(err);
    }
  }
);

// POST /api/formacoes
// Somente Admin e Coordenador criam formação diretamente.
// A Equipe deve enviar uma proposta.
router.post(
  '/',
  auth(
    'admin',
    'coordenador'
  ),
  async (req, res, next) => {
    try {
      const dados =
        dadosDoBody(req.body);

      const erro =
        validarDados(dados);

      if (erro) {
        return res.status(400).json({
          ok: false,
          erro
        });
      }

      const horario =
        montarHorarioResumo(dados);

      const [resultado] =
        await db.query(
          `INSERT INTO formacoes (
            titulo,
            descricao,
            proposito,
            conteudo_programatico,
            setor_demandante,
            carga_horaria,
            data_inicio,
            data_fim,
            horario,
            local,
            publico,
            onibus,
            vagas,
            vagas_disponiveis,
            instrutor,
            responsavel_nome,
            responsavel_telefone,
            responsavel_email,
            repete,
            outras_datas,
            turnos,
            qtd_manha,
            qtd_tarde,
            qtd_noite,
            hora_inicio_manha,
            hora_fim_manha,
            hora_inicio_tarde,
            hora_fim_tarde,
            hora_inicio_noite,
            hora_fim_noite,
            hora_chegada,
            equipamentos,
            layout_cadeiras,
            mesas,
            qtd_mesas,
            acessibilidade,
            coffee,
            convidados_especiais,
            observacoes,
            status
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?
          )`,
          [
            dados.titulo,
            dados.proposito,
            dados.proposito,
            dados.conteudoProgramatico,
            dados.setorDemandante,
            dados.cargaHoraria,
            dados.dataInicio,
            dados.dataFim,
            horario,
            dados.local,
            dados.publico,
            dados.onibus,
            dados.vagas,
            dados.vagas,
            dados.responsavelNome,
            dados.responsavelNome,
            dados.responsavelTelefone,
            dados.responsavelEmail,
            dados.repete,
            dados.outrasDatas,
            JSON.stringify(
              dados.turnos
            ),
            dados.qtdManha,
            dados.qtdTarde,
            dados.qtdNoite,
            dados.horaInicioManha,
            dados.horaFimManha,
            dados.horaInicioTarde,
            dados.horaFimTarde,
            dados.horaInicioNoite,
            dados.horaFimNoite,
            dados.horaChegada,
            JSON.stringify(
              dados.equipamentos
            ),
            dados.layoutCadeiras,
            dados.mesas,
            dados.qtdMesas,
            dados.acessibilidade,
            dados.coffee,
            dados.convidadosEspeciais,
            dados.observacoes,
            dados.status
          ]
        );

      return res.status(201).json({
        ok: true,
        id: resultado.insertId
      });
    } catch (err) {
      return next(err);
    }
  }
);

// PUT /api/formacoes/:id
router.put(
  '/:id',
  auth(
    'admin',
    'coordenador'
  ),
  async (req, res, next) => {
    const conn =
      await db.getConnection();

    try {
      const dados =
        dadosDoBody(req.body);

      const erro =
        validarDados(dados);

      if (erro) {
        return res.status(400).json({
          ok: false,
          erro
        });
      }

      await conn.beginTransaction();

      const [existentes] =
        await conn.query(
          `SELECT id
           FROM formacoes
           WHERE id = ?
           FOR UPDATE`,
          [req.params.id]
        );

      if (!existentes.length) {
        await conn.rollback();

        return res.status(404).json({
          ok: false,
          erro:
            'Formação não encontrada.'
        });
      }

      const [inscricoes] =
        await conn.query(
          `SELECT COUNT(*) AS total
           FROM inscricoes
           WHERE formacao_id = ?
             AND status <> 'cancelada'`,
          [req.params.id]
        );

      const ocupadas =
        Number(
          inscricoes[0]?.total || 0
        );

      const vagasDisponiveis =
        Math.max(
          dados.vagas - ocupadas,
          0
        );

      const horario =
        montarHorarioResumo(dados);

      await conn.query(
        `UPDATE formacoes
         SET
           titulo = ?,
           descricao = ?,
           proposito = ?,
           conteudo_programatico = ?,
           setor_demandante = ?,
           carga_horaria = ?,
           data_inicio = ?,
           data_fim = ?,
           horario = ?,
           local = ?,
           publico = ?,
           onibus = ?,
           vagas = ?,
           vagas_disponiveis = ?,
           instrutor = ?,
           responsavel_nome = ?,
           responsavel_telefone = ?,
           responsavel_email = ?,
           repete = ?,
           outras_datas = ?,
           turnos = ?,
           qtd_manha = ?,
           qtd_tarde = ?,
           qtd_noite = ?,
           hora_inicio_manha = ?,
           hora_fim_manha = ?,
           hora_inicio_tarde = ?,
           hora_fim_tarde = ?,
           hora_inicio_noite = ?,
           hora_fim_noite = ?,
           hora_chegada = ?,
           equipamentos = ?,
           layout_cadeiras = ?,
           mesas = ?,
           qtd_mesas = ?,
           acessibilidade = ?,
           coffee = ?,
           convidados_especiais = ?,
           observacoes = ?,
           status = ?
         WHERE id = ?`,
        [
          dados.titulo,
          dados.proposito,
          dados.proposito,
          dados.conteudoProgramatico,
          dados.setorDemandante,
          dados.cargaHoraria,
          dados.dataInicio,
          dados.dataFim,
          horario,
          dados.local,
          dados.publico,
          dados.onibus,
          dados.vagas,
          vagasDisponiveis,
          dados.responsavelNome,
          dados.responsavelNome,
          dados.responsavelTelefone,
          dados.responsavelEmail,
          dados.repete,
          dados.outrasDatas,
          JSON.stringify(
            dados.turnos
          ),
          dados.qtdManha,
          dados.qtdTarde,
          dados.qtdNoite,
          dados.horaInicioManha,
          dados.horaFimManha,
          dados.horaInicioTarde,
          dados.horaFimTarde,
          dados.horaInicioNoite,
          dados.horaFimNoite,
          dados.horaChegada,
          JSON.stringify(
            dados.equipamentos
          ),
          dados.layoutCadeiras,
          dados.mesas,
          dados.qtdMesas,
          dados.acessibilidade,
          dados.coffee,
          dados.convidadosEspeciais,
          dados.observacoes,
          dados.status,
          req.params.id
        ]
      );

      await conn.commit();

      return res.json({
        ok: true
      });
    } catch (err) {
      await conn.rollback();
      return next(err);
    } finally {
      conn.release();
    }
  }
);

// DELETE /api/formacoes/:id
// Exclusão institucional exclusiva do Admin.
router.delete(
  '/:id',
  auth('admin'),
  async (req, res, next) => {
    try {
      const [resultado] =
        await db.query(
          `DELETE FROM formacoes
           WHERE id = ?`,
          [req.params.id]
        );

      if (!resultado.affectedRows) {
        return res.status(404).json({
          ok: false,
          erro:
            'Formação não encontrada.'
        });
      }

      return res.json({
        ok: true
      });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;