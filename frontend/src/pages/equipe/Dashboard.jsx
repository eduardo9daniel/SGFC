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

export default function EquipeDashboard() {
  const { user } = useAuth();

  const [formacoes, setFormacoes] = useState([]);
  const [recentes, setRecentes] = useState([]);
  const [pessoasRegiaoDados, setPessoasRegiaoDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    Promise.all([
      api.get('/formacoes'),
      api.get('/formacoes?disponiveis=1'),
      api.get('/usuarios/dashboard')
    ])
      .then(([todas, abertas, dash]) => {
        if (!ativo) return;

        setFormacoes(todas.data.data || []);
        setRecentes((abertas.data.data || []).slice(0, 5));
        setPessoasRegiaoDados(dash.data.data?.acessos_por_regiao || []);
      })
      .catch(() => {
        if (ativo) {
          setErro('Não foi possível carregar os dados do painel da equipe.');
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const primeiroNome =
    user?.nome?.split(' ')[0] ||
    user?.nome_completo?.split(' ')[0] ||
    'Equipe';

  const pessoasPorRegiao = useMemo(() => {
    return organizarPessoasPorRegiao(pessoasRegiaoDados);
  }, [pessoasRegiaoDados]);

  const totalPessoasPorRegiao = useMemo(() => {
    return pessoasPorRegiao.reduce(
      (acc, item) => acc + Number(item.pessoas || 0),
      0
    );
  }, [pessoasPorRegiao]);

  const resumo = useMemo(() => {
    const abertas = formacoes.filter(f => f.status === 'aberta').length;

    const andamento = formacoes.filter(
      f => f.status === 'andamento' || f.status === 'em_andamento'
    ).length;

    const concluidas = formacoes.filter(
      f =>
        f.status === 'concluida' ||
        f.status === 'concluída' ||
        f.status === 'encerrada'
    ).length;

    const confirmadas = formacoes.filter(
      f => f.status === 'confirmada'
    ).length;

    const totalVagas = formacoes.reduce(
      (acc, f) => acc + Number(f.vagas || 0),
      0
    );

    const vagasDisponiveis = formacoes.reduce(
      (acc, f) => acc + Number(f.vagas_disponiveis || 0),
      0
    );

    const vagasOcupadas = Math.max(totalVagas - vagasDisponiveis, 0);

    const taxaOcupacao = totalVagas > 0
      ? Math.round((vagasOcupadas / totalVagas) * 100)
      : 0;

    const hoje = new Date();

    const proximas = [...formacoes]
      .filter(f => f.data_inicio && new Date(f.data_inicio) >= hoje)
      .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
      .slice(0, 4);

    return {
      abertas,
      andamento,
      concluidas,
      confirmadas,
      totalVagas,
      vagasDisponiveis,
      vagasOcupadas,
      taxaOcupacao,
      proximas
    };
  }, [formacoes]);

  if (carregando) {
    return (
      <PainelLayout titulo="Painel da Equipe">
        <Spinner />
      </PainelLayout>
    );
  }

  if (erro) {
    return (
      <PainelLayout titulo="Painel da Equipe">
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

  const cards = [
    {
      icon: '📚',
      valor: formacoes.length,
      label: 'Total de Formações',
      detalhe: 'Formações cadastradas no sistema',
      cor: 'laranja',
      to: '/equipe/formacoes'
    },
    {
      icon: '🟢',
      valor: resumo.abertas,
      label: 'Abertas',
      detalhe: 'Disponíveis para inscrição',
      cor: 'verde',
      to: '/equipe/formacoes'
    },
    {
      icon: '🟡',
      valor: resumo.andamento,
      label: 'Em Andamento',
      detalhe: 'Formações em curso',
      cor: 'amarelo',
      to: '/equipe/formacoes'
    },
    {
      icon: '✅',
      valor: resumo.concluidas,
      label: 'Concluídas',
      detalhe: 'Formações finalizadas',
      cor: 'verde',
      to: '/equipe/formacoes'
    },
    {
      icon: '📊',
      valor: `${resumo.taxaOcupacao}%`,
      label: 'Ocupação',
      detalhe: `${resumo.vagasOcupadas}/${resumo.totalVagas} vagas preenchidas`,
      cor: 'amarelo',
      to: '/equipe/formacoes'
    },
    {
      icon: '📅',
      valor: resumo.proximas.length,
      label: 'Próximas',
      detalhe: 'Formações com início futuro',
      cor: 'laranja',
      to: '/equipe/formacoes'
    }
  ];

  const alertas = [
    recentes.length > 0 && {
      icon: '📚',
      texto: `${recentes.length} formação(ões) disponível(is) para acompanhamento.`,
      tipo: 'info'
    },
    resumo.abertas > 0 && {
      icon: '🟢',
      texto: `${resumo.abertas} formação(ões) aberta(s) no momento.`,
      tipo: 'ok'
    },
    resumo.proximas.length > 0 && {
      icon: '📅',
      texto: `${resumo.proximas.length} formação(ões) com início próximo.`,
      tipo: 'info'
    },
    formacoes.length === 0 && {
      icon: '📋',
      texto: 'Nenhuma formação cadastrada no sistema.',
      tipo: 'neutro'
    }
  ].filter(Boolean);

  return (
    <PainelLayout titulo="Painel da Equipe">
      <div className="dashboard-equipe">
        <div className="dashboard-header">
          <div>
            <h2 className="dashboard-saudacao">
              Olá, {primeiroNome}! 👋
            </h2>

            <p className="dashboard-subtitulo">
              Acompanhe as formações disponíveis, o andamento das turmas e as próximas atividades.
            </p>
          </div>

          <div className="dashboard-header-acoes">
            <Link to="/equipe/perfil" className="btn btn-outline">
              👤 Meu Perfil
            </Link>

            <Link to="/equipe/formacoes" className="btn btn-primario">
              📚 Ver Formações
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
              Ocupação das Formações
            </div>

            <div className="ocupacao-box">
              <div>
                <strong>{resumo.taxaOcupacao}%</strong>
                <span>das vagas preenchidas nas formações cadastradas</span>
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
              Situação das Formações
            </div>

            <div className="status-lista">
              <div className="status-item verde">
                <span>Abertas</span>
                <strong>{resumo.abertas}</strong>
              </div>

              <div className="status-item amarelo">
                <span>Em andamento</span>
                <strong>{resumo.andamento}</strong>
              </div>

              <div className="status-item verde">
                <span>Concluídas</span>
                <strong>{resumo.concluidas}</strong>
              </div>

              <div className="status-item laranja">
                <span>Confirmadas</span>
                <strong>{resumo.confirmadas}</strong>
              </div>
            </div>
          </div>

          <div className="card dashboard-card-sombra">
            <div className="card-titulo">
              <span className="icone">⚠️</span>
              Avisos da Equipe
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
              <span className="icone">📋</span>
              Formações Recentes

              <Link to="/equipe/formacoes" className="link-card">
                Ver todas →
              </Link>
            </div>

            {recentes.length === 0 ? (
              <div className="vazio">
                <div className="vazio-icone">📚</div>
                <p>Nenhuma formação disponível no momento.</p>
              </div>
            ) : (
              <div className="formacoes-equipe-lista">
                {recentes.map(f => (
                  <div key={f.id} className="formacao-equipe-item">
                    <div className="formacao-equipe-icone">
                      📚
                    </div>

                    <div className="formacao-equipe-conteudo">
                      <div className="formacao-equipe-titulo">
                        {f.titulo}
                      </div>

                      <div className="formacao-equipe-detalhe">
                        {fmtData(f.data_inicio)}
                        {f.data_fim ? ` – ${fmtData(f.data_fim)}` : ''}
                        {f.carga_horaria ? ` · ${f.carga_horaria}h` : ''}
                      </div>

                      {(f.vagas || f.vagas_disponiveis) && (
                        <div className="formacao-equipe-vagas">
                          {f.vagas_disponiveis}/{f.vagas} vagas disponíveis
                        </div>
                      )}
                    </div>

                    <Badge status={f.status} />
                  </div>
                ))}
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
                      to="/equipe/formacoes"
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
                <Link to="/equipe/formacoes" className="btn btn-primario">
                  📚 Ver Formações
                </Link>

                <Link to="/equipe/perfil" className="btn btn-outline">
                  👤 Meu Perfil
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PainelLayout>
  );
}