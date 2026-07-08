import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { FormacaoCard, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

export default function PartFormacoes() {
  const toast = useToast();
  const [formacoes, setFormacoes] = useState([]);
  const [minhas, setMinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inscrevendo, setInscrevendo] = useState(null);

  async function carregar() {
    const [fa, mi] = await Promise.all([
      api.get('/formacoes?disponiveis=1'),
      api.get('/inscricoes/minhas'),
    ]);
    setFormacoes(fa.data.data);
    setMinhas(mi.data.data.map(i => i.formacao_id));
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function inscrever(formacaoId) {
    setInscrevendo(formacaoId);
    try {
      await api.post('/inscricoes', { formacao_id: formacaoId });
      toast('Inscrição realizada com sucesso!');
      carregar();
    } catch(err) {
      toast(err.response?.data?.erro || 'Erro ao se inscrever.', 'erro');
    } finally { setInscrevendo(null); }
  }

  return (
    <PainelLayout titulo="Formações">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Formações Abertas</h2>
          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>{formacoes.length} formação(ões) disponível(is)</p>
        </div>
      </div>
      {loading ? <Spinner /> : formacoes.length === 0 ? (
        <div className="vazio"><div className="vazio-icone">📚</div><p>Nenhuma formação aberta no momento.</p></div>
      ) : (
        <div className="formacoes-grid">
          {formacoes.map(f => {
            const jaInscrito = minhas.includes(f.id);
            return (
              <FormacaoCard key={f.id} f={f} footer={
                jaInscrito ? (
                  <button className="btn btn-full" disabled style={{ background: 'var(--verde-claro)', color: 'var(--verde-escuro)', border: 'none' }}>✅ Já inscrito</button>
                ) : f.vagas_disponiveis > 0 ? (
                  <button className="btn btn-primario btn-full" disabled={inscrevendo === f.id}
                    onClick={() => inscrever(f.id)}>
                    {inscrevendo === f.id ? 'Inscrevendo…' : '🎯 Inscrever-se'}
                  </button>
                ) : (
                  <button className="btn btn-full" disabled>Vagas Esgotadas</button>
                )
              } />
            );
          })}
        </div>
      )}
    </PainelLayout>
  );
}
