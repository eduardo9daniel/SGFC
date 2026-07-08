import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useSearchParams
} from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

const naturezasPesquisa = [
  '',
  'Mestrado',
  'Doutorado',
  'Pós-doutorado'
];

export default function AdminBiblioteca() {
  const toast = useToast();

  const [
    searchParams,
    setSearchParams
  ] = useSearchParams();

  const [abaAtiva, setAbaAtiva] = useState(
    searchParams.get('aba') === 'pesquisas'
      ? 'pesquisas'
      : 'biblioteca'
  );

  const [visualizacao, setVisualizacao] =
    useState(null);

  // =========================================================
  // CONFIGURAÇÕES DA PAGINAÇÃO
  // =========================================================

  const itensPorPagina = 10;
  const paginasPorBloco = 10;

  // =========================================================
  // ESTADOS DA BIBLIOTECA
  // =========================================================

  const [itens, setItens] = useState([]);

  const [
    loadingBiblioteca,
    setLoadingBiblioteca
  ] = useState(true);

  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);

  // =========================================================
  // ESTADOS DAS PESQUISAS
  // =========================================================

  const [
    pesquisadores,
    setPesquisadores
  ] = useState([]);

  const [
    loadingPesquisas,
    setLoadingPesquisas
  ] = useState(true);

  const [
    buscaPesquisa,
    setBuscaPesquisa
  ] = useState('');

  const [
    naturezaPesquisa,
    setNaturezaPesquisa
  ] = useState('');

  const [
    paginaPesquisa,
    setPaginaPesquisa
  ] = useState(1);

  // =========================================================
  // VISUALIZAÇÃO
  // =========================================================

  function abrirVisualizacao(tipo, item) {
    setVisualizacao({
      tipo,
      item
    });
  }

  function fecharVisualizacao() {
    setVisualizacao(null);
  }

  useEffect(() => {
    function fecharComEsc(evento) {
      if (evento.key === 'Escape') {
        fecharVisualizacao();
      }
    }

    window.addEventListener(
      'keydown',
      fecharComEsc
    );

    return () => {
      window.removeEventListener(
        'keydown',
        fecharComEsc
      );
    };
  }, []);

  // =========================================================
  // CARREGAMENTO DA BIBLIOTECA
  // =========================================================

  async function carregarBiblioteca() {
    try {
      setLoadingBiblioteca(true);

      const { data } = await api.get(
        '/admin/biblioteca'
      );

      setItens(data.data || []);
    } catch (err) {
      toast(
        err.response?.data?.erro ||
          'Erro ao carregar a biblioteca.',
        'erro'
      );

      setItens([]);
    } finally {
      setLoadingBiblioteca(false);
    }
  }

  // =========================================================
  // EXCLUSÃO DE ITEM DA BIBLIOTECA
  // =========================================================

  async function excluirItemBiblioteca(id) {
    const confirmou = window.confirm(
      'Deseja excluir este item da biblioteca?'
    );

    if (!confirmou) return;

    try {
      await api.delete(
        `/admin/biblioteca/${id}`
      );

      setItens(listaAtual =>
        listaAtual.filter(
          item => item.id !== id
        )
      );

      toast('Item excluído com sucesso.');
    } catch (err) {
      toast(
        err.response?.data?.erro ||
          'Erro ao excluir item.',
        'erro'
      );
    }
  }

  // =========================================================
  // TIPOS DE TRABALHO
  // =========================================================

  const tiposBiblioteca = [
    ...new Set(
      itens
        .map(item => item.tipo_trabalho)
        .filter(Boolean)
    )
  ];

  // =========================================================
  // RESUMO DA BIBLIOTECA
  // =========================================================

  const resumoBiblioteca = useMemo(() => {
    const total = itens.length;

    const comDocumento = itens.filter(item =>
      Boolean(item.link_documento?.trim())
    ).length;

    const comLattes = itens.filter(item =>
      Boolean(item.link_lattes?.trim())
    ).length;

    const porTipo = itens.reduce(
      (acumulador, item) => {
        const chave =
          item.tipo_trabalho?.trim() ||
          'Não informado';

        acumulador[chave] =
          (acumulador[chave] || 0) + 1;

        return acumulador;
      },
      {}
    );

    const porTipoOrdenado = Object.fromEntries(
      Object.entries(porTipo).sort(
        ([tipoA], [tipoB]) =>
          tipoA.localeCompare(
            tipoB,
            'pt-BR',
            {
              sensitivity: 'base'
            }
          )
      )
    );

    return {
      total,
      comDocumento,
      comLattes,
      porTipo: porTipoOrdenado
    };
  }, [itens]);

  // =========================================================
  // FILTRO DA BIBLIOTECA
  // =========================================================

  const itensFiltrados = itens.filter(item => {
    const texto = `
      ${item.titulo || ''}
      ${item.autor || ''}
      ${item.cargo || ''}
      ${item.instituicao || ''}
      ${item.tipo_trabalho || ''}
    `.toLowerCase();

    const okBusca =
      !busca ||
      texto.includes(
        busca.toLowerCase()
      );

    const okTipo =
      !tipoFiltro ||
      item.tipo_trabalho === tipoFiltro;

    return okBusca && okTipo;
  });

  // =========================================================
  // PAGINAÇÃO DA BIBLIOTECA
  // =========================================================

  const totalPaginasBiblioteca = Math.ceil(
    itensFiltrados.length / itensPorPagina
  );

  const inicioBiblioteca =
    (paginaAtual - 1) * itensPorPagina;

  const fimBiblioteca =
    inicioBiblioteca + itensPorPagina;

  const itensPaginados = itensFiltrados.slice(
    inicioBiblioteca,
    fimBiblioteca
  );

  const blocoAtualBiblioteca = Math.floor(
    (paginaAtual - 1) / paginasPorBloco
  );

  const primeiraPaginaBiblioteca =
    blocoAtualBiblioteca * paginasPorBloco + 1;

  const ultimaPaginaBiblioteca = Math.min(
    primeiraPaginaBiblioteca +
      paginasPorBloco -
      1,
    totalPaginasBiblioteca
  );

  const paginasVisiveisBiblioteca =
    Array.from(
      {
        length: Math.max(
          ultimaPaginaBiblioteca -
            primeiraPaginaBiblioteca +
            1,
          0
        )
      },
      (_, index) =>
        primeiraPaginaBiblioteca + index
    );

  function irParaBlocoAnteriorBiblioteca() {
    const novaPagina = Math.max(
      primeiraPaginaBiblioteca -
        paginasPorBloco,
      1
    );

    setPaginaAtual(novaPagina);
  }

  function irParaProximoBlocoBiblioteca() {
    const novaPagina = Math.min(
      primeiraPaginaBiblioteca +
        paginasPorBloco,
      totalPaginasBiblioteca
    );

    setPaginaAtual(novaPagina);
  }

  // =========================================================
  // CARREGAMENTO DAS PESQUISAS
  // =========================================================

  async function carregarPesquisas(params = {}) {
    try {
      setLoadingPesquisas(true);

      const { data } = await api.get(
        '/admin/pesquisadores-nest',
        { params }
      );

      setPesquisadores(data.data || []);
      setPaginaPesquisa(1);
    } catch (err) {
      toast(
        err.response?.data?.erro ||
          'Erro ao carregar as pesquisas.',
        'erro'
      );

      setPesquisadores([]);
    } finally {
      setLoadingPesquisas(false);
    }
  }

  // =========================================================
  // FILTROS DAS PESQUISAS
  // =========================================================

  function pesquisarPesquisas(evento) {
    evento.preventDefault();

    setPaginaPesquisa(1);

    carregarPesquisas({
      busca: buscaPesquisa.trim(),
      natureza: naturezaPesquisa
    });
  }

  function limparFiltrosPesquisa() {
    setBuscaPesquisa('');
    setNaturezaPesquisa('');
    setPaginaPesquisa(1);

    carregarPesquisas();
  }

  // =========================================================
  // EXCLUSÃO DE PESQUISA
  // =========================================================

  async function excluirPesquisa(id) {
    const confirmou = window.confirm(
      'Tem certeza que deseja excluir esta pesquisa?'
    );

    if (!confirmou) return;

    try {
      await api.delete(
        `/admin/pesquisadores-nest/${id}`
      );

      toast('Pesquisa excluída com sucesso.');

      await carregarPesquisas({
        busca: buscaPesquisa.trim(),
        natureza: naturezaPesquisa
      });
    } catch (err) {
      toast(
        err.response?.data?.erro ||
          'Erro ao excluir pesquisa.',
        'erro'
      );
    }
  }

  // =========================================================
  // RESUMO DAS PESQUISAS
  // =========================================================

  const resumoPesquisas = useMemo(() => {
    const total = pesquisadores.length;

    const porNatureza =
      pesquisadores.reduce(
        (acumulador, item) => {
          const chave =
            item.natureza_pesquisa ||
            'Não informado';

          acumulador[chave] =
            (acumulador[chave] || 0) + 1;

          return acumulador;
        },
        {}
      );

    return {
      total,
      porNatureza
    };
  }, [pesquisadores]);

  // =========================================================
  // PAGINAÇÃO DAS PESQUISAS
  // =========================================================

  const totalPaginasPesquisas = Math.ceil(
    pesquisadores.length / itensPorPagina
  );

  const inicioPesquisa =
    (paginaPesquisa - 1) * itensPorPagina;

  const fimPesquisa =
    inicioPesquisa + itensPorPagina;

  const pesquisadoresPaginados =
    pesquisadores.slice(
      inicioPesquisa,
      fimPesquisa
    );

  const blocoAtualPesquisas = Math.floor(
    (paginaPesquisa - 1) / paginasPorBloco
  );

  const primeiraPaginaPesquisas =
    blocoAtualPesquisas *
      paginasPorBloco +
    1;

  const ultimaPaginaPesquisas = Math.min(
    primeiraPaginaPesquisas +
      paginasPorBloco -
      1,
    totalPaginasPesquisas
  );

  const paginasVisiveisPesquisas =
    Array.from(
      {
        length: Math.max(
          ultimaPaginaPesquisas -
            primeiraPaginaPesquisas +
            1,
          0
        )
      },
      (_, index) =>
        primeiraPaginaPesquisas + index
    );

  function irParaBlocoAnteriorPesquisas() {
    const novaPagina = Math.max(
      primeiraPaginaPesquisas -
        paginasPorBloco,
      1
    );

    setPaginaPesquisa(novaPagina);
  }

  function irParaProximoBlocoPesquisas() {
    const novaPagina = Math.min(
      primeiraPaginaPesquisas +
        paginasPorBloco,
      totalPaginasPesquisas
    );

    setPaginaPesquisa(novaPagina);
  }

  // =========================================================
  // AJUSTE DE PÁGINA APÓS EXCLUSÃO OU FILTRO
  // =========================================================

  useEffect(() => {
    if (
      totalPaginasBiblioteca === 0 &&
      paginaAtual !== 1
    ) {
      setPaginaAtual(1);
      return;
    }

    if (
      totalPaginasBiblioteca > 0 &&
      paginaAtual > totalPaginasBiblioteca
    ) {
      setPaginaAtual(
        totalPaginasBiblioteca
      );
    }
  }, [
    totalPaginasBiblioteca,
    paginaAtual
  ]);

  useEffect(() => {
    if (
      totalPaginasPesquisas === 0 &&
      paginaPesquisa !== 1
    ) {
      setPaginaPesquisa(1);
      return;
    }

    if (
      totalPaginasPesquisas > 0 &&
      paginaPesquisa >
        totalPaginasPesquisas
    ) {
      setPaginaPesquisa(
        totalPaginasPesquisas
      );
    }
  }, [
    totalPaginasPesquisas,
    paginaPesquisa
  ]);

  // =========================================================
  // CARREGAMENTO INICIAL
  // =========================================================

  useEffect(() => {
    carregarBiblioteca();
    carregarPesquisas();
  }, []);

  // =========================================================
  // ABA DEFINIDA PELA URL
  // =========================================================

  useEffect(() => {
    const abaUrl =
      searchParams.get('aba');

    setAbaAtiva(
      abaUrl === 'pesquisas'
        ? 'pesquisas'
        : 'biblioteca'
    );
  }, [searchParams]);

  // =========================================================
  // ALTERAÇÃO DE ABA
  // =========================================================

  function mudarAba(nomeAba) {
    setAbaAtiva(nomeAba);

    if (nomeAba === 'pesquisas') {
      setSearchParams({
        aba: 'pesquisas'
      });
    } else {
      setSearchParams({});
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  return (
    <PainelLayout titulo="Biblioteca">
      {/* Cabeçalho */}
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800
            }}
          >
            Biblioteca e Pesquisas
          </h2>

          <p
            style={{
              color: 'var(--cinza-600)',
              fontSize: '.88rem'
            }}
          >
            Gerencie os trabalhos acadêmicos e as
            pesquisas cadastradas no sistema.
          </p>
        </div>

        <div
          className="d-flex gap-8 flex-wrap"
          style={{
            alignItems: 'center'
          }}
        >
          <Link
            to="/admin/biblioteca-painel"
            className="btn btn-outline"
          >
            📊 Retornar ao Painel
          </Link>

          <a
            href="/biblioteca"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            🌐 Ver página pública
          </a>

          {abaAtiva === 'biblioteca' ? (
            <Link
              to="/admin/biblioteca/novo"
              className="btn btn-primario"
            >
              + Novo Item
            </Link>
          ) : (
            <Link
              to="/admin/biblioteca/pesquisa/nova"
              className="btn btn-primario"
            >
              + Nova Pesquisa
            </Link>
          )}
        </div>
      </div>

      {/* Abas */}
      <div
        className="mb-24"
        style={{
          display: 'flex',
          gap: 8,
          padding: 6,
          background:
            'var(--cinza-100, #f3f4f6)',
          borderRadius: 10,
          width: 'fit-content',
          maxWidth: '100%',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          className={
            abaAtiva === 'biblioteca'
              ? 'btn btn-primario'
              : 'btn btn-outline'
          }
          onClick={() =>
            mudarAba('biblioteca')
          }
        >
          📚 Trabalhos acadêmicos
        </button>

        <button
          type="button"
          className={
            abaAtiva === 'pesquisas'
              ? 'btn btn-primario'
              : 'btn btn-outline'
          }
          onClick={() =>
            mudarAba('pesquisas')
          }
        >
          🔎 Pesquisas
        </button>
      </div>

      {/* =====================================================
          ABA BIBLIOTECA
      ====================================================== */}

      {abaAtiva === 'biblioteca' && (
        <>
          {loadingBiblioteca ? (
            <Spinner />
          ) : (
            <>
              <div className="stats-grid dashboard-stats mb-24">
                <div className="stat-card dashboard-card-sombra">
                  <div className="stat-icone verde">
                    📚
                  </div>

                  <div>
                    <div className="stat-valor">
                      {resumoBiblioteca.total}
                    </div>

                    <div className="stat-label">
                      Trabalhos acadêmicos
                    </div>

                    <div className="stat-detalhe">
                      Total cadastrado no sistema
                    </div>
                  </div>
                </div>

                <div className="stat-card dashboard-card-sombra">
                  <div className="stat-icone laranja">
                    📄
                  </div>

                  <div>
                    <div className="stat-valor">
                      {resumoBiblioteca.comDocumento}
                    </div>

                    <div className="stat-label">
                      Com link do trabalho
                    </div>

                    <div className="stat-detalhe">
                      Itens com documento informado
                    </div>
                  </div>
                </div>

                <div className="stat-card dashboard-card-sombra">
                  <div className="stat-icone amarelo">
                    👤
                  </div>

                  <div>
                    <div className="stat-valor">
                      {resumoBiblioteca.comLattes}
                    </div>

                    <div className="stat-label">
                      Com link do Lattes
                    </div>

                    <div className="stat-detalhe">
                      Autores com currículo informado
                    </div>
                  </div>
                </div>

                {Object.entries(
                  resumoBiblioteca.porTipo
                ).map(([nome, total]) => (
                  <div
                    className="stat-card dashboard-card-sombra"
                    key={nome}
                  >
                    <div className="stat-icone laranja">
                      🎓
                    </div>

                    <div>
                      <div className="stat-valor">
                        {total}
                      </div>

                      <div className="stat-label">
                        {nome}
                      </div>

                      <div className="stat-detalhe">
                        Registros desse tipo
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card mb-24">
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-end',
                    flexWrap: 'wrap'
                  }}
                >
                  <div
                    className="campo"
                    style={{
                      marginBottom: 0,
                      flex: 1,
                      minWidth: 220
                    }}
                  >
                    <label>Buscar item</label>

                    <input
                      type="text"
                      placeholder="Título, autor/servidor, cargo ou instituição..."
                      value={busca}
                      onChange={evento => {
                        setBusca(
                          evento.target.value
                        );

                        setPaginaAtual(1);
                      }}
                    />
                  </div>

                  <div
                    className="campo"
                    style={{
                      marginBottom: 0,
                      minWidth: 180
                    }}
                  >
                    <label>
                      Tipo de trabalho
                    </label>

                    <select
                      value={tipoFiltro}
                      onChange={evento => {
                        setTipoFiltro(
                          evento.target.value
                        );

                        setPaginaAtual(1);
                      }}
                    >
                      <option value="">
                        Todos
                      </option>

                      {tiposBiblioteca.map(
                        tipo => (
                          <option
                            key={tipo}
                            value={tipo}
                          >
                            {tipo}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setBusca('');
                      setTipoFiltro('');
                      setPaginaAtual(1);
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {itensFiltrados.length === 0 ? (
                <div className="vazio">
                  <div className="vazio-icone">
                    📚
                  </div>

                  <p>
                    Nenhum item encontrado.
                  </p>
                </div>
              ) : (
                <div className="card p-0">
                  <div className="tabela-wrapper">
                    <table className="tabela">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Título</th>
                          <th>
                            Autor/Servidor
                          </th>
                          <th>Cargo</th>
                          <th>Instituição</th>
                          <th>Tipo</th>
                          <th>Documento</th>
                          <th>Lattes</th>
                          <th>Ações</th>
                        </tr>
                      </thead>

                      <tbody>
                        {itensPaginados.map(
                          item => (
                            <tr key={item.id}>
                              <td>
                                {item.id}
                              </td>

                              <td
                                style={{
                                  fontWeight: 600,
                                  maxWidth: 240
                                }}
                              >
                                {item.titulo}
                              </td>

                              <td>
                                {item.autor ||
                                  '-'}
                              </td>

                              <td>
                                {item.cargo ||
                                  '-'}
                              </td>

                              <td>
                                {item.instituicao ||
                                  '-'}
                              </td>

                              <td>
                                {item.tipo_trabalho ||
                                  '-'}
                              </td>

                              <td>
                                {item.link_documento ? (
                                  <a
                                    href={
                                      item.link_documento
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline btn-sm"
                                  >
                                    Abrir
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>

                              <td>
                                {item.link_lattes ? (
                                  <a
                                    href={
                                      item.link_lattes
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline btn-sm"
                                  >
                                    Lattes
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>

                              <td>
                                <div className="d-flex gap-8 flex-wrap">
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() =>
                                      abrirVisualizacao(
                                        'biblioteca',
                                        item
                                      )
                                    }
                                    aria-label={`Visualizar ${
                                      item.titulo ||
                                      'item'
                                    }`}
                                    title="Visualizar item"
                                  >
                                    👁️ Visualizar
                                  </button>

                                  <Link
                                    to={`/admin/biblioteca/novo?id=${item.id}`}
                                    className="btn btn-outline btn-sm"
                                  >
                                    ✏️ Editar
                                  </Link>

                                  <button
                                    type="button"
                                    className="btn btn-perigo btn-sm"
                                    onClick={() =>
                                      excluirItemBiblioteca(
                                        item.id
                                      )
                                    }
                                    aria-label={`Excluir ${item.titulo}`}
                                    title="Excluir item"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPaginasBiblioteca >
                    1 && (
                    <div className="paginacao">
                      <button
                        type="button"
                        className="paginacao-botao paginacao-seta"
                        onClick={
                          irParaBlocoAnteriorBiblioteca
                        }
                        disabled={
                          primeiraPaginaBiblioteca ===
                          1
                        }
                        aria-label="Páginas anteriores da biblioteca"
                        title="Páginas anteriores"
                      >
                        ‹
                      </button>

                      {paginasVisiveisBiblioteca.map(
                        numero => (
                          <button
                            type="button"
                            key={numero}
                            className={`paginacao-botao ${
                              paginaAtual ===
                              numero
                                ? 'ativo'
                                : ''
                            }`}
                            onClick={() =>
                              setPaginaAtual(
                                numero
                              )
                            }
                          >
                            {numero}
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        className="paginacao-botao paginacao-seta"
                        onClick={
                          irParaProximoBlocoBiblioteca
                        }
                        disabled={
                          ultimaPaginaBiblioteca ===
                          totalPaginasBiblioteca
                        }
                        aria-label="Próximas páginas da biblioteca"
                        title="Próximas páginas"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* =====================================================
          ABA PESQUISAS
      ====================================================== */}

      {abaAtiva === 'pesquisas' && (
        <>
          {loadingPesquisas ? (
            <Spinner />
          ) : (
            <>
              <div className="stats-grid dashboard-stats mb-24">
                <div className="stat-card dashboard-card-sombra">
                  <div className="stat-icone verde">
                    🔎
                  </div>

                  <div>
                    <div className="stat-valor">
                      {resumoPesquisas.total}
                    </div>

                    <div className="stat-label">
                      Pesquisas
                    </div>

                    <div className="stat-detalhe">
                      Total listado no sistema
                    </div>
                  </div>
                </div>

                {Object.entries(
                  resumoPesquisas.porNatureza
                ).map(([nome, total]) => (
                  <div
                    className="stat-card dashboard-card-sombra"
                    key={nome}
                  >
                    <div className="stat-icone laranja">
                      🎓
                    </div>

                    <div>
                      <div className="stat-valor">
                        {total}
                      </div>

                      <div className="stat-label">
                        {nome}
                      </div>

                      <div className="stat-detalhe">
                        Registros dessa natureza
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pesquisas-card">
                <div className="pesquisas-card-titulo">
                  <span>🔍</span>
                  Gerenciar pesquisas
                </div>

                <form
                  onSubmit={
                    pesquisarPesquisas
                  }
                  className="pesquisas-busca-form"
                >
                  <input
                    value={buscaPesquisa}
                    onChange={evento => {
                      setBuscaPesquisa(
                        evento.target.value
                      );

                      setPaginaPesquisa(1);
                    }}
                    placeholder="Buscar por nome, título, filiação ou palavra-chave"
                  />

                  <select
                    value={naturezaPesquisa}
                    onChange={evento => {
                      setNaturezaPesquisa(
                        evento.target.value
                      );

                      setPaginaPesquisa(1);
                    }}
                  >
                    {naturezasPesquisa.map(
                      item => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item ||
                            'Todas as naturezas'}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="submit"
                    className="btn btn-primario"
                  >
                    Pesquisar
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={
                      limparFiltrosPesquisa
                    }
                  >
                    Limpar
                  </button>
                </form>

                {pesquisadores.length ===
                0 ? (
                  <div className="vazio">
                    <div className="vazio-icone">
                      🔎
                    </div>

                    <p>
                      Nenhuma pesquisa encontrada.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="tabela-wrapper mt-24">
                      <table className="tabela">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Natureza</th>
                            <th>Tipo</th>
                            <th>Título</th>
                            <th>Filiação</th>
                            <th>Documento</th>
                            <th>Lattes</th>
                            <th>Ações</th>
                          </tr>
                        </thead>

                        <tbody>
                          {pesquisadoresPaginados.map(
                            item => (
                              <tr key={item.id}>
                                <td
                                  style={{
                                    fontWeight: 700
                                  }}
                                >
                                  {item.nome}
                                </td>

                                <td>
                                  {item.natureza_pesquisa ||
                                    '-'}
                                </td>

                                <td>
                                  {item.tipo_trabalho ||
                                    '-'}
                                </td>

                                <td
                                  style={{
                                    maxWidth: 360
                                  }}
                                >
                                  {item.titulo_trabalho ||
                                    '-'}
                                </td>

                                <td>
                                  {item.filiacao ||
                                    '-'}
                                </td>

                                <td>
                                  {item.link_documento ? (
                                    <a
                                      href={
                                        item.link_documento
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-outline btn-sm"
                                    >
                                      Abrir
                                    </a>
                                  ) : (
                                    '-'
                                  )}
                                </td>

                                <td>
                                  {item.link_lattes ? (
                                    <a
                                      href={
                                        item.link_lattes
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-outline btn-sm"
                                    >
                                      Lattes
                                    </a>
                                  ) : (
                                    '-'
                                  )}
                                </td>

                                <td>
                                  <div className="d-flex gap-8 flex-wrap">
                                    <button
                                      type="button"
                                      className="btn btn-outline btn-sm"
                                      onClick={() =>
                                        abrirVisualizacao(
                                          'pesquisa',
                                          item
                                        )
                                      }
                                      aria-label={`Visualizar ${
                                        item.titulo_trabalho ||
                                        'pesquisa'
                                      }`}
                                      title="Visualizar pesquisa"
                                    >
                                      👁️ Visualizar
                                    </button>

                                    <Link
                                      to={`/admin/biblioteca/pesquisa/nova?id=${item.id}`}
                                      className="btn btn-outline btn-sm"
                                    >
                                      ✏️ Editar
                                    </Link>

                                    <button
                                      type="button"
                                      className="btn btn-perigo btn-sm"
                                      onClick={() =>
                                        excluirPesquisa(
                                          item.id
                                        )
                                      }
                                    >
                                      🗑️ Excluir
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {totalPaginasPesquisas >
                      1 && (
                      <div className="paginacao">
                        <button
                          type="button"
                          className="paginacao-botao paginacao-seta"
                          onClick={
                            irParaBlocoAnteriorPesquisas
                          }
                          disabled={
                            primeiraPaginaPesquisas ===
                            1
                          }
                          aria-label="Páginas anteriores das pesquisas"
                          title="Páginas anteriores"
                        >
                          ‹
                        </button>

                        {paginasVisiveisPesquisas.map(
                          numero => (
                            <button
                              type="button"
                              key={numero}
                              className={`paginacao-botao ${
                                paginaPesquisa ===
                                numero
                                  ? 'ativo'
                                  : ''
                              }`}
                              onClick={() =>
                                setPaginaPesquisa(
                                  numero
                                )
                              }
                            >
                              {numero}
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          className="paginacao-botao paginacao-seta"
                          onClick={
                            irParaProximoBlocoPesquisas
                          }
                          disabled={
                            ultimaPaginaPesquisas ===
                            totalPaginasPesquisas
                          }
                          aria-label="Próximas páginas das pesquisas"
                          title="Próximas páginas"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* =====================================================
          MODAL DE VISUALIZAÇÃO
      ====================================================== */}

      {visualizacao && (
        <div
          onClick={fecharVisualizacao}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflowY: 'auto'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-visualizacao"
            onClick={evento =>
              evento.stopPropagation()
            }
            style={{
              width: 'min(760px, 100%)',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: 18,
              boxShadow:
                '0 24px 70px rgba(15, 23, 42, 0.3)'
            }}
          >
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                padding: '22px 24px',
                background: '#ffffff',
                borderBottom:
                  '1px solid #e5e7eb'
              }}
            >
              <div>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '.78rem',
                    fontWeight: 800,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    marginBottom: 6
                  }}
                >
                  {visualizacao.tipo ===
                  'biblioteca'
                    ? 'Item da biblioteca'
                    : 'Pesquisa'}
                </div>

                <h3
                  id="titulo-modal-visualizacao"
                  style={{
                    margin: 0,
                    color: '#111827',
                    fontSize: '1.25rem',
                    lineHeight: 1.35
                  }}
                >
                  {visualizacao.tipo ===
                  'biblioteca'
                    ? visualizacao.item.titulo ||
                      'Item sem título'
                    : visualizacao.item
                        .titulo_trabalho ||
                      'Pesquisa sem título'}
                </h3>
              </div>

              <button
                type="button"
                onClick={fecharVisualizacao}
                aria-label="Fechar visualização"
                title="Fechar"
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  border: '1px solid #d1d5db',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: '1.35rem',
                  lineHeight: 1,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: 24,
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16
              }}
            >
              {visualizacao.tipo ===
              'biblioteca' ? (
                <>
                  <CampoVisualizacao
                    rotulo="Autor/Servidor"
                    valor={
                      visualizacao.item.autor
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Cargo"
                    valor={
                      visualizacao.item.cargo
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Instituição"
                    valor={
                      visualizacao.item
                        .instituicao
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Tipo de trabalho"
                    valor={
                      visualizacao.item
                        .tipo_trabalho
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Ano"
                    valor={
                      visualizacao.item.ano ||
                      visualizacao.item
                        .ano_publicacao
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Palavras-chave"
                    valor={
                      visualizacao.item
                        .palavras_chave
                    }
                    larguraTotal
                  />

                  <CampoVisualizacao
                    rotulo="Descrição/Resumo"
                    valor={
                      visualizacao.item.descricao ||
                      visualizacao.item.resumo
                    }
                    larguraTotal
                  />
                </>
              ) : (
                <>
                  <CampoVisualizacao
                    rotulo="Pesquisador"
                    valor={
                      visualizacao.item.nome
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Natureza da pesquisa"
                    valor={
                      visualizacao.item
                        .natureza_pesquisa
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Tipo de trabalho"
                    valor={
                      visualizacao.item
                        .tipo_trabalho
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Filiação"
                    valor={
                      visualizacao.item.filiacao
                    }
                  />

                  <CampoVisualizacao
                    rotulo="Palavras-chave"
                    valor={
                      visualizacao.item
                        .palavras_chave
                    }
                    larguraTotal
                  />
                </>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 10,
                padding: '0 24px 24px'
              }}
            >
              {visualizacao.item.link_lattes && (
                <a
                  href={
                    visualizacao.item.link_lattes
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  👤 Abrir Lattes
                </a>
              )}

              {visualizacao.item
                .link_documento && (
                <a
                  href={
                    visualizacao.item
                      .link_documento
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primario"
                >
                  📄 Abrir documento
                </a>
              )}

              <button
                type="button"
                className="btn btn-outline"
                onClick={fecharVisualizacao}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </PainelLayout>
  );
}

function CampoVisualizacao({
  rotulo,
  valor,
  larguraTotal = false
}) {
  return (
    <div
      style={{
        gridColumn: larguraTotal
          ? '1 / -1'
          : 'auto',
        padding: 16,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        background: '#f8fafc'
      }}
    >
      <div
        style={{
          color: '#64748b',
          fontSize: '.78rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          marginBottom: 6
        }}
      >
        {rotulo}
      </div>

      <div
        style={{
          color: '#1f2937',
          fontSize: '.95rem',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere'
        }}
      >
        {valor || 'Não informado'}
      </div>
    </div>
  );
}