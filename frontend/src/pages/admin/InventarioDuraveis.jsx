import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

const vazio = {
  descricao: '',
  numero_patrimonio: '',
  marca_modelo_serie: '',
  quantidade: '1',
  estado_conservacao: 'bom',
  situacao: 'em_uso',
  localizacao: '',
  responsavel: '',
  data_aquisicao: '',
  valor_aquisicao: '',
  observacoes: ''
};

const nomesSituacao = {
  em_uso: 'Em uso',
  disponivel: 'Disponível',
  manutencao: 'Em manutenção',
  baixado: 'Baixado'
};

const nomesConservacao = {
  bom: 'Bom',
  regular: 'Regular',
  ruim: 'Ruim',
  inservivel: 'Inservível'
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
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function moeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';

  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function classeSituacao(situacao) {
  if (situacao === 'disponivel') return 'badge-confirmada';
  if (situacao === 'em_uso') return 'badge-concluida';
  if (situacao === 'manutencao') return 'badge-andamento';
  return 'badge-cancelada';
}

export default function InventarioDuraveis() {
  const toast = useToast();
  const { user } = useAuth();
  const base = user?.tipo === 'coordenador' ? '/coordenador' : '/admin';

  const [itens, setItens] = useState([]);
  const [resumo, setResumo] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vazio);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [estadoConservacao, setEstadoConservacao] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);

  const itensPorPagina = 10;
  const podeExcluir = ['admin', 'coordenador'].includes(user?.tipo);

  async function carregar(filtros = null) {
    try {
      setLoading(true);

      const buscaAtual = filtros?.busca ?? busca;
      const situacaoAtual = filtros?.situacao ?? situacao;
      const conservacaoAtual =
        filtros?.estado_conservacao ?? estadoConservacao;

      const params = {};

      if (buscaAtual) params.busca = buscaAtual;
      if (situacaoAtual) params.situacao = situacaoAtual;
      if (conservacaoAtual) params.estado_conservacao = conservacaoAtual;

      const [listaResp, resumoResp] = await Promise.all([
        api.get('/inventario-duraveis', { params }),
        api.get('/inventario-duraveis/resumo')
      ]);

      setItens(listaResp.data.data || []);
      setResumo(resumoResp.data.data || {});
    } catch (err) {
      toast(
        err.response?.data?.erro || 'Erro ao carregar os bens duráveis.',
        'erro'
      );
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
      numero_patrimonio: item.numero_patrimonio ?? '',
      marca_modelo_serie: item.marca_modelo_serie ?? '',
      quantidade: item.quantidade ?? '1',
      estado_conservacao: item.estado_conservacao ?? 'bom',
      situacao: item.situacao ?? 'em_uso',
      localizacao: item.localizacao ?? '',
      responsavel: item.responsavel ?? '',
      data_aquisicao: dataInput(item.data_aquisicao),
      valor_aquisicao: item.valor_aquisicao ?? '',
      observacoes: item.observacoes ?? ''
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function salvar(event) {
    event.preventDefault();

    if (!form.descricao.trim()) {
      toast('Informe a descrição do bem.', 'erro');
      return;
    }

    if (numero(form.quantidade) <= 0) {
      toast('A quantidade deve ser maior que zero.', 'erro');
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        ...form,
        quantidade: numero(form.quantidade),
        valor_aquisicao:
          form.valor_aquisicao === '' ? null : numero(form.valor_aquisicao),
        data_aquisicao: form.data_aquisicao || null
      };

      if (editandoId) {
        await api.put(`/inventario-duraveis/${editandoId}`, payload);
        toast('Bem durável atualizado com sucesso.');
      } else {
        await api.post('/inventario-duraveis', payload);
        toast('Bem durável cadastrado com sucesso.');
      }

      limparFormulario();
      await carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao salvar o bem durável.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!confirm('Deseja excluir este bem durável do inventário?')) return;

    try {
      await api.delete(`/inventario-duraveis/${id}`);
      toast('Bem durável excluído com sucesso.');
      await carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao excluir o bem durável.', 'erro');
    }
  }

  async function filtrar(event) {
    event.preventDefault();
    setPaginaAtual(1);
    await carregar();
  }

  if (loading) {
    return (
      <PainelLayout titulo="Bens Duráveis">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Bens Duráveis">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Bens Duráveis
          </h2>

          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
            Controle patrimonial, localização, conservação e situação dos bens.
          </p>
        </div>

        <Link to={`${base}/inventario`} className="btn btn-outline">
          ← Voltar ao Inventário
        </Link>
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
            Registros cadastrados
          </div>

          <strong style={{ fontSize: '2rem', color: 'var(--laranja)' }}>
            {resumo.total_itens || 0}
          </strong>
        </div>

        <div className="card">
          <div style={{ color: 'var(--cinza-600)', fontSize: '.85rem' }}>
            Total de bens
          </div>

          <strong style={{ fontSize: '2rem', color: 'var(--verde-escuro)' }}>
            {resumo.total_bens || 0}
          </strong>
        </div>

        <div className="card">
          <div style={{ color: 'var(--cinza-600)', fontSize: '.85rem' }}>
            Em uso
          </div>

          <strong style={{ fontSize: '2rem', color: 'var(--verde-escuro)' }}>
            {resumo.itens_em_uso || 0}
          </strong>
        </div>

        <div className="card">
          <div style={{ color: 'var(--cinza-600)', fontSize: '.85rem' }}>
            Em manutenção
          </div>

          <strong style={{ fontSize: '2rem', color: 'var(--aviso-texto)' }}>
            {resumo.itens_manutencao || 0}
          </strong>
        </div>
      </div>

      <form onSubmit={salvar} className="card mb-24">
        <div className="card-titulo">
          <span className="icone">🗄️</span>
          {editandoId ? 'Editar bem durável' : 'Cadastrar bem durável'}
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
              onChange={event => atualizarCampo('descricao', event.target.value)}
              placeholder="Ex.: Notebook, mesa, projetor..."
            />
          </div>

          <div className="campo">
            <label>Número de patrimônio</label>
            <input
              value={form.numero_patrimonio}
              onChange={event =>
                atualizarCampo('numero_patrimonio', event.target.value)
              }
              placeholder="Ex.: PAT-0001"
            />
          </div>

          <div className="campo">
            <label>Quantidade</label>
            <input
              type="number"
              min="1"
              value={form.quantidade}
              onChange={event => atualizarCampo('quantidade', event.target.value)}
            />
          </div>

          <div className="campo">
            <label>Marca, modelo e nº de série</label>
            <input
              value={form.marca_modelo_serie}
              onChange={event =>
                atualizarCampo('marca_modelo_serie', event.target.value)
              }
            />
          </div>

          <div className="campo">
            <label>Estado de conservação</label>
            <select
              value={form.estado_conservacao}
              onChange={event =>
                atualizarCampo('estado_conservacao', event.target.value)
              }
            >
              <option value="bom">Bom</option>
              <option value="regular">Regular</option>
              <option value="ruim">Ruim</option>
              <option value="inservivel">Inservível</option>
            </select>
          </div>

          <div className="campo">
            <label>Situação</label>
            <select
              value={form.situacao}
              onChange={event => atualizarCampo('situacao', event.target.value)}
            >
              <option value="em_uso">Em uso</option>
              <option value="disponivel">Disponível</option>
              <option value="manutencao">Em manutenção</option>
              <option value="baixado">Baixado</option>
            </select>
          </div>

          <div className="campo">
            <label>Localização</label>
            <input
              value={form.localizacao}
              onChange={event => atualizarCampo('localizacao', event.target.value)}
              placeholder="Ex.: Sala de reuniões"
            />
          </div>

          <div className="campo">
            <label>Responsável</label>
            <input
              value={form.responsavel}
              onChange={event => atualizarCampo('responsavel', event.target.value)}
            />
          </div>

          <div className="campo">
            <label>Data de aquisição</label>
            <input
              type="date"
              value={form.data_aquisicao}
              onChange={event =>
                atualizarCampo('data_aquisicao', event.target.value)
              }
            />
          </div>

          <div className="campo">
            <label>Valor de aquisição</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.valor_aquisicao}
              onChange={event =>
                atualizarCampo('valor_aquisicao', event.target.value)
              }
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="campo">
          <label>Observações</label>
          <textarea
            value={form.observacoes}
            onChange={event => atualizarCampo('observacoes', event.target.value)}
          />
        </div>

        <div className="d-flex gap-8 flex-wrap">
          <button className="btn btn-primario" disabled={salvando}>
            {salvando
              ? 'Salvando...'
              : editandoId
                ? 'Salvar alterações'
                : 'Cadastrar bem'}
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
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}
        >
          <div className="campo" style={{ marginBottom: 0, flex: 1, minWidth: 240 }}>
            <label>Buscar</label>
            <input
              value={busca}
              onChange={event => setBusca(event.target.value)}
              placeholder="Descrição, patrimônio, responsável ou localização..."
            />
          </div>

          <div className="campo" style={{ marginBottom: 0, minWidth: 190 }}>
            <label>Situação</label>
            <select
              value={situacao}
              onChange={event => setSituacao(event.target.value)}
            >
              <option value="">Todas</option>
              <option value="em_uso">Em uso</option>
              <option value="disponivel">Disponível</option>
              <option value="manutencao">Em manutenção</option>
              <option value="baixado">Baixado</option>
            </select>
          </div>

          <div className="campo" style={{ marginBottom: 0, minWidth: 190 }}>
            <label>Conservação</label>
            <select
              value={estadoConservacao}
              onChange={event => setEstadoConservacao(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="bom">Bom</option>
              <option value="regular">Regular</option>
              <option value="ruim">Ruim</option>
              <option value="inservivel">Inservível</option>
            </select>
          </div>

          <button className="btn btn-primario">Filtrar</button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              setBusca('');
              setSituacao('');
              setEstadoConservacao('');
              setPaginaAtual(1);
              await carregar({
                busca: '',
                situacao: '',
                estado_conservacao: ''
              });
            }}
          >
            Limpar
          </button>
        </div>
      </form>

      {itens.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">🗄️</div>
          <p>Nenhum bem durável encontrado.</p>
        </div>
      ) : (
        <div className="card p-0">
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Patrimônio</th>
                  <th>Qtd.</th>
                  <th>Localização</th>
                  <th>Responsável</th>
                  <th>Aquisição</th>
                  <th>Valor</th>
                  <th>Conservação</th>
                  <th>Situação</th>
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

                    <td>{item.numero_patrimonio || '—'}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.localizacao || '—'}</td>
                    <td>{item.responsavel || '—'}</td>
                    <td>{dataBR(item.data_aquisicao)}</td>
                    <td>{moeda(item.valor_aquisicao)}</td>
                    <td>{nomesConservacao[item.estado_conservacao] || '—'}</td>

                    <td>
                      <span className={`badge ${classeSituacao(item.situacao)}`}>
                        {nomesSituacao[item.situacao] || item.situacao}
                      </span>
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
                    className={`paginacao-botao ${
                      paginaAtual === numeroPagina ? 'ativo' : ''
                    }`}
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
