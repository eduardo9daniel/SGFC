import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

const statusList = ['aberta', 'andamento', 'concluida', 'cancelada'];

const empty = {
  titulo: '',
  descricao: '',
  carga_horaria: '',
  data_inicio: '',
  data_fim: '',
  horario: '',
  local: '',
  vagas: '',
  instrutor: '',
  status: 'aberta',

  proposito: '',
  respNome: '',
  respTel: '',
  respEmail: '',
  repete: 'nao',
  outrasDatas: '',
  turnoManha: false,
  turnoTarde: false,
  turnoNoite: false,
  qtdManha: '',
  qtdTarde: '',
  qtdNoite: '',
  horaInicio: '',
  horaFim: '',
  obs: ''
};

export default function AdminFormacoes() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [formacoes, setFormacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [acao, setAcao] = useState('listar');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  async function carregar() {
    setLoading(true);
    const { data } = await api.get('/formacoes');
    setFormacoes(data.data);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const editar = params.get('editar');

    if (editar) {
      api.get(`/formacoes/${editar}`).then(r => {
        const f = r.data.data;

        setForm({
          ...empty,
          ...f,
          data_inicio: f.data_inicio?.slice(0, 10) || '',
          data_fim: f.data_fim?.slice(0, 10) || '',
          proposito: f.descricao || '',
          respNome: f.instrutor || '',
          horaInicio: '',
          horaFim: ''
        });

        setEditId(Number(editar));
        setAcao('editar');
      });
    }
  }, [params]);

  function novaFormacao() {
    setForm(empty);
    setEditId(null);
    setAcao('nova');
  }

  function voltar() {
    setAcao('listar');
    setParams({});
    setForm(empty);
    setEditId(null);
  }

  function atualizar(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function toggleTurno(campo) {
    setForm(f => ({ ...f, [campo]: !f[campo] }));
  }

  function maskPhone(value) {
    let v = value.replace(/\D/g, '');

    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }

    return v;
  }

  function montarPayload() {
    const turnosSelecionados = [
      form.turnoManha ? 'Manhã' : null,
      form.turnoTarde ? 'Tarde' : null,
      form.turnoNoite ? 'Noite' : null
    ].filter(Boolean);

    const totalVagas =
      Number(form.qtdManha || 0) +
      Number(form.qtdTarde || 0) +
      Number(form.qtdNoite || 0);

    const descricaoCompleta = [
      form.proposito ? `Propósito / Objetivo:\n${form.proposito}` : '',
      form.repete === 'sim' && form.outrasDatas ? `Outras datas:\n${form.outrasDatas}` : '',
      form.respNome ? `Responsável:\n${form.respNome}` : '',
      form.respTel ? `Telefone:\n${form.respTel}` : '',
      form.respEmail ? `E-mail:\n${form.respEmail}` : '',
      form.obs ? `Observações:\n${form.obs}` : ''
    ].filter(Boolean).join('\n\n');

    const horarioCompleto = [
      form.horaInicio && form.horaFim ? `${form.horaInicio} às ${form.horaFim}` : '',
      turnosSelecionados.length ? `Turnos: ${turnosSelecionados.join(', ')}` : '',
      form.qtdManha ? `Manhã: ${form.qtdManha} convidados` : '',
      form.qtdTarde ? `Tarde: ${form.qtdTarde} convidados` : '',
      form.qtdNoite ? `Noite: ${form.qtdNoite} convidados` : ''
    ].filter(Boolean).join(' | ');

    return {
      titulo: form.titulo,
      descricao: descricaoCompleta,
      carga_horaria: form.carga_horaria || 1,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || form.data_inicio,
      horario: horarioCompleto,
      local: form.local || '',
      vagas: totalVagas || Number(form.vagas || 1),
      instrutor: form.respNome || form.instrutor || '',
      status: form.status || 'aberta'
    };
  }

  async function salvar(e) {
    e.preventDefault();

    if (!form.titulo.trim()) return toast('Informe o título do encontro.', 'erro');
    if (!form.proposito.trim() && !form.descricao.trim()) return toast('Informe o propósito do encontro.', 'erro');
    if (!form.respNome.trim()) return toast('Informe o responsável.', 'erro');
    if (!form.data_inicio) return toast('Informe a data do encontro.', 'erro');
    if (!form.turnoManha && !form.turnoTarde && !form.turnoNoite) return toast('Selecione ao menos um turno.', 'erro');

    try {
      const payload = montarPayload();

      if (editId) await api.put(`/formacoes/${editId}`, payload);
      else await api.post('/formacoes', payload);

      toast(editId ? 'Formação atualizada!' : 'Formação criada!');
      voltar();
      carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao salvar.', 'erro');
    }
  }

  async function excluir(id) {
    if (!confirm('Excluir esta formação? Esta ação não pode ser desfeita.')) return;

    try {
      await api.delete(`/formacoes/${id}`);
      toast('Formação excluída.');
      carregar();
    } catch {
      toast('Erro ao excluir.', 'erro');
    }
  }

  const filtradas = formacoes.filter(f => {
    const ok1 =
      !busca ||
      f.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (f.instrutor || '').toLowerCase().includes(busca.toLowerCase());

    const ok2 = !statusFiltro || f.status === statusFiltro;

    return ok1 && ok2;
  });

  if (loading && acao === 'listar') {
    return (
      <PainelLayout titulo="Formações">
        <Spinner />
      </PainelLayout>
    );
  }

  if (acao !== 'listar') {
    return (
      <PainelLayout titulo={acao === 'nova' ? 'Agendar Formação' : 'Editar Formação'}>
        <div className="d-flex align-center gap-12 mb-24"style={{flexWrap: 'wrap'}}>
          <button className="btn btn-outline btn-sm" onClick={voltar}>
            ← Voltar
          </button>

          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {acao === 'nova' ? 'Agendar Encontro Formativo' : 'Editar Encontro Formativo'}
            </h2>
            <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
              Preencha os dados abaixo para registrar o encontro formativo.
            </p>
          </div>
        </div>

        <div className="card"style={{width: '100%',maxWidth: 980}}>
          <form onSubmit={salvar} noValidate>
            <h3 style={sectionStyle}>Informações do Encontro</h3>

            <div className="campo">
              <label>Título do encontro formativo *</label>
              <input
                type="text"
                value={form.titulo}
                onChange={e => atualizar('titulo', e.target.value)}
                placeholder="Ex: Formação de Líderes Comunitários"
                required
              />
            </div>

            <div className="campo">
              <label>Propósito / Objetivo *</label>
              <textarea
                value={form.proposito}
                onChange={e => atualizar('proposito', e.target.value)}
                placeholder="Descreva o objetivo principal deste encontro..."
                rows={4}
              />
            </div>

            <h3 style={sectionStyle}>Responsável</h3>

            <div style={grid3}>
              <div className="campo">
                <label>Nome do responsável *</label>
                <input
                  type="text"
                  value={form.respNome}
                  onChange={e => atualizar('respNome', e.target.value)}
                  placeholder="Nome completo"
                />
              </div>

              <div className="campo">
                <label>Telefone</label>
                <input
                  type="text"
                  value={form.respTel}
                  onChange={e => atualizar('respTel', maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="campo">
                <label>E-mail</label>
                <input
                  type="email"
                  value={form.respEmail}
                  onChange={e => atualizar('respEmail', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <h3 style={sectionStyle}>Datas e Turnos</h3>

            <div style={grid2}>
              <div className="campo">
                <label>Data do encontro *</label>
                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={e => {
                    atualizar('data_inicio', e.target.value);
                    if (!form.data_fim) atualizar('data_fim', e.target.value);
                  }}
                  required
                />
              </div>

              <div className="campo">
                <label>Repete em outras datas?</label>

                <div className="d-flex gap-16 mt-8">
                  <label>
                    <input
                      type="radio"
                      name="repete"
                      value="nao"
                      checked={form.repete === 'nao'}
                      onChange={e => atualizar('repete', e.target.value)}
                    />{' '}
                    Não
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="repete"
                      value="sim"
                      checked={form.repete === 'sim'}
                      onChange={e => atualizar('repete', e.target.value)}
                    />{' '}
                    Sim
                  </label>
                </div>

                {form.repete === 'sim' && (
                  <input
                    type="text"
                    value={form.outrasDatas}
                    onChange={e => atualizar('outrasDatas', e.target.value)}
                    placeholder="Ex: 15/08/2026, 22/08/2026"
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>
            </div>

            <div className="campo">
              <label>Turno(s) *</label>

              <div style={turnoGrid}>
                <button
                  type="button"
                  onClick={() => toggleTurno('turnoManha')}
                  style={turnoStyle(form.turnoManha)}
                >
                  {form.turnoManha ? '✓ ' : ''}Manhã
                </button>

                <button
                  type="button"
                  onClick={() => toggleTurno('turnoTarde')}
                  style={turnoStyle(form.turnoTarde)}
                >
                  {form.turnoTarde ? '✓ ' : ''}Tarde
                </button>

                <button
                  type="button"
                  onClick={() => toggleTurno('turnoNoite')}
                  style={turnoStyle(form.turnoNoite)}
                >
                  {form.turnoNoite ? '✓ ' : ''}Noite
                </button>
              </div>
            </div>

            <h3 style={sectionStyle}>Quantidade de Convidados por Turno</h3>

            <div style={grid3}>
              <div className="campo">
                <label>Manhã</label>
                <input
                  type="number"
                  min="0"
                  value={form.qtdManha}
                  onChange={e => atualizar('qtdManha', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="campo">
                <label>Tarde</label>
                <input
                  type="number"
                  min="0"
                  value={form.qtdTarde}
                  onChange={e => atualizar('qtdTarde', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="campo">
                <label>Noite</label>
                <input
                  type="number"
                  min="0"
                  value={form.qtdNoite}
                  onChange={e => atualizar('qtdNoite', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <h3 style={sectionStyle}>Horários</h3>

            <div style={grid2}>
              <div className="campo">
                <label>Horário de início</label>
                <input
                  type="time"
                  value={form.horaInicio}
                  onChange={e => atualizar('horaInicio', e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Horário de encerramento</label>
                <input
                  type="time"
                  value={form.horaFim}
                  onChange={e => atualizar('horaFim', e.target.value)}
                />
              </div>
            </div>

            <h3 style={sectionStyle}>Dados Complementares</h3>

            <div style={grid3}>
              <div className="campo">
                <label>Carga Horária (h)</label>
                <input
                  type="number"
                  min="1"
                  value={form.carga_horaria}
                  onChange={e => atualizar('carga_horaria', e.target.value)}
                  placeholder="Ex: 4"
                />
              </div>

              <div className="campo">
                <label>Local</label>
                <input
                  type="text"
                  value={form.local}
                  onChange={e => atualizar('local', e.target.value)}
                  placeholder="Ex: Auditório Central"
                />
              </div>

              <div className="campo">
                <label>Status</label>
                <select value={form.status} onChange={e => atualizar('status', e.target.value)}>
                  {statusList.map(s => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="campo">
              <label>Observações gerais</label>
              <textarea
                value={form.obs}
                onChange={e => atualizar('obs', e.target.value)}
                placeholder="Informações adicionais, requisitos especiais, localização etc."
                rows={4}
              />
            </div>

            <div className="d-flex gap-12 mt-24"style={{flexWrap: 'wrap'}}>
              <button type="submit" className="btn btn-primario btn-lg">
                {editId ? '💾 Salvar Alterações' : '✅ Agendar Formação'}
              </button>

              <button type="button" className="btn btn-outline btn-lg" onClick={voltar}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Formações">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Gerenciar Formações
          </h2>
          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
            {formacoes.length} formação(ões)
          </p>
        </div>

        <button className="btn btn-primario" onClick={novaFormacao}>
          + Nova Formação
        </button>
      </div>

      <div className="card mb-24">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="campo" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label>Buscar formação</label>
            <input
              type="text"
              placeholder="Título ou responsável…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="campo" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Status</label>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
              <option value="">Todos</option>
              {statusList.map(s => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-outline"
            onClick={() => {
              setBusca('');
              setStatusFiltro('');
            }}
          >
            Limpar
          </button>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">📚</div>
          <p>Nenhuma formação encontrada.</p>
        </div>
      ) : (
        <div className="card p-0">
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Título</th>
                  <th>Responsável</th>
                  <th>Período</th>
                  <th>Carga</th>
                  <th>Vagas</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filtradas.map(f => (
                  <tr key={f.id}>
                    <td style={{ color: 'var(--cinza-500)', fontSize: '.82rem' }}>
                      {f.id}
                    </td>

                    <td style={{ fontWeight: 600, maxWidth: 220 }}>
                      {f.titulo}
                    </td>

                    <td style={{ fontSize: '.88rem' }}>
                      {f.instrutor || '—'}
                    </td>

                    <td style={{ fontSize: '.83rem', whiteSpace: 'nowrap' }}>
                      {fmtData(f.data_inicio)}
                      <br />
                      {fmtData(f.data_fim)}
                    </td>

                    <td>{f.carga_horaria}h</td>

                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            f.vagas_disponiveis > 0
                              ? 'var(--verde)'
                              : 'var(--cor-perigo)'
                        }}
                      >
                        {f.vagas_disponiveis}
                      </span>
                      /{f.vagas}
                    </td>

                    <td>
                      <Badge status={f.status} />
                    </td>

                    <td>
                      <div className="d-flex gap-8">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setForm({
                              ...empty,
                              ...f,
                              data_inicio: f.data_inicio?.slice(0, 10) || '',
                              data_fim: f.data_fim?.slice(0, 10) || '',
                              proposito: f.descricao || '',
                              respNome: f.instrutor || ''
                            });

                            setEditId(f.id);
                            setAcao('editar');
                          }}
                        >
                          ✏️ Editar
                        </button>

                        <button
                          className="btn btn-perigo btn-sm"
                          onClick={() => excluir(f.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PainelLayout>
  );
}

const sectionStyle = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#EA5B23',
  borderBottom: '1.5px solid #EA5B23',
  paddingBottom: 6,
  marginBottom: 16,
  marginTop: 24,
  textTransform: 'uppercase',
  letterSpacing: '.4px'
};

const grid2 = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16
};

const grid3 = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: 16
};

const turnoGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 12,
  marginTop: 8
};

function turnoStyle(selected) {
  return {
    border: selected ? '1.5px solid #EA5B23' : '1.5px solid #ddd',
    background: selected ? '#FFF5F1' : '#fff',
    color: '#333',
    borderRadius: 8,
    padding: '12px 14px',
    cursor: 'pointer',
    fontWeight: 600,
    textAlign: 'left'
  };
}