import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

function normalizarTexto(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function textoPessoa(qtd) {
  const total = Number(qtd || 0);
  return total === 1 ? '1 pessoa' : `${total} pessoas`;
}

function textoAcesso(qtd) {
  const total = Number(qtd || 0);
  return total === 1 ? '1 pessoa acessou' : `${total} pessoas acessaram`;
}

function organizarPessoasPorRegiao(lista = []) {
  const mapa = new Map();

  lista.forEach(item => {
    const nomeRegiao = String(item.regiao || 'Sem região').trim();

    /*
      A chave mantém números e complementos.
      Assim, "Praias da Baía" e "Praias da Baía 2"
      continuam sendo regiões diferentes.
    */
    const chave = normalizarTexto(nomeRegiao);

    const anterior = mapa.get(chave);

    if (anterior) {
      mapa.set(chave, {
        regiao: anterior.regiao,
        pessoas: Number(anterior.pessoas || 0) + Number(item.pessoas || 0)
      });
    } else {
      mapa.set(chave, {
        regiao: nomeRegiao,
        pessoas: Number(item.pessoas || 0)
      });
    }
  });

  return Array.from(mapa.values()).sort((a, b) => {
    const pessoasA = Number(a.pessoas || 0);
    const pessoasB = Number(b.pessoas || 0);

    if (pessoasB !== pessoasA) {
      return pessoasB - pessoasA;
    }

    return a.regiao.localeCompare(b.regiao, 'pt-BR');
  });
}

export default function CoordDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    api.get('/usuarios/dashboard')
      .then(r => {
        if (ativo) setStats(r.data.data);
      })
      .catch(() => {
        if (ativo) {
          setErro('Não foi possível carregar os dados do dashboard.');
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  const primeiroNome =
    user?.nome?.split(' ')[0] ||
    user?.nome_completo?.split(' ')[0] ||
    'Coordenador';

  const formacoesRecentes = useMemo(() => {
    return stats?.formacoes_recentes || [];
  }, [stats]);

  const pessoasPorRegiao = useMemo(() => {
    return organizarPessoasPorRegiao(stats?.acessos_por_regiao || []);
  }, [stats]);

  const totalPessoasPorRegiao = useMemo(() => {
    return pessoasPorRegiao.reduce(
      (acc, item) => acc + Number(item.pessoas || 0),
      0
    );
  }, [pessoasPorRegiao]);

  const resumo = useMemo(() => {
    const totalVagas = formacoesRecentes.reduce(
      (acc, f) => acc + Number(f.vagas || 0),
      0
    );

    const vagasDisponiveis = formacoesRecentes.reduce(
      (acc, f) => acc + Number(f.vagas_disponiveis || 0),
      0
    );

    const vagasOcupadas = Math.max(totalVagas - vagasDisponiveis, 0);

    const taxaOcupacao = totalVagas > 0
      ? Math.round((vagasOcupadas / totalVagas) * 100)
      : 0;

    const abertas = formacoesRecentes.filter(f => f.status === 'aberta').length;

    const andamento = formacoesRecentes.filter(
      f => f.status === 'andamento' || f.status === 'em_andamento'
    ).length;

    const encerradas = formacoesRecentes.filter(
      f =>
        f.status === 'encerrada' ||
        f.status === 'concluida' ||
        f.status === 'concluída'
    ).length;

    const recusadas = formacoesRecentes.filter(
      f => f.status === 'recusada'
    ).length;

    const lotadas = formacoesRecentes.filter(
      f => Number(f.vagas_disponiveis || 0) <= 0
    ).length;

    const hoje = new Date();

    const proximas = [...formacoesRecentes]
      .filter(f => f.data_inicio && new Date(f.data_inicio) >= hoje)
      .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
      .slice(0, 4);

    return {
  totalVagas,
  vagasDisponiveis,
  vagasOcupadas,
  taxaOcupacao,
  abertas,
  andamento,
  encerradas,
  recusadas,
  lotadas,
  proximas
};
  }, [formacoesRecentes]);

  if (erro) {
    return (
      <PainelLayout titulo="Dashboard">
        <div className="card dashboard-card-sombra">
          <div className="vazio">
            <div className="vazio-icone">⚠️</div>
            <p>{erro}</p>

            <button
              className="btn btn-primario"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </PainelLayout>
    );
  }

  if (!stats) {
    return (
      <PainelLayout titulo="Dashboard">
        <Spinner />
      </PainelLayout>
    );
  }

  const cards = [
    {
      icon: '📚',
      valor: stats.total_formacoes || 0,
      label: 'Formações',
      detalhe: 'Formações sob acompanhamento',
      cor: 'laranja',
      to: '/coordenador/formacoes'
    },
    {
      icon: '🟢',
      valor: stats.formacoes_abertas || 0,
      label: 'Abertas',
      detalhe: 'Disponíveis para inscrição',
      cor: 'verde',
      to: '/coordenador/formacoes'
    },
    {
      icon: '📋',
      valor: stats.total_inscricoes || 0,
      label: 'Inscrições',
      detalhe: 'Inscrições registradas',
      cor: 'amarelo',
      to: '/coordenador/inscricoes'
    },
    {
      icon: '🎓',
      valor: stats.certificados_emitidos || 0,
      label: 'Certificados',
      detalhe: 'Certificados emitidos',
      cor: 'laranja',
      to: '/coordenador/certificados'
    },
    {
      icon: '📊',
      valor: `${resumo.taxaOcupacao}%`,
      label: 'Ocupação',
      detalhe: `${resumo.vagasOcupadas}/${resumo.totalVagas} vagas preenchidas`,
      cor: 'amarelo',
      to: '/coordenador/relatorios'
    },
    {
  icon: '✅',
  valor: stats.propostas_confirmadas || 0,
  label: 'Propostas Confirmadas',
  detalhe: 'Propostas aprovadas pela coordenação',
  cor: 'verde',
  to: '/coordenador/propostas-formacao'
}
  ];

  const alertas = [
    resumo.lotadas > 0 && {
      icon: '🚨',
      texto: `${resumo.lotadas} formação(ões) sem vagas disponíveis.`,
      tipo: 'critico'
    },
    resumo.abertas > 0 && {
      icon: '🟢',
      texto: `${resumo.abertas} formação(ões) abertas para inscrição.`,
      tipo: 'ok'
    },
    resumo.proximas.length > 0 && {
      icon: '📅',
      texto: `${resumo.proximas.length} formação(ões) com início próximo.`,
      tipo: 'info'
    },
    formacoesRecentes.length === 0 && {
      icon: '📚',
      texto: 'Nenhuma formação recente encontrada.',
      tipo: 'neutro'
    }
  ].filter(Boolean);

  return (
    <PainelLayout titulo="Dashboard">
      <div className="dashboard-coord">
        <div className="dashboard-header">
          <div>
            <h2 className="dashboard-saudacao">
              Olá, {primeiroNome}! 👋
            </h2>

            <p className="dashboard-subtitulo">
              Painel de coordenação •{' '}
              {new Date().toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          <div className="dashboard-header-acoes">
            <Link to="/coordenador/relatorios" className="btn btn-outline">
              📈 Relatórios
            </Link>

            <Link to="/coordenador/formacoes" className="btn btn-primario">
              + Nova Formação
            </Link>
          </div>
        </div>

        <div className="stats-grid dashboard-stats">
          {cards.map(c => (
            <Link
              key={c.label}
              to={c.to}
              className="stat-card stat-card-link animar-entrada dashboard-card-sombra"
            >
              <div className={`stat-icone ${c.cor}`}>
                {c.icon}
              </div>

              <div>
                <div className="stat-valor">{c.valor}</div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-detalhe">{c.detalhe}</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="card dashboard-card-sombra card-acessos-regiao">
          <div className="card-titulo card-titulo-com-total">
            <div>
              <span className="icone">🗺️</span>
              Pessoas por Zona/Região
            </div>

            <span className="card-total-regioes">
              {textoPessoa(totalPessoasPorRegiao)}
            </span>
          </div>

          {pessoasPorRegiao.length === 0 ? (
            <div className="vazio compacto">
              <p>Nenhuma pessoa por região encontrada.</p>
            </div>
          ) : (
            <div className="acessos-regiao-lista">
              {pessoasPorRegiao.map(item => {
                const pessoas = Number(item.pessoas || 0);

                const percentual = totalPessoasPorRegiao > 0
                  ? Math.round((pessoas / totalPessoasPorRegiao) * 100)
                  : 0;

                return (
                  <div
                    key={normalizarTexto(item.regiao)}
                    className="acesso-regiao-item"
                  >
                    <div className="acesso-regiao-topo">
                      <div>
                        <strong>{item.regiao}</strong>
                        <span>{textoAcesso(pessoas)}</span>
                      </div>

                      <div className="acesso-regiao-numero">
                        {textoPessoa(pessoas)} • {percentual}%
                      </div>
                    </div>

                    <div className="acesso-regiao-barra">
                      <div
                        className="acesso-regiao-preenchida"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dashboard-grid-resumo">
          <div className="card dashboard-card-sombra">
            <div className="card-titulo">
              <span className="icone">📊</span>
              Ocupação das Formações Recentes
            </div>

            <div className="ocupacao-box">
              <div>
                <strong>{resumo.taxaOcupacao}%</strong>
                <span>das vagas recentes preenchidas</span>
              </div>

              <div className="barra-progresso">
                <div
                  className="barra-progresso-preenchida"
                  style={{ width: `${resumo.taxaOcupacao}%` }}
                />
              </div>

              <div className="ocupacao-indicadores">
                <div>
                  <strong>{resumo.totalVagas}</strong>
                  <span>vagas totais</span>
                </div>

                <div>
                  <strong>{resumo.vagasOcupadas}</strong>
                  <span>ocupadas</span>
                </div>

                <div>
                  <strong>{resumo.vagasDisponiveis}</strong>
                  <span>disponíveis</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card dashboard-card-sombra">
            <div className="card-titulo">
              <span className="icone">🧭</span>
              Status Recentes
            </div>

            <div className="status-lista">
              <div className="status-item verde">
                <span>Abertas</span>
                <strong>{resumo.abertas}</strong>
              </div>

              <div className="status-item amarelo">
                <span>Confirmadas</span>
                <strong>{resumo.confirmadas}</strong>
              </div>

              <div className="status-item laranja">
                <span>Encerradas</span>
                <strong>{resumo.encerradas}</strong>
              </div>

              <div className="status-item laranja">
                <span>Recusadas</span>
                <strong>{resumo.recusadas}</strong>
              </div>
            </div>
          </div>

          <div className="card dashboard-card-sombra">
            <div className="card-titulo">
              <span className="icone">⚠️</span>
              Alertas da Coordenação
            </div>

            <div className="alertas-lista">
              {alertas.map((a, index) => (
                <div key={index} className={`alerta-item ${a.tipo}`}>
                  <span>{a.icon}</span>
                  <p>{a.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-grid-principal">
          <div className="card dashboard-card-sombra">
            <div className="card-titulo">
              <span className="icone">📚</span>
              Formações Recentes

              <Link to="/coordenador/formacoes" className="link-card">
                Ver todas →
              </Link>
            </div>

            {formacoesRecentes.length === 0 ? (
              <div className="vazio">
                <p>Nenhuma formação cadastrada.</p>
              </div>
            ) : (
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Formação</th>
                      <th>Período</th>
                      <th>Vagas</th>
                      <th>Ocupação</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {formacoesRecentes.map(f => {
                      const vagas = Number(f.vagas || 0);
                      const vagasDisponiveis = Number(f.vagas_disponiveis || 0);
                      const ocupadas = Math.max(vagas - vagasDisponiveis, 0);
                      const taxa = vagas > 0
                        ? Math.round((ocupadas / vagas) * 100)
                        : 0;

                      return (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 700, maxWidth: 260 }}>
                            {f.titulo}

                            {f.categoria && (
                              <div className="texto-secundario">
                                {f.categoria}
                              </div>
                            )}
                          </td>

                          <td style={{ fontSize: '.83rem', whiteSpace: 'nowrap' }}>
                            {fmtData(f.data_inicio)}
                            {f.data_fim ? ` – ${fmtData(f.data_fim)}` : ''}
                          </td>

                          <td>
                            {vagasDisponiveis}/{vagas}
                          </td>

                          <td>
                            <div className="mini-ocupacao">
                              <div className="mini-ocupacao-topo">
                                <span>{taxa}%</span>
                                <small>{ocupadas} ocupadas</small>
                              </div>

                              <div className="mini-barra">
                                <div
                                  className="mini-barra-preenchida"
                                  style={{ width: `${taxa}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td>
                            <Badge status={f.status} />
                          </td>

                          <td>
                            <Link
                              to={`/coordenador/frequencia?formacao_id=${f.id}`}
                              className="btn btn-outline btn-sm"
                            >
                              Frequência
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="dashboard-coluna-lateral">
            <div className="card dashboard-card-sombra">
              <div className="card-titulo">
                <span className="icone">📅</span>
                Próximas Formações
              </div>

              {resumo.proximas.length === 0 ? (
                <div className="vazio compacto">
                  <p>Nenhuma formação futura encontrada.</p>
                </div>
              ) : (
                <div className="proximas-lista">
                  {resumo.proximas.map(f => (
                    <Link
                      key={f.id}
                      to={`/coordenador/frequencia?formacao_id=${f.id}`}
                      className="proxima-item"
                    >
                      <div className="proxima-data">
                        {fmtData(f.data_inicio)}
                      </div>

                      <div>
                        <strong>{f.titulo}</strong>
                        <span>
                          {f.vagas_disponiveis}/{f.vagas} vagas disponíveis
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="card dashboard-card-sombra">
              <div className="card-titulo">
                <span className="icone">⚡</span>
                Ações Rápidas
              </div>

              <div className="acoes-rapidas">
                {[
                  ['/coordenador/formacoes', '📚 Nova Formação', 'btn-primario'],
                  ['/coordenador/frequencia', '✅ Registrar Frequência', 'btn-secundario'],
                  ['/coordenador/inscricoes', '📋 Acompanhar Inscrições', 'btn-outline'],
                  ['/coordenador/certificados', '🎓 Emitir Certificados', 'btn-outline'],
                  ['/coordenador/participantes', '👥 Participantes', 'btn-outline'],
                  ['/coordenador/relatorios', '📈 Relatórios', 'btn-outline']
                ].map(([to, label, cls]) => (
                  <Link key={to} to={to} className={`btn ${cls}`}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PainelLayout>
  );
}