import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TURNOS_FORMACAO } from '../../utils/formacaoForm';
import api from '../../api';

const ESPACOS_PLANILHA = [
  {
    id: 'carolina',
    nome: 'Auditório Carolina Mª de Jesus e banheiros',
    capacidade: '130 pessoas — escolar',
    turnos: ['manha', 'tarde']
  },
  {
    id: 'lelia',
    nome: 'Auditório Lélia Gonzalez',
    capacidade: '350 pessoas — escolar',
    turnos: ['manha', 'tarde']
  },
  {
    id: 'atelie-linguagens',
    nome: 'Sala Ateliê das Linguagens e banheiro',
    capacidade: '50 pessoas — escolar',
    turnos: ['manha', 'tarde', 'noite']
  },
  {
    id: 'atelier-sabor',
    nome: 'Atelier do Sabor',
    capacidade: '',
    turnos: ['manha', 'tarde', 'noite']
  },
  {
    id: 'cozinha-experimental',
    nome: 'Cozinha Experimental',
    capacidade: '',
    turnos: ['manha', 'tarde']
  },
  {
    id: 'biblioteca',
    nome: 'Biblioteca',
    capacidade: '',
    turnos: ['manha', 'tarde']
  },
  {
    id: 'clube-linguagens',
    nome: 'Clube Linguagens',
    capacidade: '',
    turnos: ['manha', 'tarde']
  },
  {
    id: 'clube-inovacao',
    nome: 'Clube Inovação',
    capacidade: '',
    turnos: ['manha', 'tarde']
  },
  {
    id: 'sala-maker',
    nome: 'Sala Maker / Clube Maker e Robótica',
    capacidade: '',
    turnos: ['manha', 'tarde']
  },
  {
    id: 'remida',
    nome: 'Remida',
    capacidade: '',
    turnos: ['manha', 'tarde']
  },
  {
    id: 'sala-trabalho-2',
    nome: 'Sala de Trabalho 2',
    capacidade: '',
    turnos: ['manha', 'tarde']
  }
];

const ROTULOS_DIAS = [
  '2ª feira',
  '3ª feira',
  '4ª feira',
  '5ª feira',
  '6ª feira',
  'sábado'
];

const ROTULOS_TURNOS = Object.fromEntries(
  TURNOS_FORMACAO.map(turno => [
    turno.id,
    turno.label
  ])
);

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ªº]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dataLocal(dataIso) {
  const [ano, mes, dia] = String(dataIso)
    .split('-')
    .map(Number);

  return new Date(
    ano,
    mes - 1,
    dia,
    12
  );
}

function dataIso(data) {
  const ano = data.getFullYear();

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, '0');

  const dia = String(
    data.getDate()
  ).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function inicioDaSemana(data = new Date()) {
  const copia = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    12
  );

  const dia = copia.getDay();

  const diferenca =
    dia === 0
      ? -6
      : 1 - dia;

  copia.setDate(
    copia.getDate() + diferenca
  );

  return copia;
}

function somarDias(data, quantidade) {
  const copia = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    12
  );

  copia.setDate(
    copia.getDate() + quantidade
  );

  return copia;
}

function formatarDataCurta(dataIsoValor) {
  return dataLocal(
    dataIsoValor
  ).toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit'
    }
  );
}

function formatarPeriodo(inicio, fim) {
  const inicioData = dataLocal(inicio);
  const fimData = dataLocal(fim);

  if (
    inicioData.getMonth()
    === fimData.getMonth()
  ) {
    return `${String(
      inicioData.getDate()
    ).padStart(
      2,
      '0'
    )} a ${String(
      fimData.getDate()
    ).padStart(
      2,
      '0'
    )} de ${fimData.toLocaleDateString(
      'pt-BR',
      {
        month: 'long',
        year: 'numeric'
      }
    )}`;
  }

  return `${inicioData.toLocaleDateString(
    'pt-BR'
  )} a ${fimData.toLocaleDateString(
    'pt-BR'
  )}`;
}

function horarioTurno(
  ocupacao,
  turno
) {
  const horario =
    ocupacao.horarios?.[turno];

  if (
    !horario?.inicio
    && !horario?.fim
  ) {
    return '';
  }

  if (
    horario.inicio
    && horario.fim
  ) {
    return `${
      horario.inicio.replace(
        ':00',
        'h'
      )
    }–${
      horario.fim.replace(
        ':00',
        'h'
      )
    }`;
  }

  return (
    horario.inicio
    || horario.fim
    || ''
  ).replace(
    ':00',
    'h'
  );
}

function quantidadeTurno(
  ocupacao,
  turno
) {
  const quantidade = Number(
    ocupacao.participantes?.[turno]
    || 0
  );

  if (quantidade > 0) {
    return quantidade;
  }

  const vagas = Number(
    ocupacao.vagas || 0
  );

  return vagas > 0
    ? vagas
    : 0;
}

function equipamentosTexto(
  equipamentos = {}
) {
  const ativo = valor =>
    valor === true
    || valor === 'true'
    || Number(valor) > 0;

  const datashow = ativo(
    equipamentos.datashow
  );

  const som = ativo(
    equipamentos.som
  );

  const microfone = ativo(
    equipamentos.microfone
  );

  if (
    datashow
    && som
    && microfone
  ) {
    return 'todos os equipamentos';
  }

  const itens = [];

  if (
    ativo(equipamentos.notebook)
  ) {
    itens.push('notebook');
  }

  if (datashow) {
    itens.push('datashow');
  }

  if (som) {
    itens.push('som');
  }

  if (microfone) {
    itens.push('microfone');
  }

  return itens.join(', ');
}

function idsEspacosDoLocal(local) {
  const texto =
    normalizarTexto(local);

  const ids = new Set();

  if (!texto) {
    return [];
  }

  if (
    texto.includes('carolina')
  ) {
    ids.add('carolina');
  }

  if (
    texto.includes('lelia')
  ) {
    ids.add('lelia');
  }

  if (
    texto.includes('cozinha')
  ) {
    ids.add(
      'cozinha-experimental'
    );
  }

  if (
    texto.includes('biblioteca')
  ) {
    ids.add('biblioteca');
  }

  if (
    texto.includes('remida')
  ) {
    ids.add('remida');
  }

  if (
    texto.includes(
      'sala de trabalho 2'
    )
  ) {
    ids.add(
      'sala-trabalho-2'
    );
  }

  if (
    texto.includes(
      'atelie linguagens'
    )
    || texto.includes(
      'atelie das linguagens'
    )
  ) {
    ids.add(
      'atelie-linguagens'
    );
  }

  if (
    texto.includes('sabor')
  ) {
    ids.add('atelier-sabor');
  }

  if (
    texto.includes('inovacao')
  ) {
    ids.add('clube-inovacao');
  }

  if (
    texto.includes('maker')
  ) {
    ids.add('sala-maker');
  }

  if (
    texto.includes(
      'clube linguagens'
    )
    || (
      texto.includes(
        'linguagens'
      )
      && !texto.includes(
        'atelie'
      )
    )
  ) {
    ids.add(
      'clube-linguagens'
    );
  }

  if (
    texto.includes(
      'clubes e atelies'
    )
  ) {
    ids.add(
      'clube-linguagens'
    );

    ids.add(
      'clube-inovacao'
    );

    ids.add(
      'sala-maker'
    );

    ids.add(
      'atelie-linguagens'
    );

    ids.add(
      'atelier-sabor'
    );
  } else if (
    texto.includes('clubes')
  ) {
    ids.add(
      'clube-linguagens'
    );

    ids.add(
      'clube-inovacao'
    );
  }

  return [...ids];
}

function linkMarcacao(tipo) {
  if (tipo === 'equipe') {
    return '/equipe/agendar-formacao';
  }

  if (tipo === 'coordenador') {
    return '/coordenador/agendar-formacao';
  }

  return '/admin/agendar-formacao';
}

export default function AgendaSemanal() {
  const { user } = useAuth();
  const toast = useToast();

  const [
    inicioSemana,
    setInicioSemana
  ] = useState(
    () => inicioDaSemana()
  );

  const [
    ocupacoes,
    setOcupacoes
  ] = useState([]);

  const [
    carregando,
    setCarregando
  ] = useState(true);

  const [
    espacoFiltro,
    setEspacoFiltro
  ] = useState('');

  const [
    busca,
    setBusca
  ] = useState('');

  /*
   * Barras de rolagem horizontal.
   *
   * A barra superior e a rolagem
   * original da tabela trabalham
   * de forma sincronizada.
   */
  const scrollSuperiorRef =
    useRef(null);

  const scrollTabelaRef =
    useRef(null);

  const conteudoScrollSuperiorRef =
    useRef(null);

  const dias = useMemo(
    () =>
      Array.from(
        {
          length: 6
        },
        (_, indice) =>
          dataIso(
            somarDias(
              inicioSemana,
              indice
            )
          )
      ),
    [inicioSemana]
  );

  const inicio = dias[0];
  const fim = dias[5];

  const carregarAgenda =
    useCallback(
      async () => {
        try {
          setCarregando(true);

          const { data } =
            await api.get(
              '/formacoes/agenda-semanal',
              {
                params: {
                  inicio,
                  fim
                }
              }
            );

          setOcupacoes(
            data.data?.ocupacoes
            || []
          );
        } catch (err) {
          toast(
            err.response?.data?.erro
            || 'Erro ao carregar a agenda semanal.',
            'erro'
          );

          setOcupacoes([]);
        } finally {
          setCarregando(false);
        }
      },
      [
        inicio,
        fim,
        toast
      ]
    );

  useEffect(() => {
    carregarAgenda();
  }, [carregarAgenda]);

  const espacos = useMemo(
    () => {
      const extras = [];

      const conhecidos =
        new Set(
          ESPACOS_PLANILHA.map(
            espaco =>
              espaco.id
          )
        );

      for (
        const ocupacao
        of ocupacoes
      ) {
        if (
          idsEspacosDoLocal(
            ocupacao.espaco
          ).length
        ) {
          continue;
        }

        const nome = String(
          ocupacao.espaco || ''
        ).trim();

        if (!nome) {
          continue;
        }

        const id =
          `extra-${
            normalizarTexto(
              nome
            ).replace(
              /\s+/g,
              '-'
            )
          }`;

        if (
          conhecidos.has(id)
        ) {
          continue;
        }

        conhecidos.add(id);

        extras.push({
          id,
          nome,
          capacidade: '',
          turnos: [
            'manha',
            'tarde',
            'noite'
          ],
          localOriginal: nome
        });
      }

      return [
        ...ESPACOS_PLANILHA,
        ...extras
      ];
    },
    [ocupacoes]
  );

  const mapaOcupacoes =
    useMemo(
      () => {
        const mapa =
          new Map();

        for (
          const ocupacao
          of ocupacoes
        ) {
          let ids =
            idsEspacosDoLocal(
              ocupacao.espaco
            );

          if (
            !ids.length
            && ocupacao.espaco
          ) {
            ids = [
              `extra-${
                normalizarTexto(
                  ocupacao.espaco
                ).replace(
                  /\s+/g,
                  '-'
                )
              }`
            ];
          }

          for (
            const espacoId
            of ids
          ) {
            for (
              const turno
              of ocupacao.turnos
              || []
            ) {
              const chave =
                `${espacoId}|${ocupacao.data}|${turno}`;

              const existentes =
                mapa.get(chave)
                || [];

              existentes.push(
                ocupacao
              );

              mapa.set(
                chave,
                existentes
              );
            }
          }
        }

        return mapa;
      },
      [ocupacoes]
    );

  const espacosVisiveis =
    useMemo(
      () => {
        const termo =
          normalizarTexto(
            busca
          );

        return espacos.filter(
          espaco => {
            const correspondeFiltro =
              !espacoFiltro
              || espaco.id
                === espacoFiltro;

            const alvo =
              normalizarTexto(
                `${espaco.nome} ${espaco.capacidade}`
              );

            const correspondeBusca =
              !termo
              || alvo.includes(
                termo
              );

            return (
              correspondeFiltro
              && correspondeBusca
            );
          }
        );
      },
      [
        espacos,
        espacoFiltro,
        busca
      ]
    );

  const resumo = useMemo(
    () => {
      let total = 0;
      let ocupados = 0;
      let conflitos = 0;

      for (
        const espaco
        of espacos
      ) {
        for (
          const turno
          of espaco.turnos
        ) {
          for (
            const dia
            of dias
          ) {
            total += 1;

            const quantidade =
              (
                mapaOcupacoes.get(
                  `${espaco.id}|${dia}|${turno}`
                )
                || []
              ).length;

            if (
              quantidade > 0
            ) {
              ocupados += 1;
            }

            if (
              quantidade > 1
            ) {
              conflitos += 1;
            }
          }
        }
      }

      return {
        total,
        ocupados,
        livres: Math.max(
          total - ocupados,
          0
        ),
        conflitos
      };
    },
    [
      dias,
      espacos,
      mapaOcupacoes
    ]
  );

  /*
   * Ajusta automaticamente a largura
   * da barra superior para exatamente
   * a largura real da tabela.
   *
   * Isso evita definir uma largura fixa
   * manualmente.
   */
  useEffect(() => {
    if (carregando) {
      return undefined;
    }

    const scrollTabela =
      scrollTabelaRef.current;

    const conteudoSuperior =
      conteudoScrollSuperiorRef.current;

    if (
      !scrollTabela
      || !conteudoSuperior
    ) {
      return undefined;
    }

    const atualizarLargura =
      () => {
        conteudoSuperior.style.width =
          `${scrollTabela.scrollWidth}px`;
      };

    atualizarLargura();

    const tabela =
      scrollTabela.querySelector(
        'table'
      );

    let observador = null;

    if (
      typeof ResizeObserver
      !== 'undefined'
    ) {
      observador =
        new ResizeObserver(
          atualizarLargura
        );

      observador.observe(
        scrollTabela
      );

      if (tabela) {
        observador.observe(
          tabela
        );
      }
    }

    window.addEventListener(
      'resize',
      atualizarLargura
    );

    return () => {
      if (observador) {
        observador.disconnect();
      }

      window.removeEventListener(
        'resize',
        atualizarLargura
      );
    };
  }, [
    carregando,
    espacosVisiveis,
    dias
  ]);

  function mudarSemana(
    quantidadeDias
  ) {
    setInicioSemana(
      atual =>
        somarDias(
          atual,
          quantidadeDias
        )
    );
  }

  function irParaSemanaAtual() {
    setInicioSemana(
      inicioDaSemana()
    );
  }

  /*
   * Quando a barra superior é movida,
   * movimenta a tabela.
   */
  function rolarPeloTopo(event) {
    if (
      scrollTabelaRef.current
    ) {
      scrollTabelaRef.current.scrollLeft =
        event.currentTarget.scrollLeft;
    }
  }

  /*
   * Quando a tabela é movida pela barra
   * inferior, acompanha a barra superior.
   */
  function rolarPelaTabela(event) {
    if (
      scrollSuperiorRef.current
    ) {
      scrollSuperiorRef.current.scrollLeft =
        event.currentTarget.scrollLeft;
    }
  }

  return (
    <PainelLayout titulo="Agenda Semanal">
      <section className="agenda-planilha-cabecalho">
        <div>
          <span className="agenda-planilha-etiqueta">
            Reserva e disponibilidade dos espaços
          </span>

          <h1>
            Agenda semanal por espaço reservado
          </h1>

          <p>
            A organização segue a planilha de programação:
            cada espaço é dividido por turno e por dia da
            semana.
          </p>
        </div>

        {user?.tipo !== 'equipe' && (
          <div className="agenda-planilha-acoes">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                window.print()
              }
            >
              Imprimir agenda
            </button>

            <Link
              className="btn btn-primario"
              to={linkMarcacao(
                user?.tipo
              )}
            >
              ＋ Nova Formação
            </Link>
          </div>
        )}
      </section>

      <section className="agenda-planilha-controles card">
        <div className="agenda-planilha-navegacao">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() =>
              mudarSemana(-7)
            }
          >
            ← Semana anterior
          </button>

          <div className="agenda-planilha-periodo">
            <strong>
              {formatarPeriodo(
                inicio,
                fim
              )}
            </strong>

            <span>
              segunda-feira a sábado
            </span>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() =>
              mudarSemana(7)
            }
          >
            Próxima semana →
          </button>

          <button
            type="button"
            className="btn btn-secundario btn-sm"
            onClick={
              irParaSemanaAtual
            }
          >
            Semana atual
          </button>
        </div>

        <div className="agenda-planilha-filtros">
          <div className="campo">
            <label htmlFor="agenda-busca">
              Buscar espaço
            </label>

            <input
              id="agenda-busca"
              value={busca}
              onChange={event =>
                setBusca(
                  event.target.value
                )
              }
              placeholder="Nome do espaço"
            />
          </div>

          <div className="campo">
            <label htmlFor="agenda-espaco">
              Exibir espaço
            </label>

            <select
              id="agenda-espaco"
              value={espacoFiltro}
              onChange={event =>
                setEspacoFiltro(
                  event.target.value
                )
              }
            >
              <option value="">
                Todos os espaços
              </option>

              {espacos.map(
                espaco => (
                  <option
                    key={espaco.id}
                    value={espaco.id}
                  >
                    {espaco.nome}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      <section
        className="agenda-planilha-resumo"
        aria-label="Resumo da semana"
      >
        <span>
          <b>
            {resumo.livres}
          </b>{' '}
          períodos livres
        </span>

        <span>
          <b>
            {resumo.ocupados}
          </b>{' '}
          períodos ocupados
        </span>

        <span
          className={
            resumo.conflitos
              ? 'com-conflito'
              : ''
          }
        >
          <b>
            {resumo.conflitos}
          </b>{' '}
          conflitos
        </span>

        <span>
          <b>
            {espacos.length}
          </b>{' '}
          espaços acompanhados
        </span>
      </section>

      <section className="agenda-planilha-area-impressao">
        <div className="agenda-planilha-impressao-titulo">
          <strong>
            PROGRAMAÇÃO SEMANAL
          </strong>

          <span>
            {formatarPeriodo(
              inicio,
              fim
            )}
          </span>
        </div>

        <section className="agenda-planilha-tabela-card card">
          {carregando ? (
            <div className="agenda-planilha-estado">
              Carregando a agenda...
            </div>
          ) : espacosVisiveis.length === 0 ? (
            <div className="agenda-planilha-estado">
              Nenhum espaço corresponde aos filtros
              selecionados.
            </div>
          ) : (
            <>
              {/*
               * ROLAGEM HORIZONTAL SUPERIOR
               */}
              <div
                ref={
                  scrollSuperiorRef
                }
                className="agenda-planilha-scroll-superior"
                onScroll={
                  rolarPeloTopo
                }
                aria-label="Rolagem horizontal superior da agenda"
                style={{
                  width: '100%',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  height: '18px'
                }}
              >
                <div
                  ref={
                    conteudoScrollSuperiorRef
                  }
                  className="agenda-planilha-scroll-superior-conteudo"
                  style={{
                    height: '1px'
                  }}
                />
              </div>

              {/*
               * TABELA E ROLAGEM ORIGINAL
               */}
              <div
                ref={
                  scrollTabelaRef
                }
                className="agenda-planilha-scroll"
                onScroll={
                  rolarPelaTabela
                }
              >
                <table className="agenda-planilha-tabela">
                  <thead>
                    <tr>
                      <th className="agenda-planilha-coluna-turno">
                        TURNO
                      </th>

                      <th className="agenda-planilha-coluna-espaco">
                        Nome do Espaço e Capacidade
                      </th>

                      {dias.map(
                        (
                          dia,
                          indice
                        ) => (
                          <th
                            key={dia}
                            className={
                              dia
                                === dataIso(
                                  new Date()
                                )
                                ? 'agenda-planilha-dia-atual'
                                : ''
                            }
                          >
                            <span>
                              {
                                ROTULOS_DIAS[
                                  indice
                                ]
                              }
                            </span>

                            <b>
                              {
                                formatarDataCurta(
                                  dia
                                )
                              }
                            </b>
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {espacosVisiveis.map(
                      espaco =>
                        espaco.turnos.map(
                          (
                            turno,
                            indiceTurno
                          ) => (
                            <tr
                              className="agenda-planilha-linha"
                              key={`${espaco.id}-${turno}`}
                            >
                              <th
                                className={`agenda-planilha-turno agenda-planilha-turno-${turno}`}
                                scope="row"
                              >
                                {
                                  ROTULOS_TURNOS[
                                    turno
                                  ]
                                  || turno
                                }
                              </th>

                              {indiceTurno
                                === 0 && (
                                <th
                                  className="agenda-planilha-espaco"
                                  rowSpan={
                                    espaco
                                      .turnos
                                      .length
                                  }
                                  scope="rowgroup"
                                >
                                  <strong>
                                    {
                                      espaco.nome
                                    }
                                  </strong>

                                  {espaco.capacidade && (
                                    <small>
                                      (
                                      {
                                        espaco.capacidade
                                      }
                                      )
                                    </small>
                                  )}
                                </th>
                              )}

                              {dias.map(
                                dia => {
                                  const chave =
                                    `${espaco.id}|${dia}|${turno}`;

                                  const marcacoes =
                                    mapaOcupacoes.get(
                                      chave
                                    )
                                    || [];

                                  const conflito =
                                    marcacoes.length
                                    > 1;

                                  return (
                                    <td
                                      key={
                                        chave
                                      }
                                      className={`agenda-planilha-celula ${
                                        marcacoes.length
                                          ? 'ocupada'
                                          : 'livre'
                                      }${
                                        conflito
                                          ? ' conflito'
                                          : ''
                                      }${
                                        dia
                                          === dataIso(
                                            new Date()
                                          )
                                          ? ' hoje'
                                          : ''
                                      }`}
                                    >
                                      {marcacoes.length
                                        === 0 ? (
                                        <span className="agenda-planilha-livre-texto">
                                          Livre
                                          para
                                          marcação
                                        </span>
                                      ) : (
                                        <div className="agenda-planilha-reservas">
                                          {conflito && (
                                            <span className="agenda-planilha-conflito-aviso">
                                              CONFLITO
                                            </span>
                                          )}

                                          {marcacoes.map(
                                            marcacao => {
                                              const horario =
                                                horarioTurno(
                                                  marcacao,
                                                  turno
                                                );

                                              const quantidade =
                                                quantidadeTurno(
                                                  marcacao,
                                                  turno
                                                );

                                              const equipamentos =
                                                equipamentosTexto(
                                                  marcacao.equipamentos
                                                );

                                              return (
                                                <article
                                                  className="agenda-planilha-reserva"
                                                  key={`${marcacao.id}-${dia}-${turno}`}
                                                >
                                                  <strong>
                                                    {horario
                                                      && `${horario} `}

                                                    {
                                                      marcacao.titulo
                                                    }

                                                    {quantidade
                                                      > 0
                                                      && ` — ${quantidade}p`}
                                                  </strong>

                                                  {marcacao.setor && (
                                                    <span>
                                                      {
                                                        marcacao.setor
                                                      }
                                                    </span>
                                                  )}

                                                  {equipamentos && (
                                                    <small>
                                                      (
                                                      {
                                                        equipamentos
                                                      }
                                                      )
                                                    </small>
                                                  )}
                                                </article>
                                              );
                                            }
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                }
                              )}
                            </tr>
                          )
                        )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </section>

      <div className="agenda-planilha-legenda">
        <span>
          <i className="manha" /> Manhã
        </span>

        <span>
          <i className="tarde" /> Tarde
        </span>

        <span>
          <i className="noite" /> Noite
        </span>

        <span>
          <i className="livre" /> Livre
        </span>

        <span>
          <i className="ocupada" /> Reservado
        </span>

        <span>
          <i className="conflito" /> Conflito
        </span>
      </div>

      <p className="agenda-planilha-observacao">
        Locais combinados, como “Carolina e Lélia” ou
        “Ateliê Linguagens e Sabor”, bloqueiam
        automaticamente todos os espaços envolvidos.
      </p>
    </PainelLayout>
  );
}