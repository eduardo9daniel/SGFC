import { useEffect, useState } from 'react';
import { HeaderPublico, FooterPublico } from '../../components/PublicLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';
import '../../cfdr_home_styles.css';

const naturezas = [
  '',
  'Mestrado',
  'Doutorado',
  'Pós-doutorado'
];

export default function PesquisadoresNestPublico() {
  const [pesquisadores, setPesquisadores] = useState([]);
  const [busca, setBusca] = useState('');
  const [natureza, setNatureza] = useState('');
  const [loading, setLoading] = useState(true);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const itensPorPagina = 10;

  async function carregar(params = {}) {
    try {
      setLoading(true);

      const { data } = await api.get('/pesquisadores-nest', {
        params
      });

      setPesquisadores(data.data || []);
      setPaginaAtual(1);
    } catch (error) {
      console.error('Erro ao carregar pesquisadores:', error);
      setPesquisadores([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function pesquisar(e) {
    e.preventDefault();

    carregar({
      busca: busca.trim(),
      natureza
    });
  }

  function limparBusca() {
    setBusca('');
    setNatureza('');
    carregar();
  }

  const totalPaginas = Math.ceil(pesquisadores.length / itensPorPagina);

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;

  const pesquisadoresPaginados = pesquisadores.slice(inicio, fim);

  return (
    <div className="home-cfdr">
      <HeaderPublico />

      <section className="cfdr-hero cfdr-hero-biblioteca">
        <div className="cfdr-hero-bg" aria-hidden="true" />

        <div className="cfdr-container">
          <div className="cfdr-hero-texto animar-entrada">
            <p className="cfdr-etiqueta">Pesquisadores NEST</p>

            <h1>Pesquisas e pesquisadores</h1>

            <p className="cfdr-subtitulo">
              Consulte pesquisadores, títulos de teses e dissertações, filiação
              institucional e palavras-chave cadastradas no sistema.
            </p>
          </div>
        </div>
      </section>

      <section className="cfdr-secao">
        <div className="cfdr-container">
          <form onSubmit={pesquisar} className="biblioteca-busca">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite nome, título, filiação ou palavra-chave"
              className="input"
            />

            <select
              value={natureza}
              onChange={(e) => setNatureza(e.target.value)}
              className="input"
            >
              {naturezas.map((item) => (
                <option key={item} value={item}>
                  {item || 'Todas as naturezas'}
                </option>
              ))}
            </select>

            <button type="submit" className="btn btn-primario">
              Pesquisar
            </button>

            <button
              type="button"
              onClick={limparBusca}
              className="btn btn-outline"
            >
              Limpar
            </button>
          </form>

          {loading ? (
            <Spinner />
          ) : pesquisadores.length === 0 ? (
            <div className="cfdr-vazio">
              <div>🔎</div>
              <h3>Nenhum pesquisador encontrado</h3>
              <p>Tente pesquisar por outro termo ou limpar os filtros.</p>
            </div>
          ) : (
            <>
              <div className="biblioteca-lista">
                {pesquisadoresPaginados.map((item) => (
                  <article className="biblioteca-card" key={item.id}>
                    <div>
                      <p className="cfdr-etiqueta escura">
                        {item.natureza_pesquisa || 'Pesquisa'}
                      </p>

                      <h3>{item.nome}</h3>

                      {item.titulo_trabalho && (
                        <p>
                          <strong>Título:</strong> {item.titulo_trabalho}
                        </p>
                      )}

                      {item.tipo_trabalho && (
                        <p>
                          <strong>Tipo:</strong> {item.tipo_trabalho}
                        </p>
                      )}

                      {item.filiacao && (
                        <p>
                          <strong>Filiação:</strong> {item.filiacao}
                        </p>
                      )}

                      {item.palavras_chave && (
                        <p>
                          <strong>Palavras-chave:</strong>{' '}
                          {item.palavras_chave}
                        </p>
                      )}
                    </div>

                    {item.link_lattes && (
                      <div className="d-flex gap-8 flex-wrap">
                        <a
                          href={item.link_lattes}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                        >
                          Currículo Lattes
                        </a>
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {totalPaginas > 1 && (
                <div className="paginacao">
                  {Array.from({ length: totalPaginas }, (_, index) => index + 1).map(
                    (numero) => (
                      <button
                        key={numero}
                        type="button"
                        className={`paginacao-botao ${
                          paginaAtual === numero ? 'ativo' : ''
                        }`}
                        onClick={() => setPaginaAtual(numero)}
                      >
                        {numero}
                      </button>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <FooterPublico />
    </div>
  );
}