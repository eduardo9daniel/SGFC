import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner, fmtData } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

export default function AdminFrequencia() {
  const toast = useToast();
  const [formacoes, setFormacoes] = useState([]);
  const [formacaoSel, setFormacaoSel] = useState('');
  const [dataAula, setDataAula] = useState(new Date().toISOString().slice(0,10));
  const [inscritos, setInscritos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [presencas, setPresencas] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/formacoes').then(r => setFormacoes(r.data.data)); }, []);

  async function carregar(fid, data) {
    if (!fid) return;
    setLoading(true);
    const { data: d } = await api.get(`/frequencias?formacao_id=${fid}&data_aula=${data}`);
    setInscritos(d.data.inscritos);
    setHistorico(d.data.historico);
    const p = {};
    d.data.inscritos.forEach(i => {
      p[i.inscricao_id] = { presente: !!i.ja_presente, justificativa: i.justificativa||'' };
    });
    setPresencas(p);
    setLoading(false);
  }

  function togglePresenca(id) {
    setPresencas(p => ({ ...p, [id]: { ...p[id], presente: !p[id]?.presente } }));
  }
  function setJustif(id, v) {
    setPresencas(p => ({ ...p, [id]: { ...p[id], justificativa: v } }));
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      await api.post('/frequencias', {
        formacao_id: formacaoSel,
        data_aula: dataAula,
        presencas,
        todos_inscritos: inscritos.map(i => i.inscricao_id),
      });
      toast('Frequência salva com sucesso!');
      carregar(formacaoSel, dataAula);
    } catch { toast('Erro ao salvar frequência.','erro'); }
  }

  return (
    <PainelLayout titulo="Registrar Frequência">
      <div className="card mb-24">
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="campo" style={{ marginBottom:0, flex:2, minWidth:240 }}>
            <label>Formação</label>
            <select value={formacaoSel} onChange={e => { setFormacaoSel(e.target.value); carregar(e.target.value, dataAula); }}>
              <option value="">— Selecione —</option>
              {formacoes.map(f => <option key={f.id} value={f.id}>{f.titulo}</option>)}
            </select>
          </div>
          <div className="campo" style={{ marginBottom:0, minWidth:160 }}>
            <label>Data da Aula</label>
            <input type="date" value={dataAula} max={new Date().toISOString().slice(0,10)}
              onChange={e => { setDataAula(e.target.value); if (formacaoSel) carregar(formacaoSel, e.target.value); }} />
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : formacaoSel && inscritos.length > 0 ? (
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:24, alignItems:'start' }}>
          <div className="card p-0">
            <div className="card-titulo p-24" style={{ marginBottom:0, borderRadius:'var(--raio-lg) var(--raio-lg) 0 0' }}>
              <span className="icone">✅</span> Lista de Presença — {dataAula}
              <span style={{ marginLeft:'auto', fontSize:'.82rem', color:'var(--cinza-500)' }}>{inscritos.length} inscritos</span>
            </div>
            <form onSubmit={salvar}>
              <div style={{ paddingBottom:16 }}>
                {inscritos.map(i => (
                  <div key={i.inscricao_id} style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 24px', borderBottom:'1px solid var(--cinza-200)' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:12, flex:1, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!presencas[i.inscricao_id]?.presente}
                        onChange={() => togglePresenca(i.inscricao_id)}
                        style={{ width:20, height:20, accentColor:'var(--verde)', cursor:'pointer' }} />
                      <div>
                        <div style={{ fontWeight:600, fontSize:'.92rem' }}>{i.nome_completo}</div>
                        <div style={{ fontSize:'.78rem', color:'var(--cinza-500)' }}>{i.email}</div>
                      </div>
                    </label>
                    <input type="text" placeholder="Justificativa (opcional)"
                      value={presencas[i.inscricao_id]?.justificativa||''}
                      onChange={e => setJustif(i.inscricao_id, e.target.value)}
                      style={{ width:200, padding:'6px 10px', border:'1px solid var(--cinza-300)', borderRadius:8, fontSize:'.82rem', outline:'none' }} />
                  </div>
                ))}
              </div>
              <div style={{ padding:'16px 24px', borderTop:'2px solid var(--cinza-200)', display:'flex', justifyContent:'flex-end' }}>
                <button type="submit" className="btn btn-primario btn-lg">💾 Salvar Frequência</button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-titulo"><span className="icone">📅</span> Histórico de Aulas</div>
            {historico.length === 0 ? (
              <div className="vazio" style={{ padding:24 }}><p>Nenhuma aula registrada ainda.</p></div>
            ) : historico.map(h => {
              const pct = h.total > 0 ? Math.round(h.presentes / h.total * 100) : 0;
              return (
                <div key={h.data_aula} style={{ padding:'12px 0', borderBottom:'1px solid var(--cinza-200)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontWeight:600, fontSize:'.9rem' }}>{fmtData(h.data_aula)}</span>
                    <span style={{ fontSize:'.82rem', color:'var(--cinza-600)' }}>{h.presentes}/{h.total} ({pct}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${pct>=75?'alto':pct>=50?'medio':'baixo'}`} style={{ width:`${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : formacaoSel ? (
        <div className="vazio"><div className="vazio-icone">📋</div><p>Nenhum participante inscrito nesta formação.</p></div>
      ) : (
        <div className="vazio"><div className="vazio-icone">✅</div><p>Selecione uma formação para ver a lista de presença.</p></div>
      )}
    </PainelLayout>
  );
}
