// pages/coordenador/Participantes.jsx

import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner, fmtData } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

function mascaraCPF(v) {
  return v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function mascaraTel(v) {
  v = v.replace(/\D/g, '').substring(0, 11);

  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }

  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function Modal({ titulo, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--branco)',
          borderRadius: 'var(--raio-lg)',
          padding: 32,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,.18)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            {titulo}
          </h3>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              color: 'var(--cinza-500)'
            }}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalCriarParticipante({ regioes = [], onClose, onSuccess }) {
  const toast = useToast();

  const [form, setForm] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    regiao_id: '',
    senha: ''
  });

  const [salvando, setSalvando] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
  };

  async function salvar() {
    if (!form.nome_completo || !form.email || !form.cpf || !form.senha) {
      return toast('Preencha todos os campos obrigatórios.', 'erro');
    }

    if (!form.regiao_id) {
      return toast('Selecione a região do participante.', 'erro');
    }

    if (form.senha.length < 8) {
      return toast('A senha deve ter ao menos 8 caracteres.', 'erro');
    }

    setSalvando(true);

    try {
      await api.post('/usuarios', {
        nome_completo: form.nome_completo,
        email: form.email,
        cpf: form.cpf,
        telefone: form.telefone,
        data_nascimento: form.data_nascimento,
        regiao_id: form.regiao_id,
        senha: form.senha,
        tipo_usuario: 'participante'
      });

      toast('Participante criado com sucesso!', 'sucesso');
      onSuccess();
      onClose();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao criar participante.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo="➕ Criar Participante" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Nome completo *</label>
          <input
            value={form.nome_completo}
            onChange={e => set('nome_completo', e.target.value)}
            placeholder="Nome completo"
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12
          }}
        >
          <div className="campo" style={{ marginBottom: 0 }}>
            <label>E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <label>CPF *</label>
            <input
              value={form.cpf}
              maxLength={14}
              onChange={e => set('cpf', mascaraCPF(e.target.value))}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Telefone</label>
            <input
              value={form.telefone}
              maxLength={15}
              onChange={e => set('telefone', mascaraTel(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Data de nascimento</label>
            <input
              type="date"
              value={form.data_nascimento}
              onChange={e => set('data_nascimento', e.target.value)}
            />
          </div>
        </div>

        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Região *</label>
          <select
            value={form.regiao_id}
            onChange={e => set('regiao_id', e.target.value)}
          >
            <option value="">Selecione uma região</option>

            {regioes.map(regiao => (
              <option key={regiao.id} value={regiao.id}>
                {regiao.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Senha inicial *</label>
          <input
            type="password"
            value={form.senha}
            onChange={e => set('senha', e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            marginTop: 8
          }}
        >
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            className="btn btn-primario"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Criar Participante'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalInscreverParticipante({
  participanteId,
  participanteNome,
  formacoes,
  onClose,
  onSuccess
}) {
  const toast = useToast();

  const [formacaoId, setFormacaoId] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function inscrever() {
    if (!formacaoId) {
      return toast('Selecione uma formação.', 'erro');
    }

    setSalvando(true);

    try {
      await api.post('/inscricoes/admin', {
        usuario_id: participanteId,
        formacao_id: formacaoId
      });

      toast(`${participanteNome} inscrito com sucesso!`, 'sucesso');
      onSuccess();
      onClose();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao inscrever.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={`📋 Inscrever: ${participanteNome}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Selecionar Formação *</label>

          <select
            value={formacaoId}
            onChange={e => setFormacaoId(e.target.value)}
          >
            <option value="">— Escolha uma formação aberta —</option>

            {formacoes
              .filter(f => f.status === 'aberta')
              .map(f => (
                <option key={f.id} value={f.id}>
                  {f.titulo}
                  {f.regiao_nome ? ` - ${f.regiao_nome}` : ''}
                  {` (${f.vagas_disponiveis ?? '?'} vagas)`}
                </option>
              ))}
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            flexWrap: 'wrap'
          }}
        >
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            className="btn btn-primario"
            onClick={inscrever}
            disabled={salvando}
          >
            {salvando ? 'Inscrevendo…' : 'Confirmar Inscrição'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function CoordParticipantes() {
  const toast = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [formacoes, setFormacoes] = useState([]);
  const [regioes, setRegioes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [regiaoFiltro, setRegiaoFiltro] = useState('');

  const [modalCriar, setModalCriar] = useState(false);
  const [modalInscr, setModalInscr] = useState(null);

  async function carregar() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        tipo: 'participante'
      });

      if (regiaoFiltro) {
        params.set('regiao_id', regiaoFiltro);
      }

      const [uRes, fRes, rRes] = await Promise.all([
        api.get(`/usuarios?${params.toString()}`),
        api.get('/formacoes'),
        api.get('/regioes')
      ]);

      setUsuarios(uRes.data.data || []);
      setFormacoes(fRes.data.data || []);
      setRegioes(rRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast('Erro ao carregar dados.', 'erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = usuarios.filter(u => {
    if (!busca) return true;

    const termo = busca.toLowerCase();

    return (
      String(u.nome_completo || '').toLowerCase().includes(termo) ||
      String(u.email || '').toLowerCase().includes(termo) ||
      String(u.cpf || '').toLowerCase().includes(termo) ||
      String(u.regiao_nome || '').toLowerCase().includes(termo)
    );
  });

  return (
    <PainelLayout titulo="Participantes">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Participantes
          </h2>

          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
            {filtrados.length} participante(s)
          </p>
        </div>

        <button
          className="btn btn-primario"
          onClick={() => setModalCriar(true)}
        >
          ➕ Criar Participante
        </button>
      </div>

      <div className="card mb-24">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 16,
            alignItems: 'end'
          }}
        >
          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Buscar participante</label>
            <input
              type="text"
              placeholder="Nome, e-mail, CPF ou região…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Região</label>
            <select
              value={regiaoFiltro}
              onChange={e => setRegiaoFiltro(e.target.value)}
            >
              <option value="">Todas</option>

              {regioes.map(regiao => (
                <option key={regiao.id} value={regiao.id}>
                  {regiao.nome}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primario" onClick={carregar}>
            Filtrar
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : filtrados.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">👥</div>
          <p>Nenhum participante encontrado.</p>
        </div>
      ) : (
        <div className="card p-0">
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>CPF</th>
                  <th>Telefone</th>
                  <th>Região</th>
                  <th>Cadastro</th>
                  <th>Status</th>
                  <th>Inscrever</th>
                </tr>
              </thead>

              <tbody>
                {filtrados.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--cinza-500)', fontSize: '.82rem' }}>
                      {u.id}
                    </td>

                    <td style={{ fontWeight: 600 }}>
                      {u.nome_completo}
                    </td>

                    <td style={{ fontSize: '.88rem' }}>
                      {u.email}
                    </td>

                    <td style={{ fontSize: '.83rem' }}>
                      {u.cpf}
                    </td>

                    <td style={{ fontSize: '.83rem' }}>
                      {u.telefone || '—'}
                    </td>

                    <td style={{ fontSize: '.83rem' }}>
                      {u.regiao_nome || '—'}
                    </td>

                    <td style={{ fontSize: '.82rem' }}>
                      {fmtData(u.data_cadastro)}
                    </td>

                    <td>
                      <span
                        style={{
                          color: u.status ? 'var(--verde)' : 'var(--cor-perigo)',
                          fontWeight: 700,
                          fontSize: '.85rem'
                        }}
                      >
                        {u.status ? '● Ativo' : '● Inativo'}
                      </span>
                    </td>

                    <td>
                      {u.status === 1 && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() =>
                            setModalInscr({
                              id: u.id,
                              nome: u.nome_completo
                            })
                          }
                        >
                          📋 Inscrever
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalCriar && (
        <ModalCriarParticipante
          regioes={regioes}
          onClose={() => setModalCriar(false)}
          onSuccess={carregar}
        />
      )}

      {modalInscr && (
        <ModalInscreverParticipante
          participanteId={modalInscr.id}
          participanteNome={modalInscr.nome}
          formacoes={formacoes}
          onClose={() => setModalInscr(null)}
          onSuccess={carregar}
        />
      )}
    </PainelLayout>
  );
}