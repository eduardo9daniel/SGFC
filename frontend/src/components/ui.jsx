// Helpers de formatação
export function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
export function fmtPct(presentes, total) {
  if (!total) return 0;
  return Math.round((presentes / total) * 100);
}

// Badge de status
export function Badge({ status }) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

// Spinner
export function Spinner() {
  return (
    <div className="spinner-wrapper" style={{ flexDirection: 'column', gap: 20, minHeight: '100vh', background: 'var(--branco)' }}>
      <img src="/logotipo_centroformcacao.png" alt="Centro de Formação Darcy Ribeiro" style={{ width: 200, opacity: 0.9 }} />
      <div className="spinner" />
    </div>
  );
}

// Cartão de formação
export function FormacaoCard({ f, footer }) {
  const pctVagas = f.vagas > 0 ? ((f.vagas - f.vagas_disponiveis) / f.vagas * 100) : 0;
  return (
    <article className="formacao-card animar-entrada">
      <div className="formacao-card-header">
        <div className="formacao-card-status"><Badge status={f.status} /></div>
        <h3 className="formacao-card-titulo">{f.titulo}</h3>
        <p className="formacao-card-instrutor">🎓 {f.instrutor || 'A definir'}</p>
      </div>
      <div className="formacao-card-body">
        {f.descricao && (
          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem', marginBottom: 14, lineHeight: 1.6 }}>
            {f.descricao.slice(0, 120)}{f.descricao.length > 120 ? '…' : ''}
          </p>
        )}
        <div className="formacao-info-item"><span className="info-icon">📅</span>
          <span>{fmtData(f.data_inicio)} a {fmtData(f.data_fim)}</span>
        </div>
        {f.horario && <div className="formacao-info-item"><span className="info-icon">🕐</span><span>{f.horario}</span></div>}
        {f.local   && <div className="formacao-info-item"><span className="info-icon">📍</span><span>{f.local}</span></div>}
        <div className="formacao-info-item"><span className="info-icon">⏱️</span><span>{f.carga_horaria}h de carga horária</span></div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', color: 'var(--cinza-600)', marginBottom: 6 }}>
            <span>{f.vagas_disponiveis} vagas disponíveis</span>
            <span>{f.vagas} total</span>
          </div>
          <div className="vagas-barra">
            <div className={`vagas-preenchimento${pctVagas >= 100 ? ' cheio' : ''}`} style={{ width: `${pctVagas}%` }} />
          </div>
        </div>
      </div>
      {footer && <div className="formacao-card-footer">{footer}</div>}
    </article>
  );
}
