import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api';
import { Spinner } from '../ui';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import '../../styles/acervoLivros.css';

const statusLivroRotulos = {
  disponivel: 'Disponível',
  emprestado: 'Emprestado',
  indisponivel: 'Indisponível'
};

const statusEmprestimoRotulos = {
  pendente: 'Pendente',
  ativo: 'Ativo',
  atrasado: 'Atrasado',
  devolvido: 'Devolvido',
  recusado: 'Recusado'
};

function formatarData(valor) {
  if (!valor) return '-';
  const texto = String(valor).slice(0, 10);
  const [ano, mes, dia] = texto.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

export default function AdminAcervoLivros() {
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const rotaBase =
    user?.tipo === 'coordenador'
      ? '/coordenador/biblioteca'
      : '/admin/biblioteca';

  const rotaCadastroLivro = `${rotaBase}/livro/novo`;

  const [subAba, setSubAba] = useState(() => {
    const valor = searchParams.get('subaba');
    return ['livros', 'solicitacoes', 'emprestimos'].includes(valor)
      ? valor
      : 'livros';
  });

  const [livros, setLivros] = useState([]);
  const [emprestimos, setEmprestimos] = useState([]);
  const [loadingLivros, setLoadingLivros] = useState(true);
  const [loadingEmprestimos, setLoadingEmprestimos] = useState(true);

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [ordenar, setOrdenar] = useState('titulo');

  const [buscaEmprestimo, setBuscaEmprestimo] = useState('');
  const [statusEmprestimo, setStatusEmprestimo] = useState('abertos');

  function mudarSubAba(novaAba) {
    setSubAba(novaAba);

    const novosParametros = new URLSearchParams(searchParams);
    novosParametros.set('subaba', novaAba);

    novosParametros.set('aba', 'acervo');

    setSearchParams(novosParametros, { replace: true });
  }

  async function carregarLivros(params = {}) {
    try {
      setLoadingLivros(true);
      const { data } = await api.get('/admin/biblioteca/livros', {
        params
      });
      setLivros(data.data || []);
    } catch (error) {
      toast(
        error.response?.data?.erro || 'Erro ao carregar os livros.',
        'erro'
      );
      setLivros([]);
    } finally {
      setLoadingLivros(false);
    }
  }

  async function carregarEmprestimos(params = {}) {
    try {
      setLoadingEmprestimos(true);
      const { data } = await api.get(
        '/admin/biblioteca/livros/emprestimos',
        { params }
      );
      setEmprestimos(data.data || []);
    } catch (error) {
      toast(
        error.response?.data?.erro ||
          'Erro ao carregar as solicitações e os empréstimos.',
        'erro'
      );
      setEmprestimos([]);
    } finally {
      setLoadingEmprestimos(false);
    }
  }

  useEffect(() => {
    Promise.all([carregarLivros(), carregarEmprestimos()]);
  }, []);

  const resumo = useMemo(() => {
    return {
      total: livros.length,
      disponiveis: livros.filter(item => item.status === 'disponivel').length,
      pendentes: emprestimos.filter(item => item.status === 'pendente').length,
      ativos: emprestimos.filter(item => item.status === 'ativo').length,
      atrasados: emprestimos.filter(item => item.status === 'atrasado').length
    };
  }, [livros, emprestimos]);

  const solicitacoesPendentes = useMemo(
    () => emprestimos.filter(item => item.status === 'pendente'),
    [emprestimos]
  );

  const emprestimosFiltrados = useMemo(() => {
    const termo = buscaEmprestimo.trim().toLowerCase();

    return emprestimos.filter(item => {
      const correspondeBusca =
        !termo ||
        `${item.livro_titulo || ''} ${item.nome_solicitante || ''} ${
          item.matricula_id || ''
        }`
          .toLowerCase()
          .includes(termo);

      let correspondeStatus = true;

      if (statusEmprestimo === 'abertos') {
        correspondeStatus = ['ativo', 'atrasado'].includes(item.status);
      } else if (statusEmprestimo) {
        correspondeStatus = item.status === statusEmprestimo;
      }

      return correspondeBusca && correspondeStatus;
    });
  }, [emprestimos, buscaEmprestimo, statusEmprestimo]);

  function pesquisarLivros(evento) {
    evento.preventDefault();
    carregarLivros({
      busca: busca.trim(),
      status,
      ordenar
    });
  }

  function limparLivros() {
    setBusca('');
    setStatus('');
    setOrdenar('titulo');
    carregarLivros();
  }

  function pesquisarEmprestimos(evento) {
    evento.preventDefault();
  }

  async function excluirLivro(id) {
    if (!window.confirm('Deseja remover este livro do acervo?')) return;

    try {
      await api.delete(`/admin/biblioteca/livros/${id}`);
      toast('Livro removido do acervo.');
      await carregarLivros();
    } catch (error) {
      toast(
        error.response?.data?.erro || 'Erro ao remover o livro.',
        'erro'
      );
    }
  }

  async function aprovarSolicitacao(solicitacao) {
    const confirmou = window.confirm(
      `Aprovar o empréstimo de “${solicitacao.livro_titulo}” para ${solicitacao.nome_solicitante}?`
    );

    if (!confirmou) return;

    try {
      const { data } = await api.put(
        `/admin/biblioteca/livros/emprestimos/${solicitacao.id}/aprovar`
      );

      toast(data.mensagem || 'Solicitação aprovada com sucesso.');
      await Promise.all([carregarEmprestimos(), carregarLivros()]);
    } catch (error) {
      toast(
        error.response?.data?.erro || 'Erro ao aprovar a solicitação.',
        'erro'
      );
    }
  }

  async function recusarSolicitacao(solicitacao) {
    const motivo = window.prompt(
      `Informe o motivo da recusa para “${solicitacao.livro_titulo}”:`,
      ''
    );

    if (motivo === null) return;

    try {
      const { data } = await api.put(
        `/admin/biblioteca/livros/emprestimos/${solicitacao.id}/recusar`,
        {
          motivo_recusa: motivo.trim() || 'Solicitação recusada.'
        }
      );

      toast(data.mensagem || 'Solicitação recusada com sucesso.');
      await carregarEmprestimos();
    } catch (error) {
      toast(
        error.response?.data?.erro || 'Erro ao recusar a solicitação.',
        'erro'
      );
    }
  }

  async function devolver(emprestimo) {
    if (
      !window.confirm(
        `Confirmar a devolução de “${emprestimo.livro_titulo}”?`
      )
    ) {
      return;
    }

    try {
      const { data } = await api.put(
        `/admin/biblioteca/livros/emprestimos/${emprestimo.id}/devolver`
      );
      toast(data.mensagem || 'Devolução registrada com sucesso.');
      await Promise.all([carregarEmprestimos(), carregarLivros()]);
    } catch (error) {
      toast(
        error.response?.data?.erro || 'Erro ao registrar a devolução.',
        'erro'
      );
    }
  }

  return (
    <>
      <div className="stats-grid dashboard-stats mb-24">
        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone verde">📚</div>
          <div>
            <div className="stat-valor">{resumo.total}</div>
            <div className="stat-label">Livros cadastrados</div>
          </div>
        </div>

        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone amarelo">✅</div>
          <div>
            <div className="stat-valor">{resumo.disponiveis}</div>
            <div className="stat-label">Títulos disponíveis</div>
          </div>
        </div>

        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone laranja">⏳</div>
          <div>
            <div className="stat-valor">{resumo.pendentes}</div>
            <div className="stat-label">Solicitações pendentes</div>
          </div>
        </div>

        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone verde">↗</div>
          <div>
            <div className="stat-valor">{resumo.ativos}</div>
            <div className="stat-label">Empréstimos ativos</div>
          </div>
        </div>

        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone vermelho">!</div>
          <div>
            <div className="stat-valor">{resumo.atrasados}</div>
            <div className="stat-label">Empréstimos atrasados</div>
          </div>
        </div>
      </div>

      <div className="acervo-abas-internas">
        <button
          type="button"
          className={subAba === 'livros' ? 'btn btn-primario' : 'btn btn-outline'}
          onClick={() => mudarSubAba('livros')}
        >
          Livros do acervo
        </button>

        <button
          type="button"
          className={
            subAba === 'solicitacoes' ? 'btn btn-primario' : 'btn btn-outline'
          }
          onClick={() => mudarSubAba('solicitacoes')}
        >
          Solicitações pendentes ({resumo.pendentes})
        </button>

        <button
          type="button"
          className={
            subAba === 'emprestimos' ? 'btn btn-primario' : 'btn btn-outline'
          }
          onClick={() => mudarSubAba('emprestimos')}
        >
          Empréstimos
        </button>
      </div>

      {subAba === 'livros' && (
        <>
          <div className="d-flex justify-between align-center gap-12 flex-wrap mb-16">
            <h3>Acervo de livros</h3>

            <Link to={rotaCadastroLivro} className="btn btn-primario">
              + Cadastrar livro
            </Link>
          </div>

          <form className="acervo-filtros" onSubmit={pesquisarLivros}>
            <div className="campo">
              <label>Busca</label>
              <input
                value={busca}
                onChange={evento => setBusca(evento.target.value)}
                placeholder="Título, autor ou ano"
              />
            </div>

            <div className="campo">
              <label>Status</label>
              <select
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
              <label>Ordenar por</label>
              <select
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

            <button type="button" className="btn btn-outline" onClick={limparLivros}>
              Limpar
            </button>
          </form>

          {loadingLivros ? (
            <Spinner />
          ) : livros.length === 0 ? (
            <div className="acervo-vazio">Nenhum livro cadastrado.</div>
          ) : (
            <div className="card p-0">
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Autor(es)</th>
                      <th>Ano</th>
                      <th>Editora</th>
                      <th>Exemplares</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {livros.map(livro => (
                      <tr key={livro.id}>
                        <td style={{ fontWeight: 700, minWidth: 220 }}>
                          {livro.titulo}
                        </td>
                        <td>{livro.autores}</td>
                        <td>{livro.ano_publicacao}</td>
                        <td>{livro.editora}</td>
                        <td>
                          {livro.exemplares_disponiveis}/
                          {livro.exemplares_total}
                        </td>
                        <td>
                          <span className={`acervo-status ${livro.status}`}>
                            {statusLivroRotulos[livro.status] || livro.status}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-8 flex-wrap">
                            <Link
                              to={`${rotaCadastroLivro}?id=${livro.id}`}
                              className="btn btn-outline btn-sm"
                            >
                              Editar
                            </Link>

                            {user?.tipo === 'admin' && (
                              <button
                                type="button"
                                className="btn btn-perigo btn-sm"
                                onClick={() => excluirLivro(livro.id)}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {subAba === 'solicitacoes' && (
        <>
          <div className="mb-16">
            <h3>Solicitações pendentes</h3>
            <p className="acervo-texto-apoio">
              O exemplar só será descontado do acervo após a aprovação.
            </p>
          </div>

          {loadingEmprestimos ? (
            <Spinner />
          ) : solicitacoesPendentes.length === 0 ? (
            <div className="acervo-vazio">
              Nenhuma solicitação aguardando análise.
            </div>
          ) : (
            <div className="card p-0">
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Livro</th>
                      <th>Solicitante</th>
                      <th>Matrícula/ID</th>
                      <th>Retirada</th>
                      <th>Devolução prevista</th>
                      <th>Solicitado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {solicitacoesPendentes.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, minWidth: 220 }}>
                          {item.livro_titulo}
                        </td>
                        <td>{item.nome_solicitante}</td>
                        <td>{item.matricula_id}</td>
                        <td>{formatarData(item.data_retirada)}</td>
                        <td>{formatarData(item.data_devolucao_prevista)}</td>
                        <td>{formatarData(item.criado_em)}</td>
                        <td>
                          <div className="d-flex gap-8 flex-wrap">
                            <button
                              type="button"
                              className="btn btn-primario btn-sm"
                              onClick={() => aprovarSolicitacao(item)}
                            >
                              Aprovar
                            </button>

                            <button
                              type="button"
                              className="btn btn-perigo btn-sm"
                              onClick={() => recusarSolicitacao(item)}
                            >
                              Recusar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {subAba === 'emprestimos' && (
        <>
          <form className="acervo-filtros" onSubmit={pesquisarEmprestimos}>
            <div className="campo">
              <label>Buscar empréstimo</label>
              <input
                value={buscaEmprestimo}
                onChange={evento => setBuscaEmprestimo(evento.target.value)}
                placeholder="Livro, solicitante ou matrícula"
              />
            </div>

            <div className="campo">
              <label>Status</label>
              <select
                value={statusEmprestimo}
                onChange={evento => setStatusEmprestimo(evento.target.value)}
              >
                <option value="abertos">Ativos e atrasados</option>
                <option value="ativo">Ativo</option>
                <option value="atrasado">Atrasado</option>
                <option value="devolvido">Devolvido</option>
                <option value="recusado">Recusado</option>
                <option value="pendente">Pendente</option>
                <option value="">Todos</option>
              </select>
            </div>

            <div />

            <button type="submit" className="btn btn-primario">
              Pesquisar
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setBuscaEmprestimo('');
                setStatusEmprestimo('abertos');
              }}
            >
              Limpar
            </button>
          </form>

          {loadingEmprestimos ? (
            <Spinner />
          ) : emprestimosFiltrados.length === 0 ? (
            <div className="acervo-vazio">Nenhum empréstimo encontrado.</div>
          ) : (
            <div className="card p-0">
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Livro</th>
                      <th>Solicitante</th>
                      <th>Matrícula/ID</th>
                      <th>Retirada</th>
                      <th>Devolução prevista</th>
                      <th>Status</th>
                      <th>Analisado por</th>
                      <th>Ação/observação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {emprestimosFiltrados.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, minWidth: 220 }}>
                          {item.livro_titulo}
                        </td>
                        <td>{item.nome_solicitante}</td>
                        <td>{item.matricula_id}</td>
                        <td>{formatarData(item.data_retirada)}</td>
                        <td>{formatarData(item.data_devolucao_prevista)}</td>
                        <td>
                          <span className={`acervo-status ${item.status}`}>
                            {statusEmprestimoRotulos[item.status] || item.status}
                          </span>
                        </td>
                        <td>{item.analisado_por_nome || '-'}</td>
                        <td>
                          {['ativo', 'atrasado'].includes(item.status) ? (
                            <button
                              type="button"
                              className="btn btn-primario btn-sm"
                              onClick={() => devolver(item)}
                            >
                              Devolver
                            </button>
                          ) : item.status === 'devolvido' ? (
                            <span>Devolvido em {formatarData(item.data_devolucao)}</span>
                          ) : item.status === 'recusado' ? (
                            <span>{item.motivo_recusa || 'Solicitação recusada.'}</span>
                          ) : (
                            <span>Aguardando análise</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
