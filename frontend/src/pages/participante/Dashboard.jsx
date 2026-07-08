import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function PartDashboard() {
  const { user } = useAuth();

  const [dados, setDados] = useState(null);
  const [formacoes, setFormacoes] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    Promise.all([
      api.get('/usuarios/dashboard/participante'),
      api.get('/formacoes?disponiveis=1'),
    ])
      .then(([d, f]) => {
        if (!ativo) return;

        setDados(d.data.data);
        setFormacoes((f.data.data || []).slice(0, 4));
      })
      .catch(() => {
        if (ativo) {
          setErro('Não foi possível carregar os dados do seu painel.');
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  const primeiroNome = user?.nome?.split(' ')[0] || 'Participante';

  const inscricoes = useMemo(() => {
    return dados?.inscricoes || [];
  }, [dados]);

  const resumo = useMemo(() => {
    const confirmadas = inscricoes.filter(
      i => i.status === 'confirmada'
    ).length;

    const pendentes = inscricoes.filter(
      i => i.status === 'pendente'
    ).length;

    const concluidas = inscricoes.filter(
      i =>
        i.status_formacao === 'concluida' ||
        i.status_formacao === 'concluída' ||
        i.status_formacao === 'encerrada'
    ).length;

    const emAndamento = inscricoes.filter(
      i =>
        i.status_formacao === 'em_andamento' ||
        i.status_formacao === 'andamento' ||
        i.status_formacao === 'aberta'
    ).length;

    const canceladas = inscricoes.filter(
      i =>
        i.status === 'cancelada' ||
        i.status === 'recusada'
    ).length;

    const totalInscricoes = inscricoes.length;

    const progresso = totalInscricoes > 0
      ? Math.round((concluidas / totalInscricoes) * 100)
      : 0;

    const proximas = [...inscricoes]
      .filter(i => i.data_inicio && new Date(i.data_inicio) >= new Date())
      .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio))
      .slice(0, 4);

    return {
      confirmadas,
      pendentes,
      concluidas,
      emAndamento,
      canceladas,
      totalInscricoes,
      progresso,
      proximas,
    };
  }, [inscricoes]);

  if (erro) {
    return (
      <PainelLayout titulo="Meu Painel">
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

  if (!dados) {
    return (
      <PainelLayout titulo="Meu Painel">
        <Spinner />
      </PainelLayout>
    );
  }

  const cards = [
    {
      icon: '📋',
      valor: resumo.confirmadas,
      label: 'Inscrições Ativas',
      detalhe: 'Formações confirmadas',
      cor: 'laranja',
      to: '/participante/inscricoes',
    },
    {
      icon: '✅',
      valor: resumo.concluidas,
      label: 'Concluídas',
      detalhe: 'Formações finalizadas',
      cor: 'verde',
      to: '/participante/inscricoes',
    },
    {
      icon: '🎓',
      valor: dados.total_certificados || 0,
      label: 'Certificados',
      detalhe: 'Certificados obtidos',
      cor: 'amarelo',
      to: '/participante/certificados',
    },
    {
      icon: '📚',
      valor: formacoes.length,
      label: 'Disponíveis',
      detalhe: 'Formações abertas',
      cor: 'laranja',
      to: '/participante/formacoes',
    },
    {
      icon: '📊',
      valor: `${resumo.progresso}%`,
      label: 'Progresso',
      detalhe: 'Formações concluídas',
      cor: 'amarelo',
      to: '/participante/frequencia',
    },
    {
      icon: '🟢',
      valor: resumo.emAndamento,
      label: 'Em Andamento',
      detalhe: 'Formações em curso',
      cor: 'verde',
      to: '/participante/inscricoes',
    },
  ];

  const alertas = [
    resumo.pendentes > 0 && {
      icon: '🟡',
      texto: `${resumo.pendentes} inscrição(ões) aguardando confirmação.`,
      tipo: 'info',
    },
    resumo.proximas.length > 0 && {
      icon: '📅',
      texto: `${resumo.proximas.length} formação(ões) com início próximo.`,
      tipo: 'ok',
    },
    formacoes.length > 0 && {
      icon: '📚',
      texto: `${formacoes.length} formação(ões) aberta(s) para inscrição.`,
      tipo: 'info',
    },
    inscricoes.length === 0 && {
      icon: '📋',
      texto: 'Você ainda não possui inscrições registradas.',
      tipo: 'neutro',
    },
  ].filter(Boolean);

  return (
    <PainelLayout titulo="Meu Painel">
      <div className="dashboard-part">
        <div className="dashboard-header">
          <div>
            <h2 className="dashboard-saudacao">
              Olá, {primeiroNome}! 👋
            </h2>

            <p className="dashboard-subtitulo">
              Acompanhe suas formações, inscrições, frequência e certificados.
            </p>
          </div>

          <div className="dashboard-header-acoes">
            <Link to="/participante/certificados" className="btn btn-outline">
              🎓 Meus Certificados
            </Link>

            <Link to="/participante/formacoes" className="btn btn-primario">
              📚 Ver Formações Abertas
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

        <div className="dashboard-grid-resumo">
          <div className="card dashboard-card-sombra">
            <div className="card-titulo">
              <span className="icone">📊</span>
              Meu Progresso
            </div>

            <div className="ocupacao-box">
              <div>
                <strong>{resumo.progresso}%</strong>
                <span>das suas inscrições foram concluídas</span>
              </div>

              <div className="barra-progresso">
                <div
                  className="barra-progresso-preenchida"
                  style={{ width: `${resumo.progresso}%` }}
                />
              </div>

              <div className="ocupacao-indicadores">
                <div>
                  <strong>{resumo.totalInscricoes}</strong>
                  <span>inscrições</span>
                </div>

                <div>
                  <strong>{resumo.concluidas}</strong>
                  <span>concluídas</span>
                </div>

                <div>
                  <strong>{dados.total_certificados || 0}</strong>
                  <span>certificados</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card dashboard-card-sombra">
            <div className="card-titulo">
              <span className="icone">🧭</span>
              Situação das Inscrições
            </div>

            <div className="status-lista">
              <div className="status-item verde">
                <span>Confirmadas</span>
                <strong>{resumo.confirmadas}</strong>
              </div>

              <div className="status-item amarelo">
                <span>Pendentes</span>
                <strong>{resumo.pendentes}</strong>
              </div>

              <div className="status-item verde">
                <span>Concluídas</span>
                <strong>{resumo.concluidas}</strong>
              </div>

              <div className="status-item laranja">
                <span>Canceladas</span>
                <strong>{resumo.canceladas}</strong>
              </div>
            </div>
          </div>

          <div className="card dashboard-card-sombra">
            <div className="card-titulo">
              <span className="icone">⚠️</span>
              Avisos do Participante
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
              Minhas Inscrições

              <Link to="/participante/inscricoes" className="link-card">
                Ver todas →
              </Link>
            </div>

            {inscricoes.length === 0 ? (
              <div className="vazio">
                <div className="vazio-icone">📚</div>
                <p>Você ainda não se inscreveu em nenhuma formação.</p>

                <Link
                  to="/participante/formacoes"
                  className="btn btn-primario"
                  style={{ marginTop: 12 }}
                >
                  Ver Formações
                </Link>
              </div>
            ) : (
              <div className="inscricoes-lista">
                {inscricoes.slice(0, 5).map(i => (
                  <div key={i.id} className="inscricao-item">
                    <div className="inscricao-icone">
                      📚
                    </div>

                    <div className="inscricao-conteudo">
                      <div className="inscricao-titulo">
                        {i.titulo}
                      </div>

                      <div className="inscricao-detalhe">
                        {fmtData(i.data_inicio)}
                        {i.data_fim ? ` – ${fmtData(i.data_fim)}` : ''}
                        {i.carga_horaria ? ` · ${i.carga_horaria}h` : ''}
                      </div>
                    </div>

                    <Badge status={i.status_formacao || i.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dashboard-coluna-lateral">
            <div className="card dashboard-card-sombra">
              <div className="card-titulo">
                <span className="icone">📚</span>
                Formações Abertas
              </div>

              {formacoes.length === 0 ? (
                <div className="vazio compacto">
                  <p>Nenhuma formação aberta no momento.</p>
                </div>
              ) : (
                <div className="proximas-lista">
                  {formacoes.map(f => (
                    <Link
                      key={f.id}
                      to="/participante/formacoes"
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
                  ['/participante/formacoes', '📚 Explorar Formações', 'btn-primario'],
                  ['/participante/inscricoes', '📋 Minhas Inscrições', 'btn-secundario'],
                  ['/participante/frequencia', '✅ Minha Frequência', 'btn-outline'],
                  ['/participante/certificados', '🎓 Meus Certificados', 'btn-outline'],
                  ['/participante/perfil', '👤 Editar Perfil', 'btn-outline'],
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