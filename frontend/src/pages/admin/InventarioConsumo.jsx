import { useEffect, useMemo, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

const vazio = {
  descricao: '',
  marca_modelo_serie: '',
  quantidade_estoque: '',
  estoque_minimo: '',
  data_validade: '',
  localizacao: '',
  data_ultima_entrada: '',
  observacoes: ''
};

function dataInput(valor) {
  if (!valor) return '';
  return String(valor).slice(0, 10);
}

function dataBR(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function numero(valor) {
  return Number(valor || 0);
}

export default function InventarioConsumo() {
  const toast = useToast();
  const { user } = useAuth();

  const [itens, setItens] = useState([]);
  const [resumo, setResumo] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vazio);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);

  const itensPorPagina = 10;
  const podeExcluir = ['admin', 'coordenador'].includes(user?.tipo);

  async function carregar(filtros = null) {
    try {
      setLoading(true);

      const buscaAtual = filtros?.busca ?? busca;
      const statusAtual = filtros?.status ?? status;

      const params = {};

      if (buscaAtual) params.busca = buscaAtual;
      if (statusAtual) params.status = statusAtual;

      const [listaResp, resumoResp] = await Promise.all([
        api.get('/inventario-consumo', { params }),
        api.get('/inventario-consumo/resumo')
      ]);

      setItens(listaResp.data.data || []);
      setResumo(resumoResp.data.data || {});
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao carregar o inventário.', 'erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return itens.slice(inicio, inicio + itensPorPagina);
  }, [itens, paginaAtual]);

  const totalPaginas = Math.ceil(itens.length / itensPorPagina);

  function atualizarCampo(campo, valor) {
    setForm(atual => ({
      ...atual,
      [campo]: valor
    }));
  }

  function limparFormulario() {
    setForm(vazio);
    setEditandoId(null);
  }

  function editar(item) {
    setEditandoId(item.id);

    setForm({
      descricao: item.descricao ?? '',
      marca_modelo_serie: item.marca_modelo_serie ?? '',
      quantidade_estoque: item.quantidade_estoque ?? '',
      estoque_minimo: item.estoque_minimo ?? '',
      data_validade: dataInput(item.data_validade),
      localizacao: item.localizacao ?? '',
      data_ultima_entrada: dataInput(item.data_ultima_entrada),
      observacoes: item.observacoes ?? ''
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function salvar(e) {
    e.preventDefault();

    if (!form.descricao.trim()) {
      toast('Informe a descrição do item.', 'erro');
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        ...form,
        quantidade_estoque: numero(form.quantidade_estoque),
        estoque_minimo: numero(form.estoque_minimo),
        data_validade: form.data_validade || null,
        data_ultima_entrada: form.data_ultima_entrada || null
      };

      if (editandoId) {
        await api.put(`/inventario-consumo/${editandoId}`, payload);
        toast('Item atualizado com sucesso.');
      } else {
        await api.post('/inventario-consumo', payload);
        toast('Item cadastrado com sucesso.');
      }

      limparFormulario();
      await carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao salvar item.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!confirm('Deseja excluir este item do inventário?')) return;

    try {
      await api.delete(`/inventario-consumo/${id}`);
      toast('Item excluído com sucesso.');
      await carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao excluir item.', 'erro');
    }
  }

  async function filtrar(e) {
    e.preventDefault();
    setPaginaAtual(1);
    await carregar();
  }

  if (loading) {
    return (
      <PainelLayout titulo="Inventário de Bens de Consumo">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Inventário de Bens de Consumo">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Inventário de Bens de Consumo
          </h2>

          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
            Controle de insumos, estoque mínimo, validade e localização dos materiais.
          </p>
        </div>
      </div>

      <div
        className="mb-24"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 16
        }}
      >
        <div className="card">
          <div style={{ color: 'var(--cinza-600)', fontSize: '.85rem' }}>
            Itens cadastrados
          </div>

          <strong style={{ fontSize: '2rem', color: 'var(--laranja)' }}>
            {resumo.total_itens || 0}
          </strong>
        </div>

        <div className="card">
          <div style={{ color: 'var(--cinza-600)', fontSize: '.85rem' }}>
            Total em estoque
          </div>

          <strong style={{ fontSize: '2rem', color: 'var(--verde-escuro)' }}>
            {resumo.total_em_estoque || 0}
          </strong>
        </div>

        <div className="card">
          <div style={{ color: 'var(--cinza-600)', fontSize: '.85rem' }}>
            Estoque baixo
          </div>

          <strong style={{ fontSize: '2rem', color: 'var(--cor-perigo)' }}>
            {resumo.itens_estoque_baixo || 0}
          </strong>
        </div>

        <div className="card">
          <div style={{ color: 'var(--cinza-600)', fontSize: '.85rem' }}>
            Vencidos / vencendo
          </div>

          <strong style={{ fontSize: '2rem', color: 'var(--aviso-texto)' }}>
            {(resumo.itens_vencidos || 0) + (resumo.itens_vencendo || 0)}
          </strong>
        </div>
      </div>

      <form onSubmit={salvar} className="card mb-24">
        <div className="card-titulo">
          <span className="icone">📦</span>
          {editandoId ? 'Editar item' : 'Cadastrar novo item'}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16
          }}
        >
          <div className="campo">
            <label>Descrição *</label>
            <input
              value={form.descricao}
              onChange={e => atualizarCampo('descricao', e.target.value)}
              placeholder="Ex.: Papel A4, caneta, café..."
            />
          </div>

          <div className="campo">
            <label>Quantidade em estoque</label>
            <input
              type="number"
              min="0"
              value={form.quantidade_estoque}
              onChange={e => atualizarCampo('quantidade_estoque', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Estoque mínimo</label>
            <input
              type="number"
              min="0"
              value={form.estoque_minimo}
              onChange={e => atualizarCampo('estoque_minimo', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Marca, modelo e nº de série</label>
            <input
              value={form.marca_modelo_serie}
              onChange={e => atualizarCampo('marca_modelo_serie', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Localização</label>
            <input
              value={form.localizacao}
              onChange={e => atualizarCampo('localizacao', e.target.value)}
              placeholder="Ex.: Ateliê do Sabor"
            />
          </div>

          <div className="campo">
            <label>Data de validade</label>
            <input
              type="date"
              value={form.data_validade}
              onChange={e => atualizarCampo('data_validade', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Data da última entrada</label>
            <input
              type="date"
              value={form.data_ultima_entrada}
              onChange={e => atualizarCampo('data_ultima_entrada', e.target.value)}
            />
          </div>
        </div>

        <div className="campo">
          <label>Observações</label>
          <textarea
            value={form.observacoes}
            onChange={e => atualizarCampo('observacoes', e.target.value)}
          />
        </div>

        <div className="d-flex gap-8 flex-wrap">
          <button className="btn btn-primario" disabled={salvando}>
            {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar item'}
          </button>

          {editandoId && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={limparFormulario}
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <form onSubmit={filtrar} className="card mb-24">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="campo" style={{ marginBottom: 0, flex: 1, minWidth: 240 }}>
            <label>Buscar</label>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Descrição, localização ou observações..."
            />
          </div>

          <div className="campo" style={{ marginBottom: 0, minWidth: 210 }}>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="baixo">Estoque baixo</option>
              <option value="vencido">Vencidos</option>
              <option value="vencendo">Vencendo em até 30 dias</option>
            </select>
          </div>

          <button className="btn btn-primario">
            Filtrar
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              setBusca('');
              setStatus('');
              setPaginaAtual(1);
              await carregar({ busca: '', status: '' });
            }}
          >
            Limpar
          </button>
        </div>
      </form>

      {itens.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">📦</div>
          <p>Nenhum item encontrado no inventário.</p>
        </div>
      ) : (
        <div className="card p-0">
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Validade</th>
                  <th>Localização</th>
                  <th>Última entrada</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {itensPaginados.map(item => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.descricao}</strong>

                      {item.marca_modelo_serie && (
                        <div style={{ color: 'var(--cinza-600)', fontSize: '.82rem' }}>
                          {item.marca_modelo_serie}
                        </div>
                      )}
                    </td>

                    <td>{item.quantidade_estoque}</td>
                    <td>{item.estoque_minimo}</td>
                    <td>{dataBR(item.data_validade)}</td>
                    <td>{item.localizacao || '—'}</td>
                    <td>{dataBR(item.data_ultima_entrada)}</td>

                    <td>
                      <div className="d-flex gap-8 flex-wrap">
                        {item.estoque_baixo ? (
                          <span className="badge badge-cancelada">Estoque baixo</span>
                        ) : null}

                        {item.vencido ? (
                          <span className="badge badge-cancelada">Vencido</span>
                        ) : null}

                        {item.vencendo ? (
                          <span className="badge badge-andamento">Vencendo</span>
                        ) : null}

                        {!item.estoque_baixo && !item.vencido && !item.vencendo ? (
                          <span className="badge badge-confirmada">OK</span>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <div className="d-flex gap-8">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => editar(item)}
                        >
                          ✏️ Editar
                        </button>

                        {podeExcluir && (
                          <button
                            type="button"
                            className="btn btn-perigo btn-sm"
                            onClick={() => excluir(item.id)}
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

          {totalPaginas > 1 && (
            <div className="paginacao">
              {Array.from({ length: totalPaginas }, (_, index) => {
                const numeroPagina = index + 1;

                return (
                  <button
                    key={numeroPagina}
                    type="button"
                    className={`paginacao-botao ${paginaAtual === numeroPagina ? 'ativo' : ''}`}
                    onClick={() => setPaginaAtual(numeroPagina)}
                  >
                    {numeroPagina}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PainelLayout>
  );
}