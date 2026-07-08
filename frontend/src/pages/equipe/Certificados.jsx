import { useEffect, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner, fmtData, fmtPct } from '../../components/ui';
import api from '../../api';

export default function EquipeCertificados() {
  const [formacoes, setFormacoes] = useState([]);
  const [formacaoSel, setFormacaoSel] = useState('');
  const [inscritos, setInscritos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/formacoes?status=concluida')
      .then(r => setFormacoes(r.data.data || []))
      .catch(() => setFormacoes([]));
  }, []);

  async function carregar(id) {
    setFormacaoSel(id);

    if (!id) {
      setInscritos([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get(`/certificados?formacao_id=${id}`);
      setInscritos(data.data || []);
    } catch {
      setInscritos([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PainelLayout titulo="Certificados">
      <div className="card mb-24">
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="campo" style={{ marginBottom: 0, flex: 1, minWidth: 240 }}>
            <label>Formação Concluída</label>

            <select value={formacaoSel} onChange={e => carregar(e.target.value)}>
              <option value="">— Selecione —</option>

              {formacoes.map(f => (
                <option key={f.id} value={f.id}>
                  {f.titulo} ({fmtData(f.data_fim)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : !formacaoSel ? (
        <div className="vazio">
          <div className="vazio-icone">🎓</div>
          <p>Selecione uma formação concluída.</p>
        </div>
      ) : inscritos.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">🎓</div>
          <p>Nenhum participante encontrado.</p>
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
            <span className="icone">🎓</span>
            Certificados

            <span style={{ marginLeft: 'auto', fontSize: '.82rem', color: 'var(--cinza-500)' }}>
              {inscritos.length} participante(s)
            </span>
          </div>

          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>CPF</th>
                  <th>Frequência</th>
                  <th>Apto?</th>
                  <th>Certificado</th>
                  <th>Consultas</th>
                </tr>
              </thead>

              <tbody>
                {inscritos.map(p => {
                  const pct = fmtPct(p.total_presentes, p.total_aulas);
                  const apto = pct >= 75;
                  const temCert = !!p.codigo_validacao;
                  const ativo = p.cert_status === 'ativo';

                  return (
                    <tr key={p.inscricao_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {p.nome_completo}
                        </div>

                        <div style={{ fontSize: '.78rem', color: 'var(--cinza-500)' }}>
                          {p.email}
                        </div>
                      </td>

                      <td style={{ fontSize: '.85rem' }}>
                        {p.cpf}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div
                              className={`progress-fill ${pct >= 75 ? 'alto' : pct >= 50 ? 'medio' : 'baixo'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <span
                            style={{
                              fontSize: '.85rem',
                              fontWeight: 700,
                              color: apto ? 'var(--verde)' : 'var(--cor-perigo)'
                            }}
                          >
                            {pct}%
                          </span>
                        </div>

                        <div style={{ fontSize: '.75rem', color: 'var(--cinza-500)' }}>
                          {p.total_presentes}/{p.total_aulas} aulas
                        </div>
                      </td>

                      <td>
                        {apto ? (
                          <span style={{ color: 'var(--verde)', fontWeight: 700 }}>
                            ✅ Sim
                          </span>
                        ) : (
                          <span style={{ color: 'var(--cor-perigo)', fontWeight: 700 }}>
                            ❌ Não
                          </span>
                        )}
                      </td>

                      <td>
                        {temCert ? (
                          <div style={{ fontSize: '.8rem' }}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: ativo ? 'var(--verde)' : 'var(--cor-perigo)'
                              }}
                            >
                              {ativo
                                ? '✅ Ativo'
                                : p.cert_status === 'cancelado'
                                  ? '🚫 Cancelado'
                                  : '🔄 Substituído'}
                            </div>

                            <div
                              style={{
                                color: 'var(--cinza-500)',
                                fontFamily: 'monospace',
                                fontSize: '.7rem'
                              }}
                            >
                              {p.hash_unico
                                ? `${p.hash_unico.slice(0, 18)}…`
                                : p.codigo_validacao}
                            </div>

                            <div style={{ color: 'var(--cinza-500)' }}>
                              {fmtData(p.data_emissao)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--cinza-400)', fontSize: '.85rem' }}>
                            — Não emitido —
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {temCert ? (
                          <span style={{ fontSize: '.85rem', fontWeight: 600 }}>
                            👁 {p.total_consultas || 0}
                          </span>
                        ) : (
                          '—'
                        )}
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