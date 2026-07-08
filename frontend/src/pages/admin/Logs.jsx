import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);

  async function carregar(p=1) {
    setLoading(true);
    const { data } = await api.get('/relatorios/logs?p='+p);
    setLogs(data.data);
    setTotal(data.total);
    setPagina(p);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const totalPaginas = Math.ceil(total/50);

  return (
    <PainelLayout titulo="Logs de Atividades">
      <div className="d-flex align-center justify-between mb-24">
        <div>
          <h2 style={{fontSize:'1.4rem',fontWeight:800}}>Logs de Atividades</h2>
          <p style={{color:'var(--cinza-600)',fontSize:'.88rem'}}>{total} registros</p>
        </div>
        <button className="btn btn-outline" onClick={()=>carregar(pagina)}>🔄 Atualizar</button>
      </div>
      {loading ? <Spinner /> : (
        <>
          <div className="card p-0">
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead><tr><th>#</th><th>Usuário</th><th>Ação</th><th>Descrição</th><th>IP</th><th>Data/Hora</th></tr></thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td style={{color:'var(--cinza-500)',fontSize:'.8rem'}}>{l.id}</td>
                      <td style={{fontWeight:600,fontSize:'.88rem'}}>{l.nome_completo||<span style={{color:'var(--cinza-400)'}}>—</span>}</td>
                      <td><span className="badge badge-confirmada" style={{fontSize:'.72rem'}}>{l.acao}</span></td>
                      <td style={{fontSize:'.85rem',color:'var(--cinza-600)',maxWidth:280}}>{l.descricao||'—'}</td>
                      <td style={{fontSize:'.8rem',fontFamily:'monospace',color:'var(--cinza-500)'}}>{l.ip||'—'}</td>
                      <td style={{fontSize:'.82rem',whiteSpace:'nowrap'}}>{new Date(l.criado_em).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {totalPaginas > 1 && (
          <div className="paginacao">
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
          <button
          key={p}
          className={`paginacao-botao ${p === pagina ? 'ativo' : ''}`}
          onClick={() => carregar(p)}
          >
          {p}
        </button>
      ))}
  </div>
)}
        </>
      )}
    </PainelLayout>
  );
}
