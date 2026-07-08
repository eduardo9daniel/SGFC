import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';

export default function MinhasPropostas() {
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);

    try {
      const { data } = await api.get('/propostas-formacao/minhas');
      setPropostas(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  if (loading) {
    return (
      <PainelLayout titulo="Minhas Propostas">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Minhas Propostas">
      <div className="mb-24">
        <h2>Minhas propostas de formação</h2>
        <p style={{ color: 'var(--cinza-600)', fontSize: '.9rem' }}>
          Acompanhe o status das propostas enviadas ao coordenador.
        </p>
      </div>

      <div className="card p-0">
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Data</th>
                <th>Carga</th>
                <th>Status</th>
                <th>Justificativa</th>
              </tr>
            </thead>

            <tbody>
              {propostas.map(p => (
                <tr key={p.id}>
                  <td>{p.titulo}</td>
                  <td>{p.data_encontro?.slice(0, 10)}</td>
                  <td>{p.carga_horaria}h</td>
                  <td>{p.status}</td>
                  <td>{p.justificativa_recusa || '—'}</td>
                </tr>
              ))}

              {propostas.length === 0 && (
                <tr>
                  <td colSpan="5">Nenhuma proposta enviada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PainelLayout>
  );
}