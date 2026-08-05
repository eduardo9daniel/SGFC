import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import {
  obterDestinoNotificacao,
  obterRotaNotificacoes
} from '../../utils/notificacoes';

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { user } = useAuth();

  const tipoUsuario = String(
    user?.tipo || user?.tipo_usuario || ''
  ).toLowerCase();

  async function carregar() {
    setLoading(true);

    try {
      const { data } = await api.get('/notificacoes');

      setNotificacoes(
        Array.isArray(data?.data)
          ? data.data
          : []
      );
    } catch (error) {
      console.error(
        'Erro ao carregar notificações:',
        error
      );

      setNotificacoes([]);
    } finally {
      setLoading(false);
    }
  }

  async function marcarComoLida(id) {
    try {
      await api.patch(
        `/notificacoes/${id}/lida`
      );

      setNotificacoes(prev =>
        prev.map(notificacao =>
          String(notificacao.id) === String(id)
            ? {
                ...notificacao,
                lida: 1
              }
            : notificacao
        )
      );
    } catch (error) {
      console.error(
        'Erro ao marcar notificação como lida:',
        error
      );
    }
  }

  function obterDestino(notificacao) {
    const destino = obterDestinoNotificacao(
      notificacao,
      tipoUsuario
    );

    const rotaTelaNotificacoes =
      obterRotaNotificacoes(tipoUsuario);

    /*
     * Não exibe o botão Abrir quando o destino
     * for a própria página de notificações.
     */
    if (
      !destino ||
      destino === rotaTelaNotificacoes
    ) {
      return null;
    }

    return destino;
  }

  async function abrirNotificacao(
    event,
    notificacao
  ) {
    event.preventDefault();
    event.stopPropagation();

    const destino = obterDestino(notificacao);

    if (!destino) {
      return;
    }

    /*
     * Marca a notificação como lida antes de navegar.
     * Caso a requisição falhe, a navegação continua.
     */
    if (Number(notificacao.lida) !== 1) {
      try {
        await api.patch(
          `/notificacoes/${notificacao.id}/lida`
        );

        setNotificacoes(prev =>
          prev.map(item =>
            String(item.id) ===
            String(notificacao.id)
              ? {
                  ...item,
                  lida: 1
                }
              : item
          )
        );
      } catch (error) {
        console.error(
          'Erro ao marcar notificação como lida:',
          error
        );
      }
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

        <p
          style={{
            color: 'var(--cinza-600)',
            fontSize: '.9rem'
          }}
        >
          Acompanhe as atualizações do sistema.
        </p>
      </div>

      <div className="card">
        {notificacoes.length === 0 && (
          <p>Nenhuma notificação encontrada.</p>
        )}

        {notificacoes.map(notificacao => {
          const destino =
            obterDestino(notificacao);

          const lida =
            Number(notificacao.lida) === 1;

          const mostrarBotaoAbrir =
            Boolean(destino);

          return (
            <div
              key={notificacao.id}
              style={{
                padding: '16px 0',
                borderBottom:
                  '1px solid var(--cinza-200)',
                opacity: 1
              }}
            >
              <h3
                style={{
                  fontSize: '1rem',
                  marginBottom: 4
                }}
              >
                {notificacao.titulo}
              </h3>

              <p
                style={{
                  color: 'var(--cinza-700)',
                  marginBottom: 8
                }}
              >
                {notificacao.mensagem}
              </p>

              <div className="d-flex gap-8">
                {mostrarBotaoAbrir && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={event =>
                      abrirNotificacao(
                        event,
                        notificacao
                      )
                    }
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
                      border:
                        '1px solid #16a34a',
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
                    onClick={() =>
                      marcarComoLida(
                        notificacao.id
                      )
                    }
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