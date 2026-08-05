import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { criarRotasBiblioteca } from '../../utils/rotasBiblioteca';
import '../../styles/acervoLivros.css';

export default function BibliotecaPainel() {
  const { user } = useAuth();
  const rotas = criarRotasBiblioteca(user?.tipo);
  const [itens, setItens] = useState([]);
  const [pesquisas, setPesquisas] = useState([]);
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visualizacao, setVisualizacao] = useState(null);

  const [paginaItens, setPaginaItens] = useState(1);
  const [paginaPesquisas, setPaginaPesquisas] = useState(1);

  const itensPorPagina = 10;
  const paginasPorBloco = 10;

  async function carregar() {
    try {
      setLoading(true);

      const [
        respostaBiblioteca,
        respostaPesquisas,
        respostaLivros
      ] = await Promise.all([
        api.get('/admin/biblioteca'),
        api.get('/admin/pesquisadores-nest'),
        api.get('/admin/biblioteca/livros')
      ]);

      const dadosBiblioteca =
        respostaBiblioteca.data.data ||
        respostaBiblioteca.data ||
        [];

      const dadosPesquisas =
        respostaPesquisas.data.data ||
        respostaPesquisas.data ||
        [];

      const dadosLivros =
        respostaLivros.data.data ||
        respostaLivros.data ||
        [];

      setItens(dadosBiblioteca);
      setPesquisas(dadosPesquisas);
      setLivros(dadosLivros);

      setPaginaItens(1);
      setPaginaPesquisas(1);
    } catch (error) {
      console.error(
        'Erro ao carregar painel da biblioteca:',
        error
      );

      setItens([]);
      setPesquisas([]);
      setLivros([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    function fecharComEsc(event) {
      if (event.key === 'Escape') {
        setVisualizacao(null);
      }
    }

    window.addEventListener('keydown', fecharComEsc);

    return () => {
      window.removeEventListener('keydown', fecharComEsc);
    };
  }, []);

  function abrirVisualizacao(tipo, item) {
    setVisualizacao({
      tipo,
      item
    });
  }

  function fecharVisualizacao() {
    setVisualizacao(null);
  }

  function impedirFechamento(event) {
    event.stopPropagation();
  }

  function exibirValor(valor) {
    return valor || 'Não informado';
  }

  const resumoBiblioteca = useMemo(() => {
    const total = itens.length;

    const comDocumento = itens.filter(
      item => item.link_documento
    ).length;

    const comLattes = itens.filter(
      item => item.link_lattes
    ).length;

    const tipos = itens.reduce(
      (acumulador, item) => {
        const tipo =
          item.tipo_trabalho || 'Não informado';

        acumulador[tipo] =
          (acumulador[tipo] || 0) + 1;

        return acumulador;
      },
      {}
    );

    const itensOrdenados = [...itens].sort(
      (itemA, itemB) =>
        new Date(itemB.criado_em || 0) -
        new Date(itemA.criado_em || 0)
    );

    return {
      total,
      comDocumento,
      comLattes,
      tipos,
      itensOrdenados
    };
  }, [itens]);

  const resumoPesquisas = useMemo(() => {
    const total = pesquisas.length;

    const comDocumento = pesquisas.filter(
      item => item.link_documento
    ).length;

    const comLattes = pesquisas.filter(
      item => item.link_lattes
    ).length;

    const naturezas = pesquisas.reduce(
      (acumulador, item) => {
        const natureza =
          item.natureza_pesquisa ||
          'Não informada';

        acumulador[natureza] =
          (acumulador[natureza] || 0) + 1;

        return acumulador;
      },
      {}
    );

    const pesquisasOrdenadas = [
      ...pesquisas
    ].sort(
      (itemA, itemB) =>
        new Date(itemB.criado_em || 0) -
        new Date(itemA.criado_em || 0)
    );

    return {
      total,
      comDocumento,
      comLattes,
      naturezas,
      pesquisasOrdenadas
    };
  }, [pesquisas]);

  const resumoLivros = useMemo(() => {
    const total = livros.length;

    const disponiveis = livros.filter(
      item => item.status === 'disponivel'
    ).length;

    const emprestados = livros.filter(
      item => item.status === 'emprestado'
    ).length;

    return {
      total,
      disponiveis,
      emprestados
    };
  }, [livros]);

  const resumoGeral = useMemo(() => {
    return {
      total:
        resumoBiblioteca.total +
        resumoPesquisas.total +
        resumoLivros.total,

      comDocumento:
        resumoBiblioteca.comDocumento +
        resumoPesquisas.comDocumento,

      comLattes:
        resumoBiblioteca.comLattes +
        resumoPesquisas.comLattes
    };
  }, [
    resumoBiblioteca,
    resumoPesquisas,
    resumoLivros
  ]);

  function criarPaginacao(lista, paginaAtual) {
    const totalPaginas = Math.ceil(
      lista.length / itensPorPagina
    );

    const inicio =
      (paginaAtual - 1) * itensPorPagina;

    const fim =
      inicio + itensPorPagina;

    const registrosPaginados =
      lista.slice(inicio, fim);

    const blocoAtual = Math.floor(
      (paginaAtual - 1) / paginasPorBloco
    );

    const primeiraPaginaDoBloco =
      blocoAtual * paginasPorBloco + 1;

    const ultimaPaginaDoBloco =
      Math.min(
        primeiraPaginaDoBloco +
          paginasPorBloco -
          1,
        totalPaginas
      );

    const paginasVisiveis =
      Array.from(
        {
          length: Math.max(
            ultimaPaginaDoBloco -
              primeiraPaginaDoBloco +
              1,
            0
          )
        },
        (_, index) =>
          primeiraPaginaDoBloco + index
      );

    return {
      totalPaginas,
      registrosPaginados,
      primeiraPaginaDoBloco,
      ultimaPaginaDoBloco,
      paginasVisiveis
    };
  }

  const paginacaoItens =
    criarPaginacao(
      resumoBiblioteca.itensOrdenados,
      paginaItens
    );

  const paginacaoPesquisas =
    criarPaginacao(
      resumoPesquisas.pesquisasOrdenadas,
      paginaPesquisas
    );

  function renderizarPaginacao(
    paginacao,
    paginaAtual,
    setPaginaAtual
  ) {
    if (paginacao.totalPaginas <= 1) {
      return null;
    }

    function irParaBlocoAnterior() {
      const novaPagina = Math.max(
        paginacao.primeiraPaginaDoBloco -
          paginasPorBloco,
        1
      );

      setPaginaAtual(novaPagina);
    }

    function irParaProximoBloco() {
      const novaPagina = Math.min(
        paginacao.primeiraPaginaDoBloco +
          paginasPorBloco,
        paginacao.totalPaginas
      );

      setPaginaAtual(novaPagina);
    }

    return (
      <div className="paginacao">
        <button
          type="button"
          className="paginacao-botao paginacao-seta"
          onClick={irParaBlocoAnterior}
          disabled={
            paginacao.primeiraPaginaDoBloco === 1
          }
          aria-label="Páginas anteriores"
        >
          ‹
        </button>

        {paginacao.paginasVisiveis.map(
          numero => (
            <button
              key={numero}
              type="button"
              className={`paginacao-botao ${
                paginaAtual === numero
                  ? 'ativo'
                  : ''
              }`}
              onClick={() =>
                setPaginaAtual(numero)
              }
            >
              {numero}
            </button>
          )
        )}

        <button
          type="button"
          className="paginacao-botao paginacao-seta"
          onClick={irParaProximoBloco}
          disabled={
            paginacao.ultimaPaginaDoBloco ===
            paginacao.totalPaginas
          }
          aria-label="Próximas páginas"
        >
          ›
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <PainelLayout titulo="Painel da Biblioteca">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Painel da Biblioteca">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800
            }}
          >
            Biblioteca 
          </h2>

          <p
            style={{
              color: 'var(--cinza-600)',
              fontSize: '.9rem'
            }}
          >
            Visão geral dos trabalhos acadêmicos, pesquisas e livros cadastrados no sistema.
          </p>
        </div>

        <div
          className="d-flex gap-8 flex-wrap"
          style={{
            alignItems: 'center'
          }}
        >
          <Link
            to={rotas.gerenciamento}
            className="btn btn-outline"
          >
            Gerenciar Biblioteca
          </Link>
        </div>
      </div>

      <div className="stats-grid dashboard-stats mb-24">
        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone verde">
            📖
          </div>

          <div>
            <div className="stat-valor">
              {resumoGeral.total}
            </div>

            <div className="stat-label">
              Registros cadastrados
            </div>

            <div className="stat-detalhe">
              Total de itens, pesquisas e livros
            </div>
          </div>
        </div>

        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone laranja">
            📄
          </div>

          <div>
            <div className="stat-valor">
              {resumoGeral.comDocumento}
            </div>

            <div className="stat-label">
              Com documento
            </div>

            <div className="stat-detalhe">
              Itens e pesquisas com link do trabalho
            </div>
          </div>
        </div>

        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone amarelo">
            👤
          </div>

          <div>
            <div className="stat-valor">
              {resumoGeral.comLattes}
            </div>

            <div className="stat-label">
              Com Lattes
            </div>

            <div className="stat-detalhe">
              Autores e pesquisadores com currículo informado
            </div>
          </div>
        </div>

        <Link
          to={rotas.acervo}
          className="stat-card dashboard-card-sombra"
          style={{
            color: 'inherit',
            textDecoration: 'none'
          }}
          title="Abrir o Acervo de Livros"
        >
          <div className="stat-icone verde">
            📚
          </div>

          <div>
            <div className="stat-valor">
              {resumoLivros.total}
            </div>

            <div className="stat-label">
              Acervo de Livros
            </div>

            <div className="stat-detalhe">
              {resumoLivros.disponiveis} disponíveis ·{' '}
              {resumoLivros.emprestados} emprestados
            </div>
          </div>
        </Link>
      </div>

      <div className="dashboard-grid-resumo">
        <div className="card dashboard-card-sombra">
          <div className="card-titulo">
            <span className="icone">
              📊
            </span>

            Itens da biblioteca por tipo
          </div>

          {Object.keys(
            resumoBiblioteca.tipos
          ).length === 0 ? (
            <div className="vazio compacto">
              <p>
                Nenhum tipo cadastrado.
              </p>
            </div>
          ) : (
            <div className="status-lista">
              {Object.entries(
                resumoBiblioteca.tipos
              ).map(([tipo, total]) => (
                <div
                  key={tipo}
                  className="status-item verde"
                >
                  <span>{tipo}</span>
                  <strong>{total}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card dashboard-card-sombra">
          <div className="card-titulo">
            <span className="icone">
              🧪
            </span>

            Pesquisas por natureza
          </div>

          {Object.keys(
            resumoPesquisas.naturezas
          ).length === 0 ? (
            <div className="vazio compacto">
              <p>
                Nenhuma pesquisa cadastrada.
              </p>
            </div>
          ) : (
            <div className="status-lista">
              {Object.entries(
                resumoPesquisas.naturezas
              ).map(([natureza, total]) => (
                <div
                  key={natureza}
                  className="status-item verde"
                >
                  <span>{natureza}</span>
                  <strong>{total}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card dashboard-card-sombra">
          <div className="card-titulo">
            <span className="icone">
              ⚡
            </span>

            Ações rápidas
          </div>

          <div className="acoes-rapidas">
            <Link
              to={rotas.novoItem}
              className="btn btn-primario"
            >
              + Cadastrar Item
            </Link>

            <Link
              to={rotas.novaPesquisa}
              className="btn btn-primario"
            >
              + Cadastrar Pesquisa
            </Link>

            <Link
              to={rotas.novoLivro}
              className="btn btn-primario"
            >
              + Cadastrar Livro
            </Link>

            <Link
              to={rotas.gerenciamento}
              className="btn btn-outline"
            >
              📖 Gerenciar Biblioteca
            </Link>

            <Link
              to="/biblioteca"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              🌐 Ver Biblioteca Pública
            </Link>
          </div>
        </div>
      </div>

      <div className="card dashboard-card-sombra mt-24">
        <div
          className="card-titulo"
          style={{
            flexWrap: 'wrap'
          }}
        >
          <span className="icone">
            📚
          </span>

          Itens da biblioteca cadastrados

          <Link
            to={rotas.gerenciamento}
            className="link-card"
          >
            Gerenciar →
          </Link>
        </div>

        {resumoBiblioteca.itensOrdenados.length ===
        0 ? (
          <div className="vazio">
            <div className="vazio-icone">
              📖
            </div>

            <p>
              Nenhum item cadastrado.
            </p>
          </div>
        ) : (
          <>
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Autor/Servidor</th>
                    <th>Tipo</th>
                    <th>Documento</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {paginacaoItens.registrosPaginados.map(
                    item => (
                      <tr key={item.id}>
                        <td
                          style={{
                            fontWeight: 700,
                            maxWidth: 280
                          }}
                        >
                          {item.codigo_referencia && (
                            <span className="acervo-referencia">
                              {item.codigo_referencia}
                            </span>
                          )}

                          {item.titulo}
                        </td>

                        <td>
                          {item.autor || '-'}
                        </td>

                        <td>
                          {item.tipo_trabalho || '-'}
                        </td>

                        <td>
                          {item.link_documento ? (
                            <a
                              href={item.link_documento}
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
                          <div
                            className="d-flex gap-8"
                            style={{
                              alignItems: 'center',
                              flexWrap: 'wrap'
                            }}
                          >
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() =>
                                abrirVisualizacao(
                                  'biblioteca',
                                  item
                                )
                              }
                              title="Visualizar item"
                              aria-label={`Visualizar ${
                                item.titulo || 'item'
                              }`}
                            >
                              👁 Visualizar
                            </button>

                            <Link
                              to={`${rotas.novoItem}?id=${item.id}`}
                              className="btn btn-outline btn-sm"
                            >
                              Editar
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {renderizarPaginacao(
              paginacaoItens,
              paginaItens,
              setPaginaItens
            )}
          </>
        )}
      </div>

      <div className="card dashboard-card-sombra mt-24">
        <div
          className="card-titulo"
          style={{
            flexWrap: 'wrap'
          }}
        >
          <span className="icone">
            🔎
          </span>

          Pesquisas cadastradas

          <Link
            to={rotas.pesquisas}
            className="link-card"
          >
            Gerenciar →
          </Link>
        </div>

        {resumoPesquisas.pesquisasOrdenadas.length ===
        0 ? (
          <div className="vazio">
            <div className="vazio-icone">
              🔎
            </div>

            <p>
              Nenhuma pesquisa cadastrada.
            </p>
          </div>
        ) : (
          <>
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Título do trabalho</th>
                    <th>Pesquisador</th>
                    <th>Natureza</th>
                    <th>Tipo</th>
                    <th>Documento</th>
                    <th>Lattes</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {paginacaoPesquisas.registrosPaginados.map(
                    item => (
                      <tr key={item.id}>
                        <td
                          style={{
                            fontWeight: 700,
                            maxWidth: 320
                          }}
                        >
                          {item.codigo_referencia && (
                            <span className="acervo-referencia">
                              {item.codigo_referencia}
                            </span>
                          )}

                          {item.titulo_trabalho || '-'}
                        </td>

                        <td>
                          {item.nome || '-'}
                        </td>

                        <td>
                          {item.natureza_pesquisa ||
                            '-'}
                        </td>

                        <td>
                          {item.tipo_trabalho || '-'}
                        </td>

                        <td>
                          {item.link_documento ? (
                            <a
                              href={item.link_documento}
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
                              href={item.link_lattes}
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
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              abrirVisualizacao(
                                'pesquisa',
                                item
                              )
                            }
                            title="Visualizar pesquisa"
                            aria-label={`Visualizar ${
                              item.titulo_trabalho ||
                              'pesquisa'
                            }`}
                          >
                            👁 Visualizar
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {renderizarPaginacao(
              paginacaoPesquisas,
              paginaPesquisas,
              setPaginaPesquisas
            )}
          </>
        )}
      </div>

      {visualizacao && (
        <div
          onClick={fecharVisualizacao}
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.66)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflowY: 'auto'
          }}
        >
          <div
            onClick={impedirFechamento}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-visualizacao"
            style={{
              width: 'min(760px, 100%)',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: 18,
              boxShadow:
                '0 24px 70px rgba(15, 23, 42, 0.28)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                padding: '22px 24px',
                borderBottom: '1px solid #e5e7eb',
                position: 'sticky',
                top: 0,
                zIndex: 1,
                background: '#ffffff'
              }}
            >
              <div>
                <div
                  style={{
                    color: 'var(--cinza-600)',
                    fontSize: '.8rem',
                    fontWeight: 800,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    marginBottom: 6
                  }}
                >
                  {visualizacao.tipo === 'biblioteca'
                    ? 'Item da biblioteca'
                    : 'Pesquisa'}
                </div>

                <h3
                  id="titulo-modal-visualizacao"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    lineHeight: 1.35,
                    color: '#111827'
                  }}
                >
                  {visualizacao.tipo === 'biblioteca'
                    ? exibirValor(
                        visualizacao.item.titulo
                      )
                    : exibirValor(
                        visualizacao.item
                          .titulo_trabalho
                      )}
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
                    valor={visualizacao.item.autor}
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
                    rotulo="Instituição/Filiação"
                    valor={
                      visualizacao.item.filiacao ||
                      visualizacao.item.instituicao
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
                    valor={visualizacao.item.nome}
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