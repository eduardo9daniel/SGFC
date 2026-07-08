import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner, fmtData } from '../../components/ui';
import api from '../../api';

export default function PartFrequencia() {
  const [inscricoes, setInscricoes] = useState([]);
  const [sel, setSel] = useState('');
  const [freq, setFreq] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/inscricoes/minhas').then(r => setInscricoes(r.data.data)); }, []);

  async function carregar(id) {
    setSel(id); if (!id) return;
    setLoading(true);
    const { data } = await api.get('/frequencias/minha?inscricao_id='+id);
    setFreq(data.data); setLoading(false);
  }

  return (
    <PainelLayout titulo="Minha Frequência">
      <div className="card mb-24">
        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Selecionar Formação</label>
          <select value={sel} onChange={e => carregar(e.target.value)}>
            <option value="">— Selecione uma formação —</option>
            {inscricoes.map(i => <option key={i.id} value={i.id}>{i.titulo}</option>)}
          </select>
        </div>
      </div>

      {loading ? <Spinner /> : !sel ? (
        <div className="vazio"><div className="vazio-icone">✅</div><p>Selecione uma formação para ver sua frequência.</p></div>
      ) : !freq || freq.total === 0 ? (
        <div className="vazio"><div className="vazio-icone">📋</div><p>Nenhuma aula registrada ainda.</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 24 }}>
            {[
              { label: 'Total de Aulas', valor: freq.total, cor: 'laranja', icon: '📚' },
              { label: 'Presenças',      valor: freq.presentes, cor: 'verde', icon: '✅' },
              { label: 'Frequência',     valor: freq.pct + '%', cor: freq.pct >= 75 ? 'verde' : 'laranja', icon: '📊' },
            ].map(c => (
              <div key={c.label} className="stat-card">
                <div className={'stat-icone '+c.cor}>{c.icon}</div>
                <div><div className="stat-valor">{c.valor}</div><div className="stat-label">{c.label}</div></div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-titulo"><span className="icone">📊</span> Percentual de Frequência</div>
            <div className="progress-bar" style={{ height: 20 }}>
              <div className={'progress-fill '+(freq.pct>=75?'alto':freq.pct>=50?'medio':'baixo')} style={{ width: freq.pct+'%' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '.85rem', color: 'var(--cinza-600)' }}>
              <span>{freq.pct}% de frequência</span>
              <span style={{ color: freq.pct >= 75 ? 'var(--verde)' : 'var(--cor-perigo)', fontWeight: 700 }}>
                {freq.pct >= 75 ? '✅ Apto para certificado' : '❌ Frequência insuficiente (mín. 75%)'}
              </span>
            </div>
          </div>

          <div className="card p-0">
            <div className="card-titulo p-24" style={{ marginBottom: 0, borderRadius: 'var(--raio-lg) var(--raio-lg) 0 0' }}>
              <span className="icone">📅</span> Registro de Aulas
            </div>
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead><tr><th>Data</th><th>Presença</th><th>Justificativa</th></tr></thead>
                <tbody>
                  {freq.rows.map(r => (
                    <tr key={r.data_aula}>
                      <td style={{ fontWeight: 600 }}>{fmtData(r.data_aula)}</td>
                      <td><span style={{ fontWeight: 700, color: r.presente ? 'var(--verde)' : 'var(--cor-perigo)' }}>{r.presente ? '✅ Presente' : '❌ Ausente'}</span></td>
                      <td style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>{r.justificativa || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </PainelLayout>
  );
}
