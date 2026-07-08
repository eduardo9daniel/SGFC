import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner, fmtData, fmtPct } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

/* ─── Modal QR Code ─────────────────────────────────────────── */
function ModalQRCode({ cert, onClose }) {
  const BASE = window.location.origin;

  async function copiarLink() {
    await navigator.clipboard.writeText(`${BASE}/validar/${cert.hash}`);
    alert('Link de validação copiado!');
  }

  function imprimir() {
    const w = window.open('', '_blank', 'width=400,height=520');
    w.document.write(`
      <html><head><title>QR Code – ${cert.nome}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 32px; }
        img  { width: 200px; height: 200px; border: 1px solid #eee; border-radius: 8px; }
        h3   { font-size: 15px; margin: 16px 0 4px; }
        p    { font-size: 12px; color: #555; margin: 4px 0; }
        code { font-size: 10px; word-break: break-all; display: block; margin-top: 8px; }
      </style></head>
      <body>
        <img src="${cert.qr_code_data_url}" alt="QR Code"/>
        <h3>${cert.nome}</h3>
        <p>${cert.titulo}</p>
        <p>Emitido em ${fmtData(new Date().toISOString())}</p>
        <code>${BASE}/validar/${cert.hash}</code>
      </body></html>
    `);
    w.document.close();
    w.print();
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:380, width:'90%', textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin:'0 0 4px', fontSize:17 }}>QR Code do Certificado</h3>
        <p style={{ margin:'0 0 20px', fontSize:13, color:'#6b7280' }}>{cert.nome}</p>

        {cert.qr_code_data_url
          ? <img src={cert.qr_code_data_url} alt="QR Code" style={{ width:200, height:200, borderRadius:8, border:'1px solid #e5e7eb' }} />
          : <p style={{ color:'#9ca3af' }}>Carregando QR…</p>
        }

        <p style={{ fontSize:11, color:'#9ca3af', margin:'12px 0 0', fontFamily:'monospace', wordBreak:'break-all' }}>
          {BASE}/validar/{cert.hash}
        </p>

        <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-primario btn-sm" onClick={imprimir}>🖨 Imprimir QR</button>
          <button className="btn btn-secundario btn-sm" onClick={copiarLink}>📋 Copiar Link</button>
          <a href={`/validar/${cert.hash}`} target="_blank" rel="noreferrer" className="btn btn-secundario btn-sm">
            🔗 Abrir página
          </a>
          <button className="btn btn-sm" style={{ background:'#f3f4f6', color:'#374151' }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Revogar ─────────────────────────────────────────── */
function ModalRevogar({ cert, onClose, onConfirm }) {
  const [status, setStatus] = useState('cancelado');
  const [motivo, setMotivo] = useState('');

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:420, width:'90%', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin:'0 0 4px', color:'#dc2626' }}>⚠️ Revogar Certificado</h3>
        <p style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>{cert.nome} — {cert.titulo}</p>

        <div className="campo">
          <label>Tipo de revogação</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="cancelado">Cancelado (invalidar permanentemente)</option>
            <option value="substituido">Substituído (será reemitido com novo QR)</option>
          </select>
        </div>
        <div className="campo">
          <label>Motivo <span style={{ color:'#dc2626' }}>*</span></label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo da revogação..."
          />
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-sm" style={{ background:'#f3f4f6' }} onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-sm"
            style={{ background:'#dc2626', color:'#fff' }}
            disabled={!motivo.trim()}
            onClick={() => onConfirm(status, motivo)}
          >
            🚫 Confirmar Revogação
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ──────────────────────────────────── */
export default function AdminCertificados() {
  const toast = useToast();
  const [formacoes, setFormacoes]       = useState([]);
  const [formacaoSel, setFormacaoSel]   = useState('');
  const [inscritos, setInscritos]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [emitindoTodos, setEmitindoTodos] = useState(false);
  const [modalQR, setModalQR]           = useState(null);
  const [modalRev, setModalRev]         = useState(null);

  useEffect(() => {
    api.get('/formacoes?status=concluida')
      .then(r => setFormacoes(r.data.data))
      .catch(() => toast('Erro ao carregar formações.', 'erro'));
  }, []);

  async function carregar(id) {
    setFormacaoSel(id);
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/certificados?formacao_id=${id}`);
      setInscritos(data.data);
    } catch {
      toast('Erro ao carregar participantes.', 'erro');
      setInscritos([]);
    } finally {
      setLoading(false);
    }
  }

  async function emitir(p) {
    try {
      const { data } = await api.post('/certificados', {
        inscricao_id: p.inscricao_id,
        carga_horaria_cursada: p.carga_horaria,
      });
      toast(`Certificado emitido! Código: ${data.codigo}`);
      // Abre modal com QR Code recém gerado
      setModalQR({
        hash: data.hash,
        qr_code_data_url: data.qr_code_data_url,
        nome: p.nome_completo,
        titulo: p.titulo,
      });
      carregar(formacaoSel);
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao emitir.', 'erro');
    }
  }

  async function emitirTodos() {
    const aptos = inscritos.filter(p => {
      const pct = fmtPct(p.total_presentes, p.total_aulas);
      return pct >= 75 && !p.codigo_validacao;
    });
    if (aptos.length === 0) { toast('Nenhum participante apto sem certificado.', 'erro'); return; }
    setEmitindoTodos(true);
    let sucesso = 0, falha = 0;
    for (const p of aptos) {
      try {
        await api.post('/certificados', { inscricao_id: p.inscricao_id, carga_horaria_cursada: p.carga_horaria });
        sucesso++;
      } catch { falha++; }
    }
    toast(`${sucesso} certificado(s) emitido(s)${falha > 0 ? ` — ${falha} erro(s)` : ''}.`);
    carregar(formacaoSel);
    setEmitindoTodos(false);
  }

  async function abrirPdf(codigoValidacao) {
    try {
      const response = await api.get(`/certificados/${codigoValidacao}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
    } catch {
      toast('Erro ao abrir o certificado.', 'erro');
    }
  }

  async function verQR(p) {
    try {
      const { data } = await api.get(`/certificados/${p.certificado_id}/qrcode`);
      setModalQR({
        hash: p.hash_unico,
        qr_code_data_url: data.qr_code_data_url,
        nome: p.nome_completo,
        titulo: p.titulo,
      });
    } catch {
      toast('Erro ao carregar QR Code.', 'erro');
    }
  }

  async function confirmarRevogacao(status, motivo) {
    try {
      await api.patch(`/certificados/${modalRev.id}/revogar`, { status, motivo });
      toast('Certificado revogado.', 'aviso');
      setModalRev(null);
      carregar(formacaoSel);
    } catch {
      toast('Erro ao revogar.', 'erro');
    }
  }

  const aptosSemCert = inscritos.filter(p =>
    fmtPct(p.total_presentes, p.total_aulas) >= 75 && !p.codigo_validacao
  ).length;

  return (
    <PainelLayout titulo="Certificados">

      {/* Modais */}
      {modalQR  && <ModalQRCode cert={modalQR} onClose={() => setModalQR(null)} />}
      {modalRev && <ModalRevogar cert={modalRev} onClose={() => setModalRev(null)} onConfirm={confirmarRevogacao} />}

      {/* Seletor de formação */}
      <div className="card mb-24">
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="campo" style={{ marginBottom:0, flex:1, minWidth:240 }}>
            <label>Formação Concluída</label>
            <select value={formacaoSel} onChange={e => carregar(e.target.value)}>
              <option value="">— Selecione —</option>
              {formacoes.map(f => (
                <option key={f.id} value={f.id}>{f.titulo} ({fmtData(f.data_fim)})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? <Spinner /> : !formacaoSel ? (
        <div className="vazio"><div className="vazio-icone">🎓</div><p>Selecione uma formação concluída.</p></div>
      ) : inscritos.length === 0 ? (
        <div className="vazio"><div className="vazio-icone">🎓</div><p>Nenhum participante inscrito.</p></div>
      ) : (
        <div className="card p-0">
          <div className="card-titulo p-24" style={{ marginBottom:0, borderRadius:'var(--raio-lg) var(--raio-lg) 0 0' }}>
            <span className="icone">🎓</span> Emissão de Certificados
            <span style={{ marginLeft:'auto', fontSize:'.82rem', color:'var(--cinza-500)' }}>
              {inscritos.length} participante(s)
            </span>
            <button
              className="btn btn-primario btn-sm"
              style={{ marginLeft:16 }}
              onClick={emitirTodos}
              disabled={emitindoTodos || aptosSemCert === 0}
            >
              {emitindoTodos ? '⏳ Emitindo...' : `🎓 Emitir Todos${aptosSemCert > 0 ? ` (${aptosSemCert})` : ''}`}
            </button>
          </div>

          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>CPF</th>
                  <th>Frequência</th>
                  <th>Apto?</th>
                  <th>Certificado</th>
                  <th>Consultas</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {inscritos.map(p => {
                  const pct    = fmtPct(p.total_presentes, p.total_aulas);
                  const apto   = pct >= 75;
                  const temCert = !!p.codigo_validacao;
                  const ativo   = p.cert_status === 'ativo';

                  return (
                    <tr key={p.inscricao_id}>

                      {/* Participante */}
                      <td>
                        <div style={{ fontWeight:600 }}>{p.nome_completo}</div>
                        <div style={{ fontSize:'.78rem', color:'var(--cinza-500)' }}>{p.email}</div>
                      </td>

                      {/* CPF */}
                      <td style={{ fontSize:'.85rem' }}>{p.cpf}</td>

                      {/* Frequência */}
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div className="progress-bar" style={{ width:80 }}>
                            <div
                              className={`progress-fill ${pct>=75?'alto':pct>=50?'medio':'baixo'}`}
                              style={{ width:`${pct}%` }}
                            />
                          </div>
                          <span style={{ fontSize:'.85rem', fontWeight:700, color: apto?'var(--verde)':'var(--cor-perigo)' }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ fontSize:'.75rem', color:'var(--cinza-500)' }}>
                          {p.total_presentes}/{p.total_aulas} aulas
                        </div>
                      </td>

                      {/* Apto */}
                      <td>
                        {apto
                          ? <span style={{ color:'var(--verde)', fontWeight:700 }}>✅ Sim</span>
                          : <span style={{ color:'var(--cor-perigo)', fontWeight:700 }}>❌ Não</span>}
                      </td>

                      {/* Certificado */}
                      <td>
                        {temCert ? (
                          <div style={{ fontSize:'.8rem' }}>
                            <div style={{ fontWeight:700, color: ativo?'var(--verde)':'var(--cor-perigo)' }}>
                              {ativo ? '✅ Ativo' : p.cert_status === 'cancelado' ? '🚫 Cancelado' : '🔄 Substituído'}
                            </div>
                            <div style={{ color:'var(--cinza-500)', fontFamily:'monospace', fontSize:'.7rem' }}>
                              {p.hash_unico ? p.hash_unico.slice(0,18)+'…' : p.codigo_validacao}
                            </div>
                            <div style={{ color:'var(--cinza-500)' }}>{fmtData(p.data_emissao)}</div>
                          </div>
                        ) : (
                          <span style={{ color:'var(--cinza-400)', fontSize:'.85rem' }}>— Não emitido —</span>
                        )}
                      </td>

                      {/* Consultas QR */}
                      <td style={{ textAlign:'center' }}>
                        {temCert
                          ? <span style={{ fontSize:'.85rem', fontWeight:600 }}>👁 {p.total_consultas || 0}</span>
                          : '—'}
                      </td>

                      {/* Ações */}
                      <td>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          {/* Ainda não emitido e apto */}
                          {apto && !temCert && (
                            <button className="btn btn-primario btn-sm" onClick={() => emitir(p)}>
                              🎓 Emitir
                            </button>
                          )}

                          {/* Emitido e ativo */}
                          {temCert && ativo && (
                            <>
                              <button className="btn btn-secundario btn-sm" onClick={() => abrirPdf(p.codigo_validacao)}>
                                📄 PDF
                              </button>
                              <button className="btn btn-secundario btn-sm" onClick={() => verQR(p)}>
                                📱 Ver QR
                              </button>
                              <button
                                className="btn btn-sm"
                                style={{ background:'#fee2e2', color:'#7f1d1d', fontSize:'.75rem' }}
                                onClick={() => setModalRev({
                                  id: p.certificado_id,
                                  nome: p.nome_completo,
                                  titulo: p.titulo,
                                })}
                              >
                                🚫 Revogar
                              </button>
                            </>
                          )}

                          {/* Revogado — permite reemitir */}
                          {temCert && !ativo && (
                            <button className="btn btn-primario btn-sm" onClick={() => emitir(p)}>
                              🔄 Reemitir
                            </button>
                          )}

                          {/* Não apto */}
                          {!apto && !temCert && (
                            <span className="btn btn-sm" style={{ background:'var(--cinza-200)', color:'var(--cinza-500)', cursor:'default' }}>
                              Freq. insuf.
                            </span>
                          )}
                        </div>
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