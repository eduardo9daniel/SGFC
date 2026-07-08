/**
 * frontend/src/pages/public/ValidarHash.jsx
 *
 * Página pública acessada diretamente pelo QR Code:
 *   https://meusistema.com/validar/:hash
 *
 * Exibe o "Atestado de Autenticidade" completo do certificado.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';

/* ─── Formatadores ─────────────────────────────────────────── */
function fmtData(str) {
  if (!str) return '—';
  const [ano, mes, dia] = String(str).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function fmtAgora() {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'medium',
  }).format(new Date());
}

/* ─── Estilos inline encapsulados ──────────────────────────── */
const css = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '32px 16px 48px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    maxWidth: 680,
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
  },
  header: (valido) => ({
    background: valido
      ? 'linear-gradient(135deg, #065f46, #047857)'
      : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
    padding: '32px 40px',
    textAlign: 'center',
    color: '#fff',
  }),
  sealCircle: (valido) => ({
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: `4px solid ${valido ? '#6ee7b7' : '#fca5a5'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
    margin: '0 auto 16px',
    background: 'rgba(255,255,255,0.12)',
  }),
  body: {
    padding: '32px 40px',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: '1px solid #e5e7eb',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 24px',
    marginBottom: 28,
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111827',
  },
  statusBadge: (valido) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 50,
    fontWeight: 700,
    fontSize: 14,
    background: valido ? '#d1fae5' : '#fee2e2',
    color: valido ? '#065f46' : '#7f1d1d',
    border: `2px solid ${valido ? '#6ee7b7' : '#fca5a5'}`,
  }),
  divider: {
    height: 1,
    background: '#e5e7eb',
    margin: '20px 0',
  },
  hashBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '12px 16px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#374151',
    wordBreak: 'break-all',
    marginBottom: 4,
  },
  footer: {
    background: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    padding: '20px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  logoText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#374151',
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
  },
  btn: (variant) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 18px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    border: 'none',
    textDecoration: 'none',
    background: variant === 'primary' ? '#1e40af' : '#f3f4f6',
    color: variant === 'primary' ? '#fff' : '#374151',
  }),
  loadingWrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
    color: '#fff',
    flexDirection: 'column',
    gap: 16,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

/* ─── Componente ────────────────────────────────────────────── */
export default function ValidarHash() {
  const { hash } = useParams();
  const [cert, setCert]       = useState(null);
  const [erro, setErro]       = useState('');
  const [loading, setLoading] = useState(true);
  const [agora]               = useState(fmtAgora());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/certificados/validar/${hash}`);
        setCert(data.data);
      } catch (e) {
        setErro(
          e.response?.status === 429
            ? 'Muitas consultas. Aguarde um momento e tente novamente.'
            : 'Certificado não encontrado. Este QR Code pode ser inválido ou o certificado foi removido.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [hash]);

  /* Compartilhamento nativo */
  async function compartilhar() {
    if (navigator.share) {
      await navigator.share({
        title: 'Certificado Verificado — Centro de Formação Darcy Ribeiro',
        text: `Certificado de ${cert?.nome_completo} em "${cert?.titulo}" verificado com sucesso.`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={css.loadingWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={css.spinner} />
        <p style={{ fontSize: 14, opacity: 0.7 }}>Verificando autenticidade…</p>
      </div>
    );
  }

  /* ── Não encontrado ── */
  if (erro || !cert) {
    return (
      <div style={css.page}>
        <div style={{ ...css.card, maxWidth: 500 }}>
          <div style={css.header(false)}>
            <div style={css.sealCircle(false)}>❌</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Certificado Inválido</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: 14 }}>
              Não foi possível verificar a autenticidade
            </p>
          </div>
          <div style={{ ...css.body, textAlign: 'center' }}>
            <p style={{ color: '#6b7280', lineHeight: 1.6 }}>{erro}</p>
            <div style={css.divider} />
            <Link to="/validar-certificado" style={css.btn('primary')}>
              🔍 Tentar com código manual
            </Link>
          </div>
          <div style={{ ...css.footer, justifyContent: 'center' }}>
            <span style={css.timestamp}>Consulta realizada em {agora}</span>
          </div>
        </div>
      </div>
    );
  }

  const valido = cert.status === 'ativo';
  const expirado = cert.data_validade && new Date(cert.data_validade) < new Date();

  return (
    <div style={css.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .info-grid { grid-template-columns: 1fr !important; }
          .card-body  { padding: 24px 20px !important; }
          .card-footer { flex-direction: column; align-items: flex-start !important; }
        }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={css.card}>

        {/* ── Cabeçalho com status visual ── */}
        <div style={css.header(valido && !expirado)}>
          <div style={css.sealCircle(valido && !expirado)}>
            {valido && !expirado ? '✅' : expirado ? '⏰' : '🚫'}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 6px', letterSpacing: -0.5 }}>
            {valido && !expirado
              ? 'Certificado Autêntico'
              : expirado
              ? 'Certificado Expirado'
              : 'Certificado Inválido'}
          </h1>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>
            Centro de Formação Darcy Ribeiro — Sistema de Verificação
          </p>
        </div>

        {/* ── Corpo ── */}
        <div style={css.body} className="card-body">

          {/* Badge de status */}
          <div style={{ marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={css.statusBadge(valido && !expirado)}>
              {valido && !expirado ? '🟢 VÁLIDO' : expirado ? '🟡 EXPIRADO' : '🔴 CANCELADO'}
            </div>
            {cert.total_consultas > 0 && (
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                👁 {cert.total_consultas} consulta{cert.total_consultas !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Dados do participante */}
          <p style={css.sectionTitle}>Participante</p>
          <div style={css.infoGrid} className="info-grid">
            <div style={{ ...css.infoItem, gridColumn: 'span 2' }}>
              <span style={css.label}>Nome Completo</span>
              <span style={{ ...css.value, fontSize: 20 }}>{cert.nome_completo}</span>
            </div>
            {cert.cpf && (
              <div style={css.infoItem}>
                <span style={css.label}>CPF</span>
                <span style={css.value}>{cert.cpf}</span>
              </div>
            )}
            {cert.email && (
              <div style={css.infoItem}>
                <span style={css.label}>E-mail</span>
                <span style={{ ...css.value, fontSize: 13, wordBreak: 'break-all' }}>{cert.email}</span>
              </div>
            )}
          </div>

          <div style={css.divider} />

          {/* Dados da formação */}
          <p style={css.sectionTitle}>Formação</p>
          <div style={css.infoGrid} className="info-grid">
            <div style={{ ...css.infoItem, gridColumn: 'span 2' }}>
              <span style={css.label}>Título</span>
              <span style={{ ...css.value, fontSize: 18 }}>{cert.titulo}</span>
            </div>
            <div style={css.infoItem}>
              <span style={css.label}>Período</span>
              <span style={css.value}>{fmtData(cert.data_inicio)} – {fmtData(cert.data_fim)}</span>
            </div>
            <div style={css.infoItem}>
              <span style={css.label}>Carga Horária</span>
              <span style={css.value}>{cert.carga_horaria_cursada || cert.carga_horaria}h</span>
            </div>
            {cert.instrutor && (
              <div style={css.infoItem}>
                <span style={css.label}>Instrutor(a)</span>
                <span style={css.value}>{cert.instrutor}</span>
              </div>
            )}
            {cert.local && (
              <div style={css.infoItem}>
                <span style={css.label}>Local</span>
                <span style={css.value}>{cert.local}</span>
              </div>
            )}
          </div>

          <div style={css.divider} />

          {/* Dados do certificado */}
          <p style={css.sectionTitle}>Certificado</p>
          <div style={css.infoGrid} className="info-grid">
            <div style={css.infoItem}>
              <span style={css.label}>Data de Emissão</span>
              <span style={css.value}>{fmtData(cert.data_emissao)}</span>
            </div>
            {cert.data_validade && (
              <div style={css.infoItem}>
                <span style={css.label}>Válido até</span>
                <span style={{ ...css.value, color: expirado ? '#dc2626' : '#111827' }}>
                  {fmtData(cert.data_validade)}
                </span>
              </div>
            )}
          </div>

          <div style={css.infoItem}>
            <span style={css.label}>Hash de Autenticidade</span>
            <div style={css.hashBox}>{cert.hash_unico}</div>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              Este identificador único garante a autenticidade deste documento.
            </span>
          </div>

          {/* Motivo de cancelamento */}
          {!valido && cert.motivo_status && (
            <>
              <div style={css.divider} />
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px' }}>
                <strong style={{ color: '#991b1b', fontSize: 13 }}>Motivo da invalidação:</strong>
                <p style={{ color: '#7f1d1d', margin: '4px 0 0', fontSize: 13 }}>{cert.motivo_status}</p>
              </div>
            </>
          )}

          {/* Ações */}
          <div style={css.divider} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} className="no-print">
            <button onClick={compartilhar} style={css.btn('secondary')}>
              📤 Compartilhar
            </button>
            <button onClick={() => window.print()} style={css.btn('secondary')}>
              🖨 Imprimir
            </button>
            <Link to="/validar-certificado" style={css.btn('secondary')}>
              🔍 Validar outro
            </Link>
          </div>
        </div>

        {/* ── Rodapé ── */}
        <div style={css.footer} className="card-footer">
          <div>
            <div style={css.logoText}>🎓 Centro de Formação Darcy Ribeiro</div>
            <div style={css.timestamp}>Sistema Oficial de Verificação de Certificados</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={css.timestamp}>Consulta realizada em</div>
            <div style={{ ...css.timestamp, color: '#374151', fontWeight: 600 }}>{agora}</div>
          </div>
        </div>
      </div>

      {/* Link de retorno */}
      <div style={{ marginTop: 24, textAlign: 'center' }} className="no-print">
        <Link to="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
}
