import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

export default function PropostaFormacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [proposta, setProposta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justificativa, setJustificativa] = useState('');
  const [processando, setProcessando] = useState(false);

  async function carregar() {
    try {
      setLoading(true);
      const { data } = await api.get(`/propostas-formacao/${id}`);
      setProposta(data.data);
    } catch {
      toast('Erro ao carregar proposta.', 'erro');
      navigate('/coordenador/propostas-formacao');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [id]);

  function formatarData(data) {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  function mostrarTurnos(turnos) {
    if (!turnos || turnos.length === 0) return '—';
    return turnos.join(', ');
  }

  function mostrarEquipamentos(equipamentos) {
    if (!equipamentos) return '—';

    const lista = Object.entries(equipamentos)
      .filter(([, marcado]) => marcado)
      .map(([nome]) => nome);

    return lista.length ? lista.join(', ') : '—';
  }

  async function confirmar() {
    if (!confirm('Confirmar esta proposta e criar a formação?')) return;

    try {
      setProcessando(true);
      await api.patch(`/propostas-formacao/${id}/confirmar`);
      toast('Proposta confirmada e formação criada.');
      carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao confirmar proposta.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  async function recusar() {
    if (!justificativa.trim()) {
      return toast('Informe o motivo da recusa.', 'erro');
    }

    if (!confirm('Recusar esta proposta?')) return;

    try {
      setProcessando(true);

      await api.patch(`/propostas-formacao/${id}/recusar`, {
        justificativa
      });

      toast('Proposta recusada.');
      carregar();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao recusar proposta.', 'erro');
    } finally {
      setProcessando(false);
    }
  }

  if (loading) {
    return (
      <PainelLayout titulo="Proposta de Formação">
        <Spinner />
      </PainelLayout>
    );
  }

  if (!proposta) return null;

  return (
    <PainelLayout titulo="Proposta de Formação">
      <div className="d-flex justify-between mb-24">
        <div>
          <h2>{proposta.titulo}</h2>
          <p style={{ color: 'var(--cinza-600)', fontSize: '.9rem' }}>
            Proposta enviada por {proposta.equipe_nome || 'Equipe'}
          </p>
        </div>

        <Link className="btn btn-outline" to="/coordenador/propostas-formacao">
          Voltar
        </Link>
      </div>

      <div className="card mb-24">
        <h3 className="card-titulo">Status da proposta</h3>

        <p>
          <strong>Status:</strong>{' '}
          <Badge status={proposta.status} />
        </p>

        {proposta.justificativa_recusa && (
          <p>
            <strong>Motivo da recusa:</strong> {proposta.justificativa_recusa}
          </p>
        )}
      </div>

      <div className="card mb-24">
        <h3 className="card-titulo">Dados principais</h3>

        <p><strong>Setor:</strong> {proposta.setor || '—'}</p>
        <p><strong>Título:</strong> {proposta.titulo || '—'}</p>
        <p><strong>Propósito:</strong> {proposta.proposito || '—'}</p>
        <p><strong>Carga horária:</strong> {proposta.carga_horaria || 0}h</p>
        <p><strong>Espaço:</strong> {proposta.espaco || '—'}</p>
        <p><strong>Público:</strong> {proposta.publico || '—'}</p>
        <p><strong>Ônibus:</strong> {proposta.onibus === 'sim' ? 'Sim' : 'Não'}</p>
      </div>

      <div className="card mb-24">
        <h3 className="card-titulo">Responsável pela solicitação</h3>

        <p><strong>Nome:</strong> {proposta.responsavel_nome || '—'}</p>
        <p><strong>Telefone:</strong> {proposta.responsavel_telefone || '—'}</p>
        <p><strong>E-mail:</strong> {proposta.responsavel_email || '—'}</p>
      </div>

      <div className="card mb-24">
        <h3 className="card-titulo">Data e horário</h3>

        <p><strong>Data:</strong> {formatarData(proposta.data_encontro)}</p>
        <p><strong>Repete?</strong> {proposta.repete === 'sim' ? 'Sim' : 'Não'}</p>
        <p><strong>Outras datas:</strong> {proposta.outras_datas || '—'}</p>
        <p><strong>Turnos:</strong> {mostrarTurnos(proposta.turnos)}</p>
        <p><strong>Horário:</strong> {proposta.hora_inicio} às {proposta.hora_fim}</p>
        <p><strong>Chegada dos organizadores:</strong> {proposta.hora_chegada || '—'}</p>
      </div>

      <div className="card mb-24">
        <h3 className="card-titulo">Participantes e estrutura</h3>

        <p><strong>Quantidade manhã:</strong> {proposta.qtd_manha || 0}</p>
        <p><strong>Quantidade tarde:</strong> {proposta.qtd_tarde || 0}</p>
        <p><strong>Quantidade noite:</strong> {proposta.qtd_noite || 0}</p>
        <p><strong>Equipamentos:</strong> {mostrarEquipamentos(proposta.equipamentos)}</p>
        <p><strong>Layout das cadeiras:</strong> {proposta.layout_cadeiras || '—'}</p>
        <p><strong>Mesas:</strong> {proposta.mesas || '—'}</p>
        <p><strong>Quantidade de mesas:</strong> {proposta.qtd_mesas || '—'}</p>
        <p><strong>Acessibilidade:</strong> {proposta.acessibilidade || '—'}</p>
        <p><strong>Coffee break:</strong> {proposta.coffee || '—'}</p>
        <p><strong>Convidados especiais:</strong> {proposta.convidados_especiais || '—'}</p>
        <p><strong>Observações:</strong> {proposta.observacoes || '—'}</p>
      </div>

      {proposta.status === 'pendente' && (
        <div className="card">
          <h3 className="card-titulo">Análise do coordenador</h3>

          <div className="campo">
            <label>Motivo da recusa</label>
            <textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Informe o motivo caso a proposta seja recusada..."
            />
          </div>

          <div className="d-flex gap-8">
            <button
              className="btn btn-primario"
              onClick={confirmar}
              disabled={processando}
            >
              Confirmar proposta
            </button>

            <button
              className="btn btn-perigo"
              onClick={recusar}
              disabled={processando}
            >
              Recusar proposta
            </button>
          </div>
        </div>
      )}
    </PainelLayout>
  );
}