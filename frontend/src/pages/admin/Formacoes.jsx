import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import FormularioFormacaoCampos from '../../components/FormularioFormacaoCampos';
import { Badge, Spinner, fmtData } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import {
  criarFormularioFormacaoVazio,
  formularioParaPayload,
  registroParaFormularioFormacao,
  validarFormularioFormacao
} from '../../utils/formacaoForm';
import api from '../../api';

const statusList = ['aberta', 'andamento', 'concluida', 'cancelada'];

export default function AdminFormacoes({ podeExcluir = true }) {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [formacoes, setFormacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(() => criarFormularioFormacaoVazio());
  const [editId, setEditId] = useState(null);
  const [acao, setAcao] = useState('listar');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      const { data } = await api.get('/formacoes');
      setFormacoes(data.data || []);
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao carregar formações.', 'erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    const editar = params.get('editar');
    if (!editar) return;

    api.get(`/formacoes/${editar}`)
      .then(r => {
        setForm(registroParaFormularioFormacao(r.data.data));
        setEditId(Number(editar));
        setAcao('editar');
      })
      .catch(err => toast(err.response?.data?.erro || 'Formação não encontrada.', 'erro'));
  }, [params]);

  function novaFormacao() {
    setForm(criarFormularioFormacaoVazio());
    setEditId(null);
    setAcao('nova');
  }

  function abrirEdicao(formacao) {
    setForm(registroParaFormularioFormacao(formacao));
    setEditId(formacao.id);
    setAcao('editar');
    setParams({ editar: String(formacao.id) });
  }

  function voltar() {
    setAcao('listar');
    setParams({});
    setForm(criarFormularioFormacaoVazio());
    setEditId(null);
  }

  async function salvar(e) {
    e.preventDefault();

    const erro = validarFormularioFormacao(form);
    if (erro) return toast(erro, 'erro');

    try {
      setSalvando(true);
      const payload = formularioParaPayload(form);

      if (editId) await api.put(`/formacoes/${editId}`, payload);
      else await api.post('/formacoes', payload);

      toast(editId ? 'Formação atualizada!' : 'Formação criada!');
      voltar();
      await carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao salvar.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!confirm('Excluir esta formação? Esta ação não pode ser desfeita.')) return;

    try {
      await api.delete(`/formacoes/${id}`);
      toast('Formação excluída.');
      carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao excluir.', 'erro');
    }
  }

  const filtradas = formacoes.filter(f => {
    const termo = busca.toLowerCase();
    const okBusca = !busca
      || String(f.titulo || '').toLowerCase().includes(termo)
      || String(f.instrutor || f.responsavel_nome || '').toLowerCase().includes(termo)
      || String(f.setor_demandante || '').toLowerCase().includes(termo);
    const okStatus = !statusFiltro || f.status === statusFiltro;
    return okBusca && okStatus;
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
        <div className="d-flex align-center gap-12 mb-24" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={voltar} type="button">
            ← Voltar
          </button>

          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {acao === 'nova' ? 'Agendar Encontro Formativo' : 'Editar Encontro Formativo'}
            </h2>
            <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
              O cadastro e a edição utilizam os mesmos campos do formulário de solicitação.
            </p>
          </div>
        </div>

        <div className="card" style={{ width: '100%', maxWidth: 1100 }}>
          <form onSubmit={salvar} noValidate>
            <FormularioFormacaoCampos
              form={form}
              onChange={setForm}
              mostrarStatus
            />

            <div className="d-flex gap-12 mt-24" style={{ flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primario btn-lg" disabled={salvando}>
                {salvando
                  ? 'Salvando...'
                  : editId
                    ? '💾 Salvar Alterações'
                    : '✅ Agendar Formação'}
              </button>

              <button
                type="button"
                className="btn btn-outline btn-lg"
                onClick={voltar}
                disabled={salvando}
              >
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
              placeholder="Título, responsável ou demandante…"
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
                  <th>Demandante</th>
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
                      {f.setor_demandante || '—'}
                    </td>

                    <td style={{ fontSize: '.88rem' }}>
                      {f.responsavel_nome || f.instrutor || '—'}
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
                          onClick={() => abrirEdicao(f)}
                        >
                          ✏️ Editar
                        </button>

                        {podeExcluir && (
                          <button
                            className="btn btn-perigo btn-sm"
                            onClick={() => excluir(f.id)}
                            title="Excluir formação"
                          >
                            🗑️
                          </button>
                        )}
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