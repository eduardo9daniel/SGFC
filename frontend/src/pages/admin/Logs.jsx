import { useEffect, useMemo, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import api from '../../api';

const FILTROS_INICIAIS = {
  busca: '',
  acao: '',
  usuario_id: '',
  tipo_usuario: '',
  data_inicio: '',
  data_fim: ''
};

function formatarDataHora(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function tempoRelativo(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';

  const diferencaSegundos = Math.round((data.getTime() - Date.now()) / 1000);
  const absoluto = Math.abs(diferencaSegundos);
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  if (absoluto < 60) return rtf.format(diferencaSegundos, 'second');
  if (absoluto < 3600) return rtf.format(Math.round(diferencaSegundos / 60), 'minute');
  if (absoluto < 86400) return rtf.format(Math.round(diferencaSegundos / 3600), 'hour');
  if (absoluto < 2592000) return rtf.format(Math.round(diferencaSegundos / 86400), 'day');
  if (absoluto < 31536000) return rtf.format(Math.round(diferencaSegundos / 2592000), 'month');
  return rtf.format(Math.round(diferencaSegundos / 31536000), 'year');
}

function iniciais(nome) {
  const partes = String(nome || 'Sistema')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!partes.length) return 'S';
  return `${partes[0]?.[0] || ''}${partes.length > 1 ? partes.at(-1)?.[0] || '' : ''}`.toUpperCase();
}

function rotuloPerfil(tipo) {
  const rotulos = {
    admin: 'Administrador',
    coordenador: 'Coordenador',
    equipe: 'Equipe',
    participante: 'Participante'
  };
  return rotulos[tipo] || 'Sem perfil';
}

function categoriaAcao(acao) {
  const texto = String(acao || '').toUpperCase();
  if (texto.includes('LOGIN') || texto.includes('ACESSO')) return 'acesso';
  if (texto.includes('CERT')) return 'certificado';
  if (texto.includes('INSCR')) return 'inscricao';
  if (texto.includes('USUAR') || texto.includes('SENHA') || texto.includes('CADAST')) return 'usuario';
  if (texto.includes('EXCL') || texto.includes('REVOG') || texto.includes('CANCEL')) return 'atencao';
  return 'sistema';
}

function paginasVisiveis(atual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const paginas = new Set([1, total, atual - 1, atual, atual + 1]);
  if (atual <= 3) [2, 3, 4].forEach(p => paginas.add(p));
  if (atual >= total - 2) [total - 3, total - 2, total - 1].forEach(p => paginas.add(p));

  const ordenadas = [...paginas]
    .filter(p => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const resultado = [];
  ordenadas.forEach((pagina, indice) => {
    if (indice > 0 && pagina - ordenadas[indice - 1] > 1) {
      resultado.push(`reticencias-${pagina}`);
    }
    resultado.push(pagina);
  });

  return resultado;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [resumo, setResumo] = useState({
    total: 0,
    atividades_hoje: 0,
    usuarios_distintos: 0,
    ips_distintos: 0,
    registros_sem_usuario: 0,
    primeiro_registro: null,
    ultimo_registro: null
  });
  const [acoesFrequentes, setAcoesFrequentes] = useState([]);
  const [opcoes, setOpcoes] = useState({ acoes: [], usuarios: [] });
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIAIS);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [logSelecionado, setLogSelecionado] = useState(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setLoading(true);
      setErro('');

      try {
        const { data } = await api.get('/relatorios/logs', {
          params: {
            ...filtrosAplicados,
            p: pagina,
            por_pagina: porPagina
          },
          signal: controller.signal
        });

        setLogs(data.data || []);
        setResumo(data.resumo || {});
        setAcoesFrequentes(data.acoes_mais_frequentes || []);
        setOpcoes(data.opcoes || { acoes: [], usuarios: [] });
        setTotalPaginas(Math.max(1, Number(data.total_paginas || 1)));
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setErro(error.response?.data?.erro || 'Não foi possível carregar os logs de atividades.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    carregar();
    return () => controller.abort();
  }, [pagina, porPagina, filtrosAplicados, refreshKey]);

  useEffect(() => {
    if (!logSelecionado) return undefined;

    function fecharComEsc(event) {
      if (event.key === 'Escape') setLogSelecionado(null);
    }

    document.addEventListener('keydown', fecharComEsc);
    return () => document.removeEventListener('keydown', fecharComEsc);
  }, [logSelecionado]);

  const quantidadeFiltros = useMemo(() => {
    return Object.values(filtrosAplicados).filter(Boolean).length;
  }, [filtrosAplicados]);

  const paginas = useMemo(() => paginasVisiveis(pagina, totalPaginas), [pagina, totalPaginas]);

  const maiorFrequencia = useMemo(() => {
    return Math.max(...acoesFrequentes.map(item => Number(item.total || 0)), 1);
  }, [acoesFrequentes]);

  function alterarFiltro(campo, valor) {
    setFiltros(anterior => ({ ...anterior, [campo]: valor }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setPagina(1);
    setFiltrosAplicados({ ...filtros });
  }

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS);
    setFiltrosAplicados(FILTROS_INICIAIS);
    setPagina(1);
  }

  async function exportarCsv() {
    setExportando(true);
    setErro('');

    try {
      const resposta = await api.get('/relatorios/logs/exportar', {
        params: filtrosAplicados,
        responseType: 'blob'
      });

      const url = URL.createObjectURL(resposta.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-atividades-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível exportar os logs.');
    } finally {
      setExportando(false);
    }
  }

  const cards = [
    {
      icone: '🗂️',
      valor: Number(resumo.total || 0).toLocaleString('pt-BR'),
      titulo: 'Registros encontrados',
      detalhe: quantidadeFiltros ? `${quantidadeFiltros} filtro(s) aplicado(s)` : 'Todo o histórico disponível',
      cor: 'laranja'
    },
    {
      icone: '⚡',
      valor: Number(resumo.atividades_hoje || 0).toLocaleString('pt-BR'),
      titulo: 'Atividades hoje',
      detalhe: 'Dentro dos filtros selecionados',
      cor: 'amarelo'
    },
    {
      icone: '👥',
      valor: Number(resumo.usuarios_distintos || 0).toLocaleString('pt-BR'),
      titulo: 'Usuários envolvidos',
      detalhe: `${Number(resumo.registros_sem_usuario || 0)} registro(s) sem usuário`,
      cor: 'verde'
    },
    {
      icone: '🌐',
      valor: Number(resumo.ips_distintos || 0).toLocaleString('pt-BR'),
      titulo: 'Endereços IP',
      detalhe: 'Origens distintas registradas',
      cor: 'azul'
    }
  ];

  return (
    <PainelLayout titulo="Logs de Atividades">
      <div className="logs-admin">
        <header className="logs-header">
          <div>
            <h2 className="logs-titulo">Central de logs e auditoria</h2>
            <p className="logs-subtitulo">
              Consulte acessos e operações registradas para acompanhar o uso do sistema.
            </p>
          </div>

          <div className="logs-header-acoes">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setRefreshKey(valor => valor + 1)}
              disabled={loading}
            >
              🔄 Atualizar
            </button>
            <button
              type="button"
              className="btn btn-secundario"
              onClick={exportarCsv}
              disabled={exportando || Number(resumo.total || 0) === 0}
            >
              {exportando ? 'Exportando…' : '⬇️ Exportar CSV'}
            </button>
          </div>
        </header>

        {erro && (
          <div className="alerta alerta-erro" role="alert">
            ⚠️ {erro}
          </div>
        )}

        <section className="logs-stats" aria-label="Resumo dos logs">
          {cards.map(card => (
            <article className="stat-card dashboard-card-sombra" key={card.titulo}>
              <div className={`stat-icone ${card.cor}`}>{card.icone}</div>
              <div>
                <div className="stat-valor">{card.valor}</div>
                <div className="stat-label">{card.titulo}</div>
                <div className="stat-detalhe">{card.detalhe}</div>
              </div>
            </article>
          ))}
        </section>

        <section className="card logs-filtros-card dashboard-card-sombra">
          <div className="logs-card-cabecalho">
            <div>
              <h3>🔎 Filtros de auditoria</h3>
              <p>Combine os campos para localizar uma operação específica.</p>
            </div>
            {quantidadeFiltros > 0 && (
              <span className="logs-filtros-contador">{quantidadeFiltros} ativo(s)</span>
            )}
          </div>

          <form className="logs-filtros-grid" onSubmit={aplicarFiltros}>
            <div className="campo logs-campo-busca">
              <label htmlFor="logs-busca">Busca geral</label>
              <input
                id="logs-busca"
                type="search"
                value={filtros.busca}
                onChange={event => alterarFiltro('busca', event.target.value)}
                placeholder="ID, usuário, e-mail, ação, descrição ou IP"
              />
            </div>

            <div className="campo">
              <label htmlFor="logs-acao">Ação</label>
              <select
                id="logs-acao"
                value={filtros.acao}
                onChange={event => alterarFiltro('acao', event.target.value)}
              >
                <option value="">Todas as ações</option>
                {(opcoes.acoes || []).map(acao => (
                  <option value={acao} key={acao}>{acao}</option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="logs-usuario">Usuário</label>
              <select
                id="logs-usuario"
                value={filtros.usuario_id}
                onChange={event => alterarFiltro('usuario_id', event.target.value)}
              >
                <option value="">Todos os usuários</option>
                {(opcoes.usuarios || []).map(usuario => (
                  <option value={usuario.id} key={usuario.id}>
                    {usuario.nome_completo} — {usuario.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="logs-perfil">Perfil</label>
              <select
                id="logs-perfil"
                value={filtros.tipo_usuario}
                onChange={event => alterarFiltro('tipo_usuario', event.target.value)}
              >
                <option value="">Todos os perfis</option>
                <option value="admin">Administrador</option>
                <option value="coordenador">Coordenador</option>
                <option value="equipe">Equipe</option>
                <option value="participante">Participante</option>
              </select>
            </div>

            <div className="campo">
              <label htmlFor="logs-inicio">Data inicial</label>
              <input
                id="logs-inicio"
                type="date"
                value={filtros.data_inicio}
                onChange={event => alterarFiltro('data_inicio', event.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="logs-fim">Data final</label>
              <input
                id="logs-fim"
                type="date"
                value={filtros.data_fim}
                min={filtros.data_inicio || undefined}
                onChange={event => alterarFiltro('data_fim', event.target.value)}
              />
            </div>

            <div className="logs-filtros-acoes">
              <button type="submit" className="btn btn-primario">
                Aplicar filtros
              </button>
              <button type="button" className="btn btn-outline" onClick={limparFiltros}>
                Limpar
              </button>
            </div>
          </form>
        </section>

        <div className="logs-grid-conteudo">
          <section className="card logs-tabela-card dashboard-card-sombra">
            <div className="logs-card-cabecalho logs-tabela-cabecalho">
              <div>
                <h3>📋 Histórico de atividades</h3>
                <p>
                  {Number(resumo.total || 0).toLocaleString('pt-BR')} registro(s)
                  {resumo.ultimo_registro ? ` • último ${tempoRelativo(resumo.ultimo_registro)}` : ''}
                </p>
              </div>

              <label className="logs-por-pagina">
                <span>Exibir</span>
                <select
                  value={porPagina}
                  onChange={event => {
                    setPorPagina(Number(event.target.value));
                    setPagina(1);
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="logs-carregando" aria-live="polite">
                <div className="spinner" />
                <span>Carregando registros…</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="vazio">
                <div className="vazio-icone">🔍</div>
                <p>Nenhum log foi encontrado com os filtros informados.</p>
                {quantidadeFiltros > 0 && (
                  <button type="button" className="btn btn-outline" onClick={limparFiltros}>
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="tabela-wrapper logs-tabela-wrapper">
                  <table className="tabela logs-tabela">
                    <thead>
                      <tr>
                        <th>Registro</th>
                        <th>Usuário</th>
                        <th>Perfil</th>
                        <th>Ação</th>
                        <th>Descrição</th>
                        <th>IP</th>
                        <th>Data e hora</th>
                        <th aria-label="Ações" />
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td className="logs-id">#{log.id}</td>
                          <td>
                            <div className="logs-usuario">
                              <span className="logs-avatar">{iniciais(log.nome_completo)}</span>
                              <span>
                                <strong>{log.nome_completo || 'Ação do sistema'}</strong>
                                <small>{log.usuario_email || (log.usuario_id ? `Usuário #${log.usuario_id}` : 'Sem usuário associado')}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            {log.usuario_tipo ? (
                              <span className={`badge badge-${log.usuario_tipo}`}>
                                {rotuloPerfil(log.usuario_tipo)}
                              </span>
                            ) : (
                              <span className="logs-sem-dado">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`logs-acao-badge ${categoriaAcao(log.acao)}`}>
                              {log.acao || 'SEM_AÇÃO'}
                            </span>
                          </td>
                          <td>
                            <span className="logs-descricao" title={log.descricao || ''}>
                              {log.descricao || 'Sem descrição'}
                            </span>
                          </td>
                          <td>
                            <code className="logs-ip">{log.ip || '—'}</code>
                          </td>
                          <td>
                            <div className="logs-data">
                              <strong>{formatarDataHora(log.criado_em)}</strong>
                              <small>{tempoRelativo(log.criado_em)}</small>
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="logs-detalhes-botao"
                              onClick={() => setLogSelecionado(log)}
                              aria-label={`Ver detalhes do registro ${log.id}`}
                              title="Ver detalhes"
                            >
                              👁️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="logs-rodape-tabela">
                  <span>
                    Página {pagina} de {totalPaginas}
                  </span>

                  {totalPaginas > 1 && (
                    <nav className="paginacao" aria-label="Paginação dos logs">
                      <button
                        type="button"
                        className="paginacao-botao"
                        disabled={pagina === 1}
                        onClick={() => setPagina(valor => Math.max(1, valor - 1))}
                        aria-label="Página anterior"
                      >
                        ‹
                      </button>

                      {paginas.map(item => typeof item === 'number' ? (
                        <button
                          type="button"
                          key={item}
                          className={`paginacao-botao ${item === pagina ? 'ativo' : ''}`}
                          onClick={() => setPagina(item)}
                          aria-current={item === pagina ? 'page' : undefined}
                        >
                          {item}
                        </button>
                      ) : (
                        <span className="logs-paginacao-reticencias" key={item}>…</span>
                      ))}

                      <button
                        type="button"
                        className="paginacao-botao"
                        disabled={pagina === totalPaginas}
                        onClick={() => setPagina(valor => Math.min(totalPaginas, valor + 1))}
                        aria-label="Próxima página"
                      >
                        ›
                      </button>
                    </nav>
                  )}
                </div>
              </>
            )}
          </section>

          <aside className="card logs-ranking-card dashboard-card-sombra">
            <div className="logs-card-cabecalho">
              <div>
                <h3>📊 Ações mais frequentes</h3>
                <p>Distribuição dentro da consulta atual.</p>
              </div>
            </div>

            {acoesFrequentes.length ? (
              <div className="logs-ranking-lista">
                {acoesFrequentes.map((item, indice) => (
                  <div className="logs-ranking-item" key={item.acao}>
                    <div className="logs-ranking-topo">
                      <span className="logs-ranking-posicao">{indice + 1}</span>
                      <strong>{item.acao}</strong>
                      <span>{Number(item.total || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="logs-ranking-barra">
                      <div
                        className="logs-ranking-preenchimento"
                        style={{ width: `${Math.max(6, (Number(item.total || 0) / maiorFrequencia) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="vazio compacto">Sem dados para exibir.</div>
            )}

            <div className="logs-periodo-info">
              <div>
                <span>Primeiro registro</span>
                <strong>{formatarDataHora(resumo.primeiro_registro)}</strong>
              </div>
              <div>
                <span>Último registro</span>
                <strong>{formatarDataHora(resumo.ultimo_registro)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {logSelecionado && (
        <div
          className="logs-modal-overlay"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setLogSelecionado(null);
          }}
        >
          <section
            className="logs-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logs-modal-titulo"
          >
            <header className="logs-modal-header">
              <div>
                <span className="logs-modal-eyebrow">Registro #{logSelecionado.id}</span>
                <h3 id="logs-modal-titulo">Detalhes da atividade</h3>
              </div>
              <button
                type="button"
                className="logs-modal-fechar"
                onClick={() => setLogSelecionado(null)}
                aria-label="Fechar detalhes"
              >
                ×
              </button>
            </header>

            <div className="logs-modal-body">
              <div className="logs-modal-destaque">
                <span className={`logs-acao-badge ${categoriaAcao(logSelecionado.acao)}`}>
                  {logSelecionado.acao || 'SEM_AÇÃO'}
                </span>
                <strong>{formatarDataHora(logSelecionado.criado_em)}</strong>
                <small>{tempoRelativo(logSelecionado.criado_em)}</small>
              </div>

              <dl className="logs-detalhes-grid">
                <div>
                  <dt>Usuário</dt>
                  <dd>{logSelecionado.nome_completo || 'Ação do sistema'}</dd>
                </div>
                <div>
                  <dt>ID do usuário</dt>
                  <dd>{logSelecionado.usuario_id || 'Não associado'}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>{logSelecionado.usuario_email || 'Não disponível'}</dd>
                </div>
                <div>
                  <dt>Perfil</dt>
                  <dd>{rotuloPerfil(logSelecionado.usuario_tipo)}</dd>
                </div>
                <div>
                  <dt>Status do usuário</dt>
                  <dd>
                    {logSelecionado.usuario_status === null || logSelecionado.usuario_status === undefined
                      ? 'Não disponível'
                      : Number(logSelecionado.usuario_status) === 1 ? 'Ativo' : 'Inativo'}
                  </dd>
                </div>
                <div>
                  <dt>Endereço IP</dt>
                  <dd><code>{logSelecionado.ip || 'Não registrado'}</code></dd>
                </div>
              </dl>

              <div className="logs-modal-descricao">
                <span>Descrição completa</span>
                <p>{logSelecionado.descricao || 'Este registro não possui descrição.'}</p>
              </div>
            </div>

            <footer className="logs-modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setLogSelecionado(null)}>
                Fechar
              </button>
            </footer>
          </section>
        </div>
      )}
    </PainelLayout>
  );
}