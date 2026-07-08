import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';

export default function PropostasFormacao() {
  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);

    try {
      const { data } = await api.get('/propostas-formacao/coordenador');
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
      <PainelLayout titulo="Propostas de Formação">
        <Spinner />
      </PainelLayout>
    );
  }

  return (
    <PainelLayout titulo="Propostas de Formação">
      <div className="d-flex justify-between mb-24">
        <div>
          <h2>Propostas recebidas</h2>
          <p style={{ color: 'var(--cinza-600)', fontSize: '.9rem' }}>
            {propostas.length} proposta(s) encontrada(s)
          </p>
        </div>
      </div>

      <div className="card p-0">
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Equipe</th>
                <th>Data</th>
                <th>Carga</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {propostas.map(p => (
                <tr key={p.id}>
                  <td>{p.titulo}</td>
                  <td>{p.equipe_nome}</td>
                  <td>{p.data_encontro?.slice(0, 10)}</td>
                  <td>{p.carga_horaria}h</td>
                  <td>{p.status}</td>
                  <td>
                    <Link
                      className="btn btn-outline btn-sm"
                      to={`/coordenador/propostas-formacao/${p.id}`}
                    >
                      Visualizar
                    </Link>
                  </td>
                </tr>
              ))}

              {propostas.length === 0 && (
                <tr>
                  <td colSpan="6">Nenhuma proposta encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PainelLayout>
  );
}