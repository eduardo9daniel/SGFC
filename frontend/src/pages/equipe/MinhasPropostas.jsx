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

        <p
          style={{
            color: 'var(--cinza-600)',
            fontSize: '.9rem'
          }}
        >
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
                <th>OBS do coordenador</th>
                <th>Justificativa</th>
              </tr>
            </thead>

            <tbody>
              {propostas.map((proposta) => (
                <tr key={proposta.id}>
                  <td>{proposta.titulo}</td>

                  <td>
                    {proposta.data_encontro?.slice(0, 10)}
                  </td>

                  <td>
                    {proposta.carga_horaria}h
                  </td>

                  <td>
                    {proposta.status}
                  </td>

                  <td>
                    <div
                      style={{
                        minWidth: '220px',
                        maxWidth: '360px',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere'
                      }}
                    >
                      {proposta.observacoes_coordenador || '—'}
                    </div>
                  </td>

                  <td>
                    {proposta.justificativa_recusa || '—'}
                  </td>
                </tr>
              ))}

              {propostas.length === 0 && (
                <tr>
                  <td colSpan="6">
                    Nenhuma proposta enviada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PainelLayout>
  );
}