import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner, fmtData } from '../../components/ui';
import api from '../../api';

/* ─── Modal QR Code ─────────────────────────────────────────── */
function ModalQRCode({ cert, onClose }) {
  const BASE = window.location.origin;

  async function copiarLink() {
    await navigator.clipboard.writeText(`${BASE}/validar/${cert.hash_unico}`);
    alert('Link de validação copiado!');
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:360, width:'90%', textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin:'0 0 4px', fontSize:17 }}>📱 QR Code de Autenticidade</h3>
        <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 20px' }}>{cert.titulo}</p>

        {cert.qr_code_data_url
          ? <img src={cert.qr_code_data_url} alt="QR Code" style={{ width:200, height:200, borderRadius:8, border:'1px solid #e5e7eb' }} />
          : <p style={{ color:'#9ca3af' }}>Carregando QR…</p>
        }

        <p style={{ fontSize:11, fontFamily:'monospace', color:'#9ca3af', margin:'12px 0 0', wordBreak:'break-all' }}>
          {BASE}/validar/{cert.hash_unico}
        </p>

        <div style={{ display:'flex', gap:8, marginTop:20, justifyContent:'center', flexWrap:'wrap' }}>
          <a href={`/validar/${cert.hash_unico}`} target="_blank" rel="noreferrer" className="btn btn-primario btn-sm">
            🔗 Abrir validação
          </a>
          <button className="btn btn-secundario btn-sm" onClick={copiarLink}>
            📋 Copiar link
          </button>
          <button className="btn btn-sm" style={{ background:'#f3f4f6', color:'#374151' }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente principal ──────────────────────────────────── */
export default function PartCertificados() {
  const [certs, setCerts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalQR, setModalQR] = useState(null); // { ...cert, qr_code_data_url }

  useEffect(() => {
    api.get('/certificados/meus')
      .then(r => setCerts(r.data.data))
      .catch(() => setCerts([]))
      .finally(() => setLoading(false));
  }, []);

  async function abrirPdf(codigoValidacao) {
    try {
      const response = await api.get(`/certificados/${codigoValidacao}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
    } catch {
      alert('Erro ao abrir o certificado. Tente novamente.');
    }
  }

  async function verQR(cert) {
    // Abre o modal imediatamente (sem QR ainda) para dar feedback visual
    setModalQR({ ...cert, qr_code_data_url: null });
    try {
      const { data } = await api.get(`/certificados/${cert.id}/qrcode`);
      setModalQR(prev => ({ ...prev, qr_code_data_url: data.qr_code_data_url }));
    } catch {
      setModalQR(null);
      alert('Erro ao carregar QR Code.');
    }
  }

  return (
    <PainelLayout titulo="Meus Certificados">

      {/* Modal */}
      {modalQR && <ModalQRCode cert={modalQR} onClose={() => setModalQR(null)} />}

      <div className="mb-24">
        <h2 style={{ fontSize:'1.4rem', fontWeight:800 }}>Meus Certificados</h2>
        <p style={{ color:'var(--cinza-600)', fontSize:'.88rem' }}>{certs.length} certificado(s) obtido(s)</p>
      </div>

      {loading ? <Spinner /> : certs.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">🎓</div>
          <p>Você ainda não possui certificados. Complete uma formação com ≥75% de frequência!</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:20 }}>
          {certs.map(c => (
            <div key={c.id} className="card animar-entrada" style={{ borderTop:'4px solid var(--laranja)' }}>

              {/* Cabeçalho do card */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ fontSize:'2.5rem' }}>🎓</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:'1.05rem' }}>{c.titulo}</div>
                  <div style={{ fontSize:'.82rem', color:'var(--cinza-500)' }}>
                    Emitido em {fmtData(c.data_emissao)}
                  </div>
                </div>
              </div>

              {/* Detalhes */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:'.88rem' }}>
                {[
                  ['Participante',  c.nome_completo],
                  ['Carga Horária', (c.carga_horaria_cursada || c.carga_horaria) + 'h'],
                  ['Período',       fmtData(c.data_inicio) + ' a ' + fmtData(c.data_fim)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--cinza-600)' }}>{k}:</span>
                    <span style={{ fontWeight:700 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Código legível */}
              <div style={{ marginTop:16, padding:'10px 14px', background:'var(--laranja-bg)', borderRadius:'var(--raio)', fontFamily:'monospace', fontSize:'.82rem', wordBreak:'break-all', color:'var(--laranja)', fontWeight:700 }}>
                {c.codigo_validacao}
              </div>

              {/* Ações */}
              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <button
                  className="btn btn-secundario btn-sm"
                  style={{ flex:1 }}
                  onClick={() => abrirPdf(c.codigo_validacao)}
                >
                  📄 PDF
                </button>
                <button
                  className="btn btn-primario btn-sm"
                  style={{ flex:1 }}
                  onClick={() => verQR(c)}
                >
                  📱 QR Code
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </PainelLayout>
  );
}