import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData, fmtPct } from '../../components/ui';
import api from '../../api';

export default function EquipeInscricoes() {
  const [formacoes, setFormacoes] = useState([]);
  const [formacaoSel, setFormacaoSel] = useState('');
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/formacoes').then(r => setFormacoes(r.data.data || []));
  }, []);

  async function carregar(id) {
    setFormacaoSel(id);

    if (!id) {
      setInscricoes([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get(`/inscricoes?formacao_id=${id}`);
      setInscricoes(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PainelLayout titulo="Inscrições">
      <div className="card mb-24">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="campo" style={{ marginBottom: 0, flex: 1, minWidth: 240 }}>
            <label>Selecionar Formação</label>

            <select value={formacaoSel} onChange={e => carregar(e.target.value)}>
              <option value="">— Selecione uma formação —</option>

              {formacoes.map(f => (
                <option key={f.id} value={f.id}>
                  {f.titulo} ({f.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : formacaoSel && inscricoes.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">📋</div>
          <p>Nenhuma inscrição nesta formação.</p>
        </div>
      ) : !formacaoSel ? (
        <div className="vazio">
          <div className="vazio-icone">📋</div>
          <p>Selecione uma formação para visualizar as inscrições.</p>
        </div>
      ) : (
        <div className="card p-0">
          <div
            className="card-titulo p-24"
            style={{
              marginBottom: 0,
              borderRadius: 'var(--raio-lg) var(--raio-lg) 0 0'
            }}
          >
            <span className="icone">📋</span>
            Inscrições

            <span style={{ marginLeft: 'auto', fontSize: '.82rem', color: 'var(--cinza-500)' }}>
              {inscricoes.length} inscrito(s)
            </span>
          </div>

          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>CPF</th>
                  <th>Telefone</th>
                  <th>Inscrição</th>
                  <th>Frequência</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {inscricoes.map((i, idx) => {
                  const pct = fmtPct(i.presentes, i.total_aulas);

                  return (
                    <tr key={i.id}>
                      <td style={{ color: 'var(--cinza-400)', fontSize: '.8rem' }}>
                        {idx + 1}
                      </td>

                      <td style={{ fontWeight: 600 }}>
                        {i.nome_completo}
                      </td>

                      <td style={{ fontSize: '.85rem' }}>
                        {i.email}
                      </td>

                      <td style={{ fontSize: '.83rem' }}>
                        {i.cpf}
                      </td>

                      <td style={{ fontSize: '.83rem' }}>
                        {i.telefone || '—'}
                      </td>

                      <td style={{ fontSize: '.82rem' }}>
                        {fmtData(i.data_inscricao)}
                      </td>

                      <td>
                        {i.total_aulas > 0 ? (
                          <span
                            style={{
                              fontWeight: 700,
                              color: pct >= 75 ? 'var(--verde)' : 'var(--cor-perigo)'
                            }}
                          >
                            {pct}%{' '}
                            <span style={{ color: 'var(--cinza-400)', fontSize: '.75rem' }}>
                              ({i.presentes}/{i.total_aulas})
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--cinza-400)', fontSize: '.82rem' }}>
                            —
                          </span>
                        )}
                      </td>

                      <td>
                        <Badge status={i.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PainelLayout>
  );
}