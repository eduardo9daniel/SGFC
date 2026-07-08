import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeaderPublico, FooterPublico } from '../../components/PublicLayout';
import { fmtData } from '../../components/ui';
import api from '../../api';

export default function ValidarCertificado() {
  const [codigo, setCodigo] = useState('');
  const [result, setResult] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function buscar(e) {
    e.preventDefault();
    setErro(''); setResult(null); setLoading(true);
    try {
      const { data } = await api.get(`/certificados/validar/${codigo.trim()}`);
      setResult(data.data);
    } catch {
      setErro('Certificado não encontrado. Verifique o código.');
    } finally { setLoading(false); }
  }

  return (
    <div>
      <HeaderPublico />
      <section style={{ maxWidth: 600, margin: '60px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎓</div>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Validar Certificado</h1>
          <p style={{ color: 'var(--cinza-600)' }}>Informe o código do certificado para verificar sua autenticidade.</p>
        </div>
        <div className="card">
          <form onSubmit={buscar}>
            <div className="campo">
              <label>Código do Certificado</label>
              <input type="text" placeholder="Ex: A1B2C3D4E5F6G7H8-20240101"
                value={codigo} onChange={e => setCodigo(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primario btn-full btn-lg" disabled={loading}>
              {loading ? 'Verificando…' : '🔍 Verificar Certificado'}
            </button>
          </form>

          {erro && <div className="alerta alerta-erro" style={{ marginTop: 20 }}>❌ {erro}</div>}

          {result && (
            <div style={{ marginTop: 24, padding: 24, background: 'var(--verde-claro)', borderRadius: 'var(--raio-lg)', border: '2px solid var(--verde)' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: '2.5rem' }}>✅</div>
                <h3 style={{ color: 'var(--verde-escuro)', fontSize: '1.3rem' }}>Certificado Válido!</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Participante', result.nome_completo],
                  ['Formação', result.titulo],
                  ['Carga Horária', `${result.carga_horaria_cursada || result.carga_horaria}h`],
                  ['Período', `${fmtData(result.data_inicio)} a ${fmtData(result.data_fim)}`],
                  ['Data de Emissão', fmtData(result.data_emissao)],
                  ['Código', result.codigo_validacao],
                ].map(([k,v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.9rem' }}>
                    <span style={{ color: 'var(--cinza-600)', fontWeight: 600 }}>{k}:</span>
                    <span style={{ fontWeight: 700, color: 'var(--cinza-800)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '.9rem', color: 'var(--cinza-600)' }}>
          <Link to="/login">← Voltar ao login</Link>
        </p>
      </section>
      <FooterPublico />
    </div>
  );
}
