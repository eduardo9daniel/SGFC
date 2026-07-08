import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const usuario = JSON.parse(localStorage.getItem('user') || '{}');
  const tipoUsuario = usuario.tipo || usuario.tipo_usuario;
  const isEquipe = tipoUsuario === 'equipe';

  async function carregar() {
    setLoading(true);

    try {
      const { data } = await api.get('/notificacoes');
      setNotificacoes(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function marcarComoLida(id) {
    await api.patch(`/notificacoes/${id}/lida`);

    setNotificacoes(prev =>
      prev.map(n =>
        n.id === id ? { ...n, lida: 1 } : n
      )
    );
  }

  function isPropostaRecusada(notificacao) {
    const tipo = String(notificacao.tipo || '').toLowerCase();
    const titulo = String(notificacao.titulo || '').toLowerCase();
    const mensagem = String(notificacao.mensagem || '').toLowerCase();

    return (
      tipo === 'proposta_recusada' ||
      titulo.includes('recusada') ||
      titulo.includes('cancelada') ||
      mensagem.includes('recusada') ||
      mensagem.includes('cancelada')
    );
  }

  function obterDestino(notificacao) {
  const tipo = String(notificacao.tipo || '').toLowerCase();
  const referenciaId = notificacao.referencia_id;

  if (notificacao.link && notificacao.link !== '#' && notificacao.link !== '/') {
    return notificacao.link;
  }

  if (tipo === 'nova_proposta_formacao' && referenciaId) {
    return `/coordenador/propostas-formacao/${referenciaId}`;
  }

  if (tipo === 'proposta_confirmada' && referenciaId) {
    return `/equipe/minhas-propostas/${referenciaId}`;
  }

  if (tipo === 'proposta_recusada' && referenciaId) {
    return `/equipe/minhas-propostas/${referenciaId}`;
  }

  return null;
}

  async function abrirNotificacao(event, notificacao) {
    event.preventDefault();
    event.stopPropagation();

    const destino = obterDestino(notificacao);

    if (!destino) {
      return;
    }

    try {
      if (!notificacao.lida) {
        await api.patch(`/notificacoes/${notificacao.id}/lida`);
      }
    } catch {
      // Mesmo se falhar ao marcar como lida, mantém a navegação.
    }

    navigate(destino);
  }

  useEffect(() => {
    carregar();
  }, []);

  if (loading) {
    return (
      <PainelLayout titulo="Notificações">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Notificações">
      <div className="mb-24">
        <h2>Notificações</h2>
        <p style={{ color: 'var(--cinza-600)', fontSize: '.9rem' }}>
          Acompanhe as atualizações do sistema.
        </p>
      </div>

      <div className="card">
        {notificacoes.length === 0 && (
          <p>Nenhuma notificação encontrada.</p>
        )}

        {notificacoes.map(n => {
          const recusada = isPropostaRecusada(n);
          const destino = obterDestino(n);
          const lida = Number(n.lida) === 1;

          const mostrarBotaoAbrir = !!destino;

          return (
            <div
              key={n.id}
              style={{
                padding: '16px 0',
                borderBottom: '1px solid var(--cinza-200)',
                opacity: 1
              }}
            >
              <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>
                {n.titulo}
              </h3>

              <p style={{ color: 'var(--cinza-700)', marginBottom: 8 }}>
                {n.mensagem}
              </p>

              <div className="d-flex gap-8">
                {mostrarBotaoAbrir && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={(event) => abrirNotificacao(event, n)}
                  >
                    Abrir
                  </button>
                )}

                {lida ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: '1px solid #16a34a',
                      cursor: 'default',
                      opacity: 1
                    }}
                  >
                    Visualizado
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primario btn-sm"
                    onClick={() => marcarComoLida(n.id)}
                  >
                    Marcar como lida
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PainelLayout>
  );
}