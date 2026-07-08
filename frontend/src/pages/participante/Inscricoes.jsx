import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData, fmtPct } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

export default function PartInscricoes() {
  const toast = useToast();
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const { data } = await api.get('/inscricoes/minhas');
    setInscricoes(data.data); setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function cancelar(id) {
    if (!confirm('Cancelar esta inscrição?')) return;
    try { await api.delete('/inscricoes/'+id); toast('Inscrição cancelada.'); carregar(); }
    catch(err) { toast(err.response?.data?.erro || 'Erro ao cancelar.', 'erro'); }
  }

  return (
    <PainelLayout titulo="Minhas Inscrições">
      <div className="mb-24">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Minhas Inscrições</h2>
        <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>{inscricoes.length} inscrição(ões)</p>
      </div>
      {loading ? <Spinner /> : inscricoes.length === 0 ? (
        <div className="vazio"><div className="vazio-icone">📋</div><p>Você não tem inscrições ainda.</p></div>
      ) : (
        <div className="card p-0">
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead><tr><th>Formação</th><th>Período</th><th>Carga</th><th>Frequência</th><th>Status</th><th>Ação</th></tr></thead>
              <tbody>
                {inscricoes.map(i => {
                  const pct = fmtPct(i.presentes, i.total_aulas);
                  return (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 600, maxWidth: 240 }}>{i.titulo}</td>
                      <td style={{ fontSize: '.83rem', whiteSpace: 'nowrap' }}>{fmtData(i.data_inicio)}<br/>{fmtData(i.data_fim)}</td>
                      <td>{i.carga_horaria}h</td>
                      <td>
                        {i.total_aulas > 0 ? (
                          <span style={{ fontWeight: 700, color: pct >= 75 ? 'var(--verde)' : 'var(--cor-perigo)' }}>
                            {pct}% <span style={{ color: 'var(--cinza-400)', fontSize: '.75rem' }}>({i.presentes}/{i.total_aulas})</span>
                          </span>
                        ) : <span style={{ color: 'var(--cinza-400)', fontSize: '.82rem' }}>—</span>}
                      </td>
                      <td><Badge status={i.status_formacao} /></td>
                      <td>
                        {i.status === 'confirmada' && i.status_formacao === 'aberta' && (
                          <button className="btn btn-perigo btn-sm" onClick={() => cancelar(i.id)}>Cancelar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PainelLayout>
  );
}
