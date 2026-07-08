import { useEffect, useMemo, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';

const empty = {
  nome: '',
  natureza_pesquisa: '',
  titulo_trabalho: '',
  link_lattes: '',
  filiacao: '',
  tipo_trabalho: '',
  palavras_chave: ''
};

const naturezas = [
  '',
  'Mestrado',
  'Doutorado',
  'Pós-doutorado'
];

export default function PesquisadoresNest() {
  const [pesquisadores, setPesquisadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [natureza, setNatureza] = useState('');
  const [form, setForm] = useState(empty);
  const [editandoId, setEditandoId] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);

  const itensPorPagina = 10;

  async function carregar(params = {}) {
    try {
      setLoading(true);

      const { data } = await api.get('/admin/pesquisadores-nest', {
        params
      });

      setPesquisadores(data.data || []);
      setPaginaAtual(1);
    } catch (error) {
      console.error('Erro ao carregar pesquisas:', error);
      setPesquisadores([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function pesquisar(e) {
    e.preventDefault();

    carregar({
      busca: busca.trim(),
      natureza
    });
  }

  function limparFiltros() {
    setBusca('');
    setNatureza('');
    carregar();
  }

  function preencherEdicao(item) {
    setEditandoId(item.id);

    setForm({
      nome: item.nome || '',
      natureza_pesquisa: item.natureza_pesquisa || '',
      titulo_trabalho: item.titulo_trabalho || '',
      link_lattes: item.link_lattes || '',
      filiacao: item.filiacao || '',
      tipo_trabalho: item.tipo_trabalho || '',
      palavras_chave: item.palavras_chave || ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(empty);
  }

  async function salvar(e) {
    e.preventDefault();

    try {
      if (editandoId) {
        await api.put(`/admin/pesquisadores-nest/${editandoId}`, form);
      } else {
        await api.post('/admin/pesquisadores-nest', form);
      }

      setForm(empty);
      setEditandoId(null);

      carregar({
        busca: busca.trim(),
        natureza
      });
    } catch (error) {
      console.error('Erro ao salvar pesquisa:', error);
      alert(error.response?.data?.erro || 'Erro ao salvar pesquisa.');
    }
  }

  async function excluir(id) {
    const confirmar = window.confirm(
      'Tem certeza que deseja excluir esta pesquisa?'
    );

    if (!confirmar) return;

    try {
      await api.delete(`/admin/pesquisadores-nest/${id}`);

      carregar({
        busca: busca.trim(),
        natureza
      });
    } catch (error) {
      console.error('Erro ao excluir pesquisa:', error);
      alert('Erro ao excluir pesquisa.');
    }
  }

  const resumo = useMemo(() => {
    const total = pesquisadores.length;

    const porNatureza = pesquisadores.reduce((acc, item) => {
      const chave = item.natureza_pesquisa || 'Não informado';
      acc[chave] = (acc[chave] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      porNatureza
    };
  }, [pesquisadores]);

  const totalPaginas = Math.ceil(pesquisadores.length / itensPorPagina);

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;

  const pesquisadoresPaginados = pesquisadores.slice(inicio, fim);

  if (loading) {
    return (
      <PainelLayout titulo="Pesquisas">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Pesquisas">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            Pesquisas
          </h2>

          <p style={{ color: 'var(--cinza-600)', fontSize: '.9rem' }}>
            Gerencie as pesquisas cadastradas no sistema.
          </p>
        </div>

        <a
          href="/pesquisadores-nest"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          Ver página pública
        </a>
      </div>

      <div className="stats-grid dashboard-stats mb-24">
        <div className="stat-card dashboard-card-sombra">
          <div className="stat-icone verde">🔎</div>

          <div>
            <div className="stat-valor">{resumo.total}</div>
            <div className="stat-label">Pesquisas</div>
            <div className="stat-detalhe">Total listado no sistema</div>
          </div>
        </div>

        {Object.entries(resumo.porNatureza).map(([nome, total]) => (
          <div className="stat-card dashboard-card-sombra" key={nome}>
            <div className="stat-icone laranja">🎓</div>

            <div>
              <div className="stat-valor">{total}</div>
              <div className="stat-label">{nome}</div>
              <div className="stat-detalhe">Registros dessa natureza</div>
            </div>
          </div>
        ))}
      </div>

      <div className="pesquisas-card">
        <div className="pesquisas-card-titulo">
          <span>✍️</span>
          {editandoId ? 'Editar pesquisa' : 'Cadastrar pesquisa'}
        </div>

        <form onSubmit={salvar}>
          <div className="pesquisas-form-grid">
            <div className="pesquisas-campo">
              <label>Nome</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>

            <div className="pesquisas-campo">
              <label>Natureza da Pesquisa</label>
              <select
                value={form.natureza_pesquisa}
                onChange={(e) =>
                  setForm({ ...form, natureza_pesquisa: e.target.value })
                }
              >
                {naturezas.map((item) => (
                  <option key={item} value={item}>
                    {item || 'Selecione'}
                  </option>
                ))}
              </select>
            </div>

            <div className="pesquisas-campo">
              <label>Tipo</label>
              <input
                value={form.tipo_trabalho}
                onChange={(e) =>
                  setForm({ ...form, tipo_trabalho: e.target.value })
                }
                placeholder="Tese, Dissertação, Pós-doutorado..."
              />
            </div>

            <div className="pesquisas-campo">
              <label>Filiação</label>
              <input
                value={form.filiacao}
                onChange={(e) =>
                  setForm({ ...form, filiacao: e.target.value })
                }
              />
            </div>

            <div className="pesquisas-campo campo-full">
              <label>Título da Tese/Dissertação</label>
              <textarea
                rows="3"
                value={form.titulo_trabalho}
                onChange={(e) =>
                  setForm({ ...form, titulo_trabalho: e.target.value })
                }
              />
            </div>

            <div className="pesquisas-campo">
              <label>Link Lattes</label>
              <input
                value={form.link_lattes}
                onChange={(e) =>
                  setForm({ ...form, link_lattes: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div className="pesquisas-campo">
              <label>Palavras-chave</label>
              <textarea
                rows="3"
                value={form.palavras_chave}
                onChange={(e) =>
                  setForm({ ...form, palavras_chave: e.target.value })
                }
              />
            </div>
          </div>

          <div className="pesquisas-acoes-form">
            <button type="submit" className="btn btn-primario">
              {editandoId ? 'Salvar alterações' : 'Cadastrar'}
            </button>

            {editandoId && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={cancelarEdicao}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="pesquisas-card">
        <div className="pesquisas-card-titulo">
          <span>🔍</span>
          Pesquisar pesquisas
        </div>

        <form onSubmit={pesquisar} className="pesquisas-busca-form">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, título, filiação ou palavra-chave"
          />

          <select
            value={natureza}
            onChange={(e) => setNatureza(e.target.value)}
          >
            {naturezas.map((item) => (
              <option key={item} value={item}>
                {item || 'Todas as naturezas'}
              </option>
            ))}
          </select>

          <button type="submit" className="btn btn-primario">
            Pesquisar
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={limparFiltros}
          >
            Limpar
          </button>
        </form>

        {pesquisadores.length === 0 ? (
          <div className="vazio">
            <div className="vazio-icone">🔎</div>
            <p>Nenhuma pesquisa encontrada.</p>
          </div>
        ) : (
          <>
            <div className="tabela-wrapper mt-24">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Natureza</th>
                    <th>Título</th>
                    <th>Filiação</th>
                    <th>Lattes</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {pesquisadoresPaginados.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700 }}>{item.nome}</td>
                      <td>{item.natureza_pesquisa || '-'}</td>
                      <td style={{ maxWidth: 360 }}>
                        {item.titulo_trabalho || '-'}
                      </td>
                      <td>{item.filiacao || '-'}</td>

                      <td>
                        {item.link_lattes ? (
                          <a
                            href={item.link_lattes}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-card"
                          >
                            Abrir
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td>
                        <div className="d-flex gap-8 flex-wrap">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => preencherEdicao(item)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => excluir(item.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="paginacao">
                {Array.from(
                  { length: totalPaginas },
                  (_, index) => index + 1
                ).map((numero) => (
                  <button
                    key={numero}
                    type="button"
                    className={`paginacao-botao ${
                      paginaAtual === numero ? 'ativo' : ''
                    }`}
                    onClick={() => setPaginaAtual(numero)}
                  >
                    {numero}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PainelLayout>
  );
}