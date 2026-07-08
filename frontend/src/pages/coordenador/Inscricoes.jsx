// pages/admin/Inscricoes.jsx  (e pages/coordenador/Inscricoes.jsx — mesma lógica)
// ALTERADO: adicionado botão "Inscrever Participante" com modal para admin e coord.

import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData, fmtPct } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

// ─── Modal reutilizável ────────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--branco)', borderRadius: 'var(--raio-lg)',
          padding: 32, width: '100%', maxWidth: 520,
          boxShadow: '0 8px 40px rgba(0,0,0,.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{titulo}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--cinza-500)' }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Modal: Inscrever Participante ────────────────────────────
// Permite selecionar um participante e inscrever na formação já selecionada
function ModalInscreverParticipante({ formacaoId, formacaoTitulo, onClose, onSuccess }) {
  const toast = useToast();
  const [participantes, setParticipantes] = useState([]);
  const [buscaPart, setBuscaPart]         = useState('');
  const [usuarioId, setUsuarioId]         = useState('');
  const [loadingPart, setLoadingPart]     = useState(true);
  const [salvando, setSalvando]           = useState(false);

  useEffect(() => {
    api.get('/usuarios?tipo=participante&p=1')
      .then(r => setParticipantes(r.data.data))
      .finally(() => setLoadingPart(false));
  }, []);

  const filtrados = participantes.filter(p =>
    !buscaPart ||
    p.nome_completo.toLowerCase().includes(buscaPart.toLowerCase()) ||
    p.email.toLowerCase().includes(buscaPart.toLowerCase())
  );

  async function inscrever() {
    if (!usuarioId) return toast('Selecione um participante.', 'erro');
    setSalvando(true);
    try {
      await api.post('/inscricoes/admin', { usuario_id: usuarioId, formacao_id: formacaoId });
      const nome = participantes.find(p => p.id === parseInt(usuarioId))?.nome_completo || '';
      toast(`${nome} inscrito com sucesso!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao inscrever.', 'erro');
    } finally { setSalvando(false); }
  }

  return (
    <Modal titulo={`📋 Inscrever em: ${formacaoTitulo}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Buscar participante</label>
          <input
            type="text"
            placeholder="Nome ou e-mail…"
            value={buscaPart}
            onChange={e => setBuscaPart(e.target.value)}
          />
        </div>

        {loadingPart ? <Spinner /> : (
          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Selecionar participante *</label>
            <select
              value={usuarioId}
              onChange={e => setUsuarioId(e.target.value)}
              size={Math.min(filtrados.length + 1, 6)}
              style={{ height: 'auto' }}
            >
              <option value="">— Escolha —</option>
              {filtrados.map(p => (
                <option key={p.id} value={p.id}>{p.nome_completo} — {p.email}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-outline" onClick={onClose} disabled={salvando}>Cancelar</button>
          <button className="btn btn-primario" onClick={inscrever} disabled={salvando || !usuarioId}>
            {salvando ? 'Inscrevendo…' : 'Confirmar Inscrição'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Componente principal ──────────────────────────────────────
export default function AdminInscricoes() {
  const toast = useToast();
  const [formacoes, setFormacoes]   = useState([]);
  const [formacaoSel, setFormacaoSel] = useState('');
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [modalInscr, setModalInscr] = useState(false);

  useEffect(() => {
    api.get('/formacoes').then(r => setFormacoes(r.data.data));
  }, []);

  async function carregar(id) {
    setFormacaoSel(id);
    if (!id) { setInscricoes([]); return; }
    setLoading(true);
    const { data } = await api.get(`/inscricoes?formacao_id=${id}`);
    setInscricoes(data.data);
    setLoading(false);
  }

  const formacaoAtual = formacoes.find(f => f.id === parseInt(formacaoSel));

  return (
    <PainelLayout titulo="Inscrições">
      {/* ── Seletor de formação + botão Inscrever ── */}
      <div className="card mb-24">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="campo" style={{ marginBottom: 0, flex: 1, minWidth: 240 }}>
            <label>Selecionar Formação</label>
            <select value={formacaoSel} onChange={e => carregar(e.target.value)}>
              <option value="">— Todas as formações —</option>
              {formacoes.map(f => (
                <option key={f.id} value={f.id}>{f.titulo} ({f.status})</option>
              ))}
            </select>
          </div>

          {/* NOVO: botão habilitado apenas quando uma formação aberta está selecionada */}
          {formacaoSel && formacaoAtual?.status === 'aberta' && (
            <button
              className="btn btn-primario"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => setModalInscr(true)}
            >
              ➕ Inscrever Participante
            </button>
          )}
        </div>
      </div>

      {/* ── Lista de inscrições ── */}
      {loading ? <Spinner /> : formacaoSel && inscricoes.length === 0 ? (
        <div className="vazio"><div className="vazio-icone">📋</div><p>Nenhuma inscrição nesta formação.</p></div>
      ) : !formacaoSel ? (
        <div className="vazio"><div className="vazio-icone">📋</div><p>Selecione uma formação para ver as inscrições.</p></div>
      ) : (
        <div className="card p-0">
          <div
            className="card-titulo p-24"
            style={{ marginBottom: 0, borderRadius: 'var(--raio-lg) var(--raio-lg) 0 0' }}
          >
            <span className="icone">📋</span> Inscrições
            <span style={{ marginLeft: 'auto', fontSize: '.82rem', color: 'var(--cinza-500)' }}>
              {inscricoes.length} inscrito(s)
            </span>
          </div>
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>#</th><th>Nome</th><th>E-mail</th><th>CPF</th>
                  <th>Telefone</th><th>Inscrição</th><th>Frequência</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inscricoes.map((i, idx) => {
                  const pct = fmtPct(i.presentes, i.total_aulas);
                  return (
                    <tr key={i.id}>
                      <td style={{ color: 'var(--cinza-400)', fontSize: '.8rem' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{i.nome_completo}</td>
                      <td style={{ fontSize: '.85rem' }}>{i.email}</td>
                      <td style={{ fontSize: '.83rem' }}>{i.cpf}</td>
                      <td style={{ fontSize: '.83rem' }}>{i.telefone || '—'}</td>
                      <td style={{ fontSize: '.82rem' }}>{fmtData(i.data_inscricao)}</td>
                      <td>
                        {i.total_aulas > 0 ? (
                          <span style={{ fontWeight: 700, color: pct >= 75 ? 'var(--verde)' : 'var(--cor-perigo)' }}>
                            {pct}%{' '}
                            <span style={{ color: 'var(--cinza-400)', fontSize: '.75rem' }}>
                              ({i.presentes}/{i.total_aulas})
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--cinza-400)', fontSize: '.82rem' }}>—</span>
                        )}
                      </td>
                      <td><Badge status={i.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Inscrever ── */}
      {modalInscr && formacaoAtual && (
        <ModalInscreverParticipante
          formacaoId={formacaoAtual.id}
          formacaoTitulo={formacaoAtual.titulo}
          onClose={() => setModalInscr(false)}
          onSuccess={() => carregar(formacaoSel)}
        />
      )}
    </PainelLayout>
  );
}