import { useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { Spinner } from '../ui';
import '../../styles/acervoLivros.css';

const statusRotulos = {
  disponivel: 'Disponível',
  emprestado: 'Emprestado',
  indisponivel: 'Indisponível'
};

function formatarDataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(dataTexto, quantidadeDias) {
  if (!dataTexto) return '';

  const partes = dataTexto.split('-').map(Number);
  if (partes.length !== 3) return '';

  const [ano, mes, dia] = partes;
  const data = new Date(ano, mes - 1, dia);
  data.setDate(data.getDate() + quantidadeDias);

  return formatarDataLocal(data);
}

function datasIniciais() {
  const retirada = formatarDataLocal(new Date());

  return {
    data_retirada: retirada,
    data_devolucao_prevista: adicionarDias(retirada, 7)
  };
}

function Paginacao({ pagina, totalPaginas, onChange }) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="paginacao">
      <button
        type="button"
        className="paginacao-botao paginacao-seta"
        disabled={pagina === 1}
        onClick={() => onChange(pagina - 1)}
        aria-label="Página anterior"
      >
        ‹
      </button>

      {Array.from({ length: totalPaginas }, (_, index) => index + 1).map(
        numero => (
          <button
            type="button"
            key={numero}
            className={`paginacao-botao ${
              pagina === numero ? 'ativo' : ''
            }`}
            onClick={() => onChange(numero)}
          >
            {numero}
          </button>
        )
      )}

      <button
        type="button"
        className="paginacao-botao paginacao-seta"
        disabled={pagina === totalPaginas}
        onClick={() => onChange(pagina + 1)}
        aria-label="Próxima página"
      >
        ›
      </button>
    </div>
  );
}

export default function PublicAcervoLivros() {
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [ordenar, setOrdenar] = useState('titulo');
  const [pagina, setPagina] = useState(1);
  const [livroSelecionado, setLivroSelecionado] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [form, setForm] = useState(() => ({
    nome_solicitante: '',
    matricula_id: '',
    ...datasIniciais()
  }));

  const itensPorPagina = 10;

  async function carregarLivros(params = {}) {
    try {
      setLoading(true);
      const { data } = await api.get('/biblioteca/livros', { params });
      setLivros(data.data || []);
      setPagina(1);
    } catch (error) {
      console.error('Erro ao carregar o acervo:', error);
      setLivros([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarLivros();
  }, []);

  const totalPaginas = Math.ceil(livros.length / itensPorPagina);

  const livrosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return livros.slice(inicio, inicio + itensPorPagina);
  }, [livros, pagina]);

  function pesquisar(evento) {
    evento.preventDefault();
    carregarLivros({
      busca: busca.trim(),
      status,
      ordenar
    });
  }

  function limparFiltros() {
    setBusca('');
    setStatus('');
    setOrdenar('titulo');
    carregarLivros();
  }

  function abrirEmprestimo(livro) {
    setLivroSelecionado(livro);
    setAviso(null);
    setForm({
      nome_solicitante: '',
      matricula_id: '',
      ...datasIniciais()
    });
  }

  function fecharEmprestimo() {
    if (salvando) return;
    setLivroSelecionado(null);
    setAviso(null);
  }

  function alterarDataRetirada(evento) {
    const novaDataRetirada = evento.target.value;

    setForm(atual => ({
      ...atual,
      data_retirada: novaDataRetirada,
      data_devolucao_prevista: adicionarDias(novaDataRetirada, 7)
    }));
  }

  async function solicitarEmprestimo(evento) {
    evento.preventDefault();

    if (!form.nome_solicitante.trim() || !form.matricula_id.trim()) {
      setAviso({
        tipo: 'erro',
        texto: 'Informe o nome e a matrícula ou ID.'
      });
      return;
    }

    if (!form.data_retirada || !form.data_devolucao_prevista) {
      setAviso({
        tipo: 'erro',
        texto: 'Informe as datas de retirada e devolução.'
      });
      return;
    }

    try {
      setSalvando(true);
      setAviso(null);

      const { data } = await api.post(
        `/biblioteca/livros/${livroSelecionado.id}/emprestimos`,
        {
          ...form,
          nome_solicitante: form.nome_solicitante.trim(),
          matricula_id: form.matricula_id.trim()
        }
      );

      setAviso({
        tipo: 'sucesso',
        texto:
          data.mensagem ||
          'Solicitação enviada para análise do responsável pela Biblioteca.'
      });

      await carregarLivros({
        busca: busca.trim(),
        status,
        ordenar
      });

      setTimeout(() => {
        setLivroSelecionado(null);
        setAviso(null);
      }, 1500);
    } catch (error) {
      setAviso({
        tipo: 'erro',
        texto:
          error.response?.data?.erro ||
          'Não foi possível enviar a solicitação de empréstimo.'
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <form className="acervo-filtros" onSubmit={pesquisar}>
        <div className="campo">
          <label htmlFor="acervo-busca">Buscar no acervo</label>
          <input
            id="acervo-busca"
            className="input"
            value={busca}
            onChange={evento => setBusca(evento.target.value)}
            placeholder="Título, autor ou ano"
          />
        </div>

        <div className="campo">
          <label htmlFor="acervo-status">Status</label>
          <select
            id="acervo-status"
            className="input"
            value={status}
            onChange={evento => setStatus(evento.target.value)}
          >
            <option value="">Todos</option>
            <option value="disponivel">Disponível</option>
            <option value="emprestado">Emprestado</option>
            <option value="indisponivel">Indisponível</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="acervo-ordenar">Ordenar por</label>
          <select
            id="acervo-ordenar"
            className="input"
            value={ordenar}
            onChange={evento => setOrdenar(evento.target.value)}
          >
            <option value="titulo">Título</option>
            <option value="ano">Ano</option>
            <option value="autor">Autor</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primario">
          Pesquisar
        </button>

        <button
          type="button"
          className="btn btn-outline"
          onClick={limparFiltros}
        >
          Limpar
        </button>
      </form>

      {loading ? (
        <Spinner />
      ) : livros.length === 0 ? (
        <div className="acervo-vazio">
          <h3>Nenhum livro encontrado</h3>
          <p>Tente alterar a busca ou os filtros selecionados.</p>
        </div>
      ) : (
        <>
          <div className="acervo-lista">
            {livrosPaginados.map(livro => (
              <article className="acervo-card" key={livro.id}>
                <div className="acervo-card-cabecalho">
                  <div>
                    <h3>{livro.titulo}</h3>
                    <p className="acervo-card-autores">{livro.autores}</p>
                  </div>

                  <span className={`acervo-status ${livro.status}`}>
                    {statusRotulos[livro.status] || livro.status}
                  </span>
                </div>

                <div className="acervo-dados">
                  <div className="acervo-dado">
                    <span>Ano</span>
                    <strong>{livro.ano_publicacao}</strong>
                  </div>

                  <div className="acervo-dado">
                    <span>Editora</span>
                    <strong>{livro.editora}</strong>
                  </div>

                  <div className="acervo-dado">
                    <span>Exemplares</span>
                    <strong>
                      {livro.exemplares_disponiveis} de{' '}
                      {livro.exemplares_total} disponíveis
                    </strong>
                  </div>
                </div>

                {livro.sinopse && (
                  <p className="acervo-sinopse">{livro.sinopse}</p>
                )}

                <div className="acervo-acoes">
                  <button
                    type="button"
                    className="btn btn-primario"
                    disabled={
                      livro.status !== 'disponivel' ||
                      Number(livro.exemplares_disponiveis) <= 0
                    }
                    onClick={() => abrirEmprestimo(livro)}
                  >
                    Solicitar empréstimo
                  </button>
                </div>
              </article>
            ))}
          </div>

          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            onChange={setPagina}
          />
        </>
      )}

      {livroSelecionado && (
        <div
          className="acervo-modal-fundo"
          role="presentation"
          onMouseDown={evento => {
            if (evento.target === evento.currentTarget) {
              fecharEmprestimo();
            }
          }}
        >
          <div
            className="acervo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-emprestimo"
          >
            <div className="acervo-modal-cabecalho">
              <div>
                <h3 id="titulo-modal-emprestimo">
                  Solicitar empréstimo
                </h3>
                <p>{livroSelecionado.titulo}</p>
              </div>

              <button
                type="button"
                className="acervo-modal-fechar"
                onClick={fecharEmprestimo}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <p className="acervo-orientacao">
              A solicitação será enviada para análise de um administrador ou
              coordenador. O exemplar só será descontado após a aprovação.
            </p>

            {aviso && (
              <div className={`acervo-aviso ${aviso.tipo}`}>
                {aviso.texto}
              </div>
            )}

            <form onSubmit={solicitarEmprestimo}>
              <div className="acervo-form-grid">
                <div className="campo campo-full">
                  <label htmlFor="emprestimo-nome">
                    Nome do solicitante *
                  </label>
                  <input
                    id="emprestimo-nome"
                    type="text"
                    value={form.nome_solicitante}
                    onChange={evento =>
                      setForm(atual => ({
                        ...atual,
                        nome_solicitante: evento.target.value
                      }))
                    }
                    required
                  />
                </div>

                <div className="campo campo-full">
                  <label htmlFor="emprestimo-matricula">
                    Matrícula ou ID *
                  </label>
                  <input
                    id="emprestimo-matricula"
                    type="text"
                    value={form.matricula_id}
                    onChange={evento =>
                      setForm(atual => ({
                        ...atual,
                        matricula_id: evento.target.value
                      }))
                    }
                    required
                  />
                </div>

                <div className="campo">
                  <label htmlFor="emprestimo-retirada">
                    Data de retirada *
                  </label>
                  <input
                    id="emprestimo-retirada"
                    type="date"
                    value={form.data_retirada}
                    onChange={alterarDataRetirada}
                    required
                  />
                </div>

                <div className="campo">
                  <label htmlFor="emprestimo-devolucao">
                    Devolução prevista *
                  </label>
                  <input
                    id="emprestimo-devolucao"
                    type="date"
                    value={form.data_devolucao_prevista}
                    onChange={evento =>
                      setForm(atual => ({
                        ...atual,
                        data_devolucao_prevista: evento.target.value
                      }))
                    }
                    min={form.data_retirada}
                    required
                  />
                </div>
              </div>

              <div className="acervo-acoes">
                <button
                  type="submit"
                  className="btn btn-primario"
                  disabled={salvando}
                >
                  {salvando ? 'Enviando...' : 'Enviar solicitação'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={fecharEmprestimo}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
