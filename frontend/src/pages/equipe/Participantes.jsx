import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner, fmtData } from '../../components/ui';
import api from '../../api';

export default function EquipeParticipantes() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setLoading(true);

    try {
      const { data } = await api.get('/usuarios?tipo=participante');
      setUsuarios(data.data || []);
    } catch {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const filtrados = usuarios.filter(u =>
    !busca ||
    u.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase())
  );

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
      </div>

      <div className="card mb-24">
        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Buscar participante</label>

          <input
            type="text"
            placeholder="Nome ou e-mail…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
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
                  <th>Cadastro</th>
                  <th>Status</th>
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