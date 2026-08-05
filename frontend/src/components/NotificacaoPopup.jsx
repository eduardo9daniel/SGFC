import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  formatarDataNotificacao,
  obterDestinoNotificacao,
  obterRotaNotificacoes
} from '../utils/notificacoes';

const INTERVALO_ATUALIZACAO = 15000;
const LIMITE_IDS_SESSAO = 200;

function lerIdsExibidos(chave) {
  try {
    const valor = JSON.parse(sessionStorage.getItem(chave) || '[]');
    return new Set(Array.isArray(valor) ? valor.map(String) : []);
  } catch {
    return new Set();
  }
}

function salvarIdsExibidos(chave, ids) {
  try {
    const lista = Array.from(ids).slice(-LIMITE_IDS_SESSAO);
    sessionStorage.setItem(chave, JSON.stringify(lista));
  } catch {
    // O pop-up continua funcionando mesmo sem acesso ao sessionStorage.
  }
}

export default function NotificacaoPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fila, setFila] = useState([]);
  const [notificacaoAtual, setNotificacaoAtual] = useState(null);

  const buscandoRef = useRef(false);
  const idsExibidosRef = useRef(new Set());
  const idsPendentesRef = useRef(new Set());

  const tipoUsuario = user?.tipo || user?.tipo_usuario;
  const habilitado = ['coordenador', 'equipe'].includes(
    tipoUsuario
  );
  const chaveSessao = `cfdr_notificacoes_popup_${user?.id || 'sem-usuario'}`;

  const buscarNaoLidas = useCallback(async () => {
    if (!habilitado || buscandoRef.current || document.hidden) {
      return;
    }

    buscandoRef.current = true;

    try {
      const { data } = await api.get('/notificacoes', {
        params: { somente_nao_lidas: 1 }
      });

      const recebidas = Array.isArray(data?.data) ? data.data : [];
      const novas = recebidas.filter(notificacao => {
        const id = String(notificacao.id);

        return (
          Number(notificacao.lida) !== 1 &&
          !idsExibidosRef.current.has(id) &&
          !idsPendentesRef.current.has(id)
        );
      });

      if (novas.length > 0) {
        novas.forEach(notificacao => {
          idsPendentesRef.current.add(String(notificacao.id));
        });

        setFila(anterior => [...anterior, ...novas]);
      }
    } catch {
      // Uma falha temporária não interrompe a navegação do usuário.
    } finally {
      buscandoRef.current = false;
    }
  }, [habilitado]);

  useEffect(() => {
    if (!habilitado) {
      setFila([]);
      setNotificacaoAtual(null);
      idsExibidosRef.current = new Set();
      idsPendentesRef.current = new Set();
      return undefined;
    }

    idsExibidosRef.current = lerIdsExibidos(chaveSessao);
    idsPendentesRef.current = new Set();
    setFila([]);
    setNotificacaoAtual(null);

    buscarNaoLidas();

    const intervalo = window.setInterval(
      buscarNaoLidas,
      INTERVALO_ATUALIZACAO
    );

    const verificarAoVoltar = () => {
      if (!document.hidden) {
        buscarNaoLidas();
      }
    };

    window.addEventListener('focus', buscarNaoLidas);
    document.addEventListener('visibilitychange', verificarAoVoltar);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('focus', buscarNaoLidas);
      document.removeEventListener('visibilitychange', verificarAoVoltar);
    };
  }, [habilitado, chaveSessao, buscarNaoLidas]);

  useEffect(() => {
    if (notificacaoAtual || fila.length === 0) {
      return;
    }

    const [proxima, ...restante] = fila;
    const id = String(proxima.id);

    idsExibidosRef.current.add(id);
    salvarIdsExibidos(chaveSessao, idsExibidosRef.current);

    setFila(restante);
    setNotificacaoAtual(proxima);
  }, [fila, notificacaoAtual, chaveSessao]);

  useEffect(() => {
    if (!notificacaoAtual) return undefined;

    const fecharComEsc = event => {
      if (event.key === 'Escape') {
        fecharAtual();
      }
    };

    window.addEventListener('keydown', fecharComEsc);

    return () => {
      window.removeEventListener('keydown', fecharComEsc);
    };
  }, [notificacaoAtual]);

  function fecharAtual() {
    if (notificacaoAtual?.id !== undefined) {
      idsPendentesRef.current.delete(String(notificacaoAtual.id));
    }

    setNotificacaoAtual(null);
  }

  async function abrirNotificacao() {
    if (!notificacaoAtual) return;

    const destino = obterDestinoNotificacao(
      notificacaoAtual,
      tipoUsuario
    );

    try {
      await api.patch(`/notificacoes/${notificacaoAtual.id}/lida`);

      window.dispatchEvent(
        new CustomEvent('cfdr:notificacao-lida', {
          detail: { id: notificacaoAtual.id }
        })
      );
    } catch {
      // A navegação continua mesmo se a atualização falhar.
    }

    fecharAtual();

    if (destino) {
      navigate(destino);
    }
  }

  function verTodas() {
    const destino = obterRotaNotificacoes(tipoUsuario);

    fila.forEach(notificacao => {
      idsExibidosRef.current.add(String(notificacao.id));
    });

    salvarIdsExibidos(chaveSessao, idsExibidosRef.current);
    idsPendentesRef.current = new Set();
    setFila([]);
    setNotificacaoAtual(null);

    if (destino) {
      navigate(destino);
    }
  }

  if (!habilitado || !notificacaoAtual) {
    return null;
  }

  const dataFormatada = formatarDataNotificacao(
    notificacaoAtual.criado_em
  );

  const quantidadeAguardando = fila.length;

  return (
    <section
      className="notificacao-popup"
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="notificacao-popup-titulo"
      aria-describedby="notificacao-popup-mensagem"
    >
      <div className="notificacao-popup-cabecalho">
        <div className="notificacao-popup-icone" aria-hidden="true">
          🔔
        </div>

        <div className="notificacao-popup-identificacao">
          <span>Nova notificação</span>
          {dataFormatada && <small>{dataFormatada}</small>}
        </div>

        <button
          type="button"
          className="notificacao-popup-fechar"
          onClick={fecharAtual}
          aria-label="Fechar notificação"
        >
          ×
        </button>
      </div>

      <div className="notificacao-popup-conteudo">
        <h2 id="notificacao-popup-titulo">
          {notificacaoAtual.titulo || 'Atualização do sistema'}
        </h2>

        <p id="notificacao-popup-mensagem">
          {notificacaoAtual.mensagem ||
            'Você recebeu uma nova notificação.'}
        </p>

        {quantidadeAguardando > 0 && (
          <div className="notificacao-popup-fila">
            + {quantidadeAguardando}{' '}
            {quantidadeAguardando === 1
              ? 'notificação aguardando'
              : 'notificações aguardando'}
          </div>
        )}
      </div>

      <div className="notificacao-popup-acoes">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={verTodas}
        >
          Ver todas
        </button>

        <button
          type="button"
          className="btn btn-primario btn-sm"
          onClick={abrirNotificacao}
        >
          Abrir notificação
        </button>
      </div>
    </section>
  );
}