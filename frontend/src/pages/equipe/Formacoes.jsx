import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData } from '../../components/ui';
import api from '../../api';

const statusList = ['aberta', 'andamento', 'concluida', 'cancelada'];

export default function EquipeFormacoes() {
  const [formacoes, setFormacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  async function carregar() {
    setLoading(true);

    try {
      const { data } = await api.get('/formacoes');
      setFormacoes(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = formacoes.filter(f => {
    const okBusca =
      !busca ||
      f.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      (f.instrutor || '').toLowerCase().includes(busca.toLowerCase());

    const okStatus = !statusFiltro || f.status === statusFiltro;

    return okBusca && okStatus;
  });

  if (loading) {
    return (
      <PainelLayout titulo="Formações">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Formações">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Formações disponíveis
          </h2>
          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
            {formacoes.length} formação(ões)
          </p>
        </div>
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