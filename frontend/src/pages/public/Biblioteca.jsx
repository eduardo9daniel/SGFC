import { useEffect, useState } from 'react';
import {
  HeaderPublico,
  FooterPublico
} from '../../components/PublicLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';
import '../../cfdr_home_styles.css';

const tipos = [
  '',
  'Artigo',
  'Monografia',
  'Dissertação',
  'Tese',
  'Relatório Técnico',
  'Outro'
];

const naturezasPesquisa = [
  '',
  'Mestrado',
  'Doutorado',
  'Pós-doutorado'
];

export default function Biblioteca() {
  const [abaAtiva, setAbaAtiva] = useState('biblioteca');

  // Estados da Biblioteca
  const [itens, setItens] = useState([]);
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [loadingBiblioteca, setLoadingBiblioteca] =
    useState(true);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Estados das Pesquisas
  const [pesquisas, setPesquisas] = useState([]);
  const [buscaPesquisa, setBuscaPesquisa] = useState('');
  const [naturezaPesquisa, setNaturezaPesquisa] =
    useState('');
  const [loadingPesquisas, setLoadingPesquisas] =
    useState(true);
  const [paginaPesquisa, setPaginaPesquisa] =
    useState(1);

  const itensPorPagina = 10;
  const paginasPorBloco = 10;

  // =========================================================
  // CARREGAR BIBLIOTECA
  // =========================================================

  async function carregarBiblioteca(params = {}) {
    try {
      setLoadingBiblioteca(true);

      const resposta = await api.get('/biblioteca', {
        params
      });

      const dados =
        resposta.data.data || resposta.data || [];

      setItens(dados);
      setPaginaAtual(1);
    } catch (error) {
      console.error(
        'Erro ao carregar biblioteca:',
        error
      );

      setItens([]);
    } finally {
      setLoadingBiblioteca(false);
    }
  }

  // =========================================================
  // CARREGAR PESQUISAS
  // =========================================================

  async function carregarPesquisas(params = {}) {
    try {
      setLoadingPesquisas(true);

      const resposta = await api.get(
        '/pesquisadores-nest',
        {
          params
        }
      );

      const dados =
        resposta.data.data || resposta.data || [];

      setPesquisas(dados);
      setPaginaPesquisa(1);
    } catch (error) {
      console.error(
        'Erro ao carregar pesquisas:',
        error
      );

      setPesquisas([]);
    } finally {
      setLoadingPesquisas(false);
    }
  }

  useEffect(() => {
    carregarBiblioteca();
    carregarPesquisas();
  }, []);

  // =========================================================
  // FILTROS DA BIBLIOTECA
  // =========================================================

  function pesquisarBiblioteca(evento) {
    evento.preventDefault();

    carregarBiblioteca({
      busca: busca.trim(),
      tipo_trabalho: tipo
    });
  }

  function limparBuscaBiblioteca() {
    setBusca('');
    setTipo('');
    setPaginaAtual(1);
    carregarBiblioteca();
  }

  // =========================================================
  // FILTROS DAS PESQUISAS
  // =========================================================

  function pesquisarPesquisas(evento) {
    evento.preventDefault();

    carregarPesquisas({
      busca: buscaPesquisa.trim(),
      natureza: naturezaPesquisa
    });
  }

  function limparBuscaPesquisas() {
    setBuscaPesquisa('');
    setNaturezaPesquisa('');
    setPaginaPesquisa(1);
    carregarPesquisas();
  }

  // =========================================================
  // PAGINAÇÃO DA BIBLIOTECA
  // =========================================================

  const totalPaginas = Math.ceil(
    itens.length / itensPorPagina
  );

  const inicio =
    (paginaAtual - 1) * itensPorPagina;

  const fim =
    inicio + itensPorPagina;

  const itensPaginados = itens.slice(
    inicio,
    fim
  );

  const blocoAtual = Math.floor(
    (paginaAtual - 1) / paginasPorBloco
  );

  const primeiraPaginaDoBloco =
    blocoAtual * paginasPorBloco + 1;

  const ultimaPaginaDoBloco = Math.min(
    primeiraPaginaDoBloco +
      paginasPorBloco -
      1,
    totalPaginas
  );

  const paginasVisiveis = Array.from(
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

  function irParaBlocoAnterior() {
    const novaPagina = Math.max(
      primeiraPaginaDoBloco -
        paginasPorBloco,
      1
    );

    setPaginaAtual(novaPagina);
  }

  function irParaProximoBloco() {
    const novaPagina = Math.min(
      primeiraPaginaDoBloco +
        paginasPorBloco,
      totalPaginas
    );

    setPaginaAtual(novaPagina);
  }

  // =========================================================
  // PAGINAÇÃO DAS PESQUISAS
  // =========================================================

  const totalPaginasPesquisas = Math.ceil(
    pesquisas.length / itensPorPagina
  );

  const inicioPesquisa =
    (paginaPesquisa - 1) *
    itensPorPagina;

  const fimPesquisa =
    inicioPesquisa + itensPorPagina;

  const pesquisasPaginadas =
    pesquisas.slice(
      inicioPesquisa,
      fimPesquisa
    );

  const blocoPesquisaAtual =
    Math.floor(
      (paginaPesquisa - 1) /
        paginasPorBloco
    );

  const primeiraPaginaPesquisa =
    blocoPesquisaAtual *
      paginasPorBloco +
    1;

  const ultimaPaginaPesquisa = Math.min(
    primeiraPaginaPesquisa +
      paginasPorBloco -
      1,
    totalPaginasPesquisas
  );

  const paginasPesquisaVisiveis =
    Array.from(
      {
        length: Math.max(
          ultimaPaginaPesquisa -
            primeiraPaginaPesquisa +
            1,
          0
        )
      },
      (_, index) =>
        primeiraPaginaPesquisa +
        index
    );

  function irParaBlocoPesquisaAnterior() {
    const novaPagina = Math.max(
      primeiraPaginaPesquisa -
        paginasPorBloco,
      1
    );

    setPaginaPesquisa(novaPagina);
  }

  function irParaProximoBlocoPesquisa() {
    const novaPagina = Math.min(
      primeiraPaginaPesquisa +
        paginasPorBloco,
      totalPaginasPesquisas
    );

    setPaginaPesquisa(novaPagina);
  }

  return (
    <div className="home-cfdr">
      <HeaderPublico />

      <section className="cfdr-hero cfdr-hero-biblioteca">
        <div
          className="cfdr-hero-bg"
          aria-hidden="true"
        />

        <div className="cfdr-container">
          <div className="cfdr-hero-texto animar-entrada">
            

            <h1>
              Biblioteca e Pesquisas
            </h1>

            <p className="cfdr-subtitulo">
              Consulte trabalhos acadêmicos
              e pesquisas cadastradas no
              sistema.
            </p>
          </div>
        </div>
      </section>

      <section className="cfdr-secao">
        <div className="cfdr-container">
          {/* Abas */}
          <div className="biblioteca-abas">
            <button
              type="button"
              className={`biblioteca-aba ${
                abaAtiva === 'biblioteca'
                  ? 'ativa'
                  : ''
              }`}
              onClick={() => {
                setAbaAtiva('biblioteca');
              }}
            >
              📚 Trabalhos acadêmicos
            </button>

            <button
              type="button"
              className={`biblioteca-aba ${
                abaAtiva === 'pesquisas'
                  ? 'ativa'
                  : ''
              }`}
              onClick={() => {
                setAbaAtiva('pesquisas');
              }}
            >
              🔎 Pesquisas
            </button>
          </div>

          {/* =================================================
              ABA TRABALHOS ACADÊMICOS
          ================================================== */}

          {abaAtiva === 'biblioteca' && (
            <>
              <form
                onSubmit={
                  pesquisarBiblioteca
                }
                className="biblioteca-busca"
              >
                <input
                  type="text"
                  value={busca}
                  onChange={evento => {
                    setBusca(
                      evento.target.value
                    );
                    setPaginaAtual(1);
                  }}
                  placeholder="Digite um título, autor/servidor, cargo, tema ou palavra-chave"
                  className="input"
                />

                <select
                  value={tipo}
                  onChange={evento => {
                    setTipo(
                      evento.target.value
                    );
                    setPaginaAtual(1);
                  }}
                  className="input"
                >
                  {tipos.map(
                    itemTipo => (
                      <option
                        key={itemTipo}
                        value={itemTipo}
                      >
                        {itemTipo ||
                          'Todos os tipos'}
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
                  onClick={
                    limparBuscaBiblioteca
                  }
                  className="btn btn-outline"
                >
                  Limpar
                </button>
              </form>

              {loadingBiblioteca ? (
                <Spinner />
              ) : itens.length === 0 ? (
                <div className="cfdr-vazio">
                  <div>📚</div>

                  <h3>
                    Nenhum trabalho
                    encontrado
                  </h3>

                  <p>
                    Tente pesquisar por outro
                    termo ou limpar os filtros.
                  </p>
                </div>
              ) : (
                <>
                  <div className="biblioteca-lista">
                    {itensPaginados.map(
                      item => (
                        <article
                          className="biblioteca-card"
                          key={item.id}
                        >
                          <div className="biblioteca-card-conteudo">
                            <p className="cfdr-etiqueta escura">
                              {item.tipo_trabalho ||
                                'Trabalho acadêmico'}
                            </p>

                            <h3>
                              {item.titulo ||
                                'Título não informado'}
                            </h3>

                            <div className="biblioteca-autor-lattes">
                              <p className="biblioteca-autor">
                                <strong>
                                  Autor/Servidor:
                                </strong>{' '}
                                {item.autor ||
                                  '-'}
                              </p>

                              {item.link_lattes && (
                                <a
                                  href={
                                    item.link_lattes
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline btn-lattes"
                                >
                                  Currículo
                                  Lattes
                                </a>
                              )}
                            </div>

                            <p>
                              <strong>
                                Cargo:
                              </strong>{' '}
                              {item.cargo ||
                                '-'}
                            </p>

                            <p>
                              <strong>
                                Instituição:
                              </strong>{' '}
                              {item.instituicao ||
                                '-'}
                            </p>

                            {item.palavras_chave && (
                              <p>
                                <strong>
                                  Palavras-chave:
                                </strong>{' '}
                                {
                                  item.palavras_chave
                                }
                              </p>
                            )}
                          </div>

                          {item.link_documento && (
                            <div className="biblioteca-card-acoes">
                              <a
                                href={
                                  item.link_documento
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primario"
                              >
                                Acessar
                                documento
                              </a>
                            </div>
                          )}
                        </article>
                      )
                    )}
                  </div>

                  {totalPaginas > 1 && (
                    <div className="paginacao">
                      <button
                        type="button"
                        className="paginacao-botao paginacao-seta"
                        onClick={
                          irParaBlocoAnterior
                        }
                        disabled={
                          primeiraPaginaDoBloco ===
                          1
                        }
                        aria-label="Páginas anteriores"
                      >
                        ‹
                      </button>

                      {paginasVisiveis.map(
                        numero => (
                          <button
                            key={numero}
                            type="button"
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
                          irParaProximoBloco
                        }
                        disabled={
                          ultimaPaginaDoBloco ===
                          totalPaginas
                        }
                        aria-label="Próximas páginas"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* =================================================
              ABA PESQUISAS
          ================================================== */}

          {abaAtiva === 'pesquisas' && (
            <>
              <form
                onSubmit={
                  pesquisarPesquisas
                }
                className="biblioteca-busca"
              >
                <input
                  type="text"
                  value={buscaPesquisa}
                  onChange={evento => {
                    setBuscaPesquisa(
                      evento.target.value
                    );
                    setPaginaPesquisa(1);
                  }}
                  placeholder="Nome, título, filiação ou palavra-chave"
                  className="input"
                />

                <select
                  value={
                    naturezaPesquisa
                  }
                  onChange={evento => {
                    setNaturezaPesquisa(
                      evento.target.value
                    );
                    setPaginaPesquisa(1);
                  }}
                  className="input"
                >
                  {naturezasPesquisa.map(
                    natureza => (
                      <option
                        key={natureza}
                        value={natureza}
                      >
                        {natureza ||
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
                  onClick={
                    limparBuscaPesquisas
                  }
                  className="btn btn-outline"
                >
                  Limpar
                </button>
              </form>

              {loadingPesquisas ? (
                <Spinner />
              ) : pesquisas.length === 0 ? (
                <div className="cfdr-vazio">
                  <div>🔎</div>

                  <h3>
                    Nenhuma pesquisa
                    encontrada
                  </h3>

                  <p>
                    Tente pesquisar por outro
                    termo ou limpar os filtros.
                  </p>
                </div>
              ) : (
                <>
                  <div className="biblioteca-lista">
                    {pesquisasPaginadas.map(
                      item => (
                        <article
                          className="biblioteca-card"
                          key={item.id}
                        >
                          <div className="biblioteca-card-conteudo">
                            <p className="cfdr-etiqueta escura">
                              {item.natureza_pesquisa ||
                                'Pesquisa'}
                            </p>

                            <h3>
                              {item.titulo_trabalho ||
                                'Pesquisa sem título informado'}
                            </h3>

                            <div className="biblioteca-autor-lattes">
                              <p className="biblioteca-autor">
                                <strong>
                                  Pesquisador(a):
                                </strong>{' '}
                                {item.nome ||
                                  '-'}
                              </p>

                              {item.link_lattes && (
                                <a
                                  href={
                                    item.link_lattes
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline btn-lattes"
                                >
                                  Currículo
                                  Lattes
                                </a>
                              )}
                            </div>

                            <p>
                              <strong>
                                Tipo:
                              </strong>{' '}
                              {item.tipo_trabalho ||
                                '-'}
                            </p>

                            <p>
                              <strong>
                                Filiação:
                              </strong>{' '}
                              {item.filiacao ||
                                '-'}
                            </p>

                            {item.palavras_chave && (
                              <p>
                                <strong>
                                  Palavras-chave:
                                </strong>{' '}
                                {
                                  item.palavras_chave
                                }
                              </p>
                            )}
                          </div>

                          {item.link_documento && (
                            <div className="biblioteca-card-acoes">
                              <a
                                href={
                                  item.link_documento
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primario"
                              >
                                Acessar
                                tese/dissertação
                              </a>
                            </div>
                          )}
                        </article>
                      )
                    )}
                  </div>

                  {totalPaginasPesquisas >
                    1 && (
                    <div className="paginacao">
                      <button
                        type="button"
                        className="paginacao-botao paginacao-seta"
                        onClick={
                          irParaBlocoPesquisaAnterior
                        }
                        disabled={
                          primeiraPaginaPesquisa ===
                          1
                        }
                        aria-label="Páginas anteriores"
                      >
                        ‹
                      </button>

                      {paginasPesquisaVisiveis.map(
                        numero => (
                          <button
                            key={numero}
                            type="button"
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
                          irParaProximoBlocoPesquisa
                        }
                        disabled={
                          ultimaPaginaPesquisa ===
                          totalPaginasPesquisas
                        }
                        aria-label="Próximas páginas"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      <FooterPublico />
    </div>
  );
}