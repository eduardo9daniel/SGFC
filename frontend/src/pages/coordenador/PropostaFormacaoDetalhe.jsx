import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coffee,
  FileText,
  MapPin,
  Mic2,
  Monitor,
  UserRound,
  UsersRound,
  Volume2,
  XCircle
} from 'lucide-react';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';

export default function PropostaFormacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [proposta, setProposta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [justificativaRecusa, setJustificativaRecusa] = useState('');
  const [observacoes, setObservacoes] = useState('');

  async function carregarProposta() {
    setLoading(true);
    setErro('');

    try {
      const { data } = await api.get(`/propostas-formacao/${id}`);

      const propostaRecebida = data.data || data;
      setProposta(propostaRecebida);

      setJustificativaRecusa(
        propostaRecebida?.justificativa_recusa || ''
      );

      setObservacoes(
      propostaRecebida?.observacoes_coordenador || ''
      );
    } catch (error) {
      setErro(
        error?.response?.data?.erro ||
          'Não foi possível carregar a proposta.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProposta();
  }, [id]);

  function formatarData(data) {
    if (!data) {
      return 'Não informada';
    }

    const somenteData = String(data).slice(0, 10);
    const partes = somenteData.split('-');

    if (partes.length !== 3) {
      return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function formatarHorario(horario) {
    if (!horario) {
      return 'Não informado';
    }

    return String(horario).slice(0, 5);
  }

  function formatarTexto(valor) {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return 'Não informado';
    }

    return valor;
  }

  function formatarSimNao(valor) {
  if (
    valor === true ||
    valor === 1 ||
    valor === '1' ||
    ['sim', 'inicio', 'final'].includes(
      String(valor).toLowerCase()
    )
  ) {
    return 'Sim';
  }

  return 'Não';
}

function formatarHorariosProposta(proposta) {
  const horarios = [
    {
      nome: 'Manhã',
      inicio: proposta.hora_inicio_manha,
      fim: proposta.hora_fim_manha
    },
    {
      nome: 'Tarde',
      inicio: proposta.hora_inicio_tarde,
      fim: proposta.hora_fim_tarde
    },
    {
      nome: 'Noite',
      inicio: proposta.hora_inicio_noite,
      fim: proposta.hora_fim_noite
    }
  ]
    .filter(item => item.inicio || item.fim)
    .map(
      item =>
        `${item.nome}: ${formatarHorario(
          item.inicio
        )} às ${formatarHorario(item.fim)}`
    );

  if (horarios.length) {
    return horarios.join(' | ');
  }

  if (proposta.hora_inicio || proposta.hora_fim) {
    return `${formatarHorario(
      proposta.hora_inicio
    )} às ${formatarHorario(
      proposta.hora_fim
    )}`;
  }

  return 'Não informado';
}

function quantidadeEquipamento(nome) {
  const quantidade = Number(
    proposta?.equipamentos?.[nome] ?? 0
  );

  return Number.isFinite(quantidade)
    ? quantidade
    : 0;
}

function totalVagas() {
  return (
    Number(proposta?.qtd_manha || 0) +
    Number(proposta?.qtd_tarde || 0) +
    Number(proposta?.qtd_noite || 0)
  );
}

  async function confirmarProposta() {
  if (processando) {
    return;
  }

  const confirmou = window.confirm(
    'Deseja confirmar esta proposta de formação?'
  );

  if (!confirmou) {
    return;
  }

  setProcessando(true);
  setErro('');
  setSucesso('');

  try {
    const { data } = await api.patch(
      `/propostas-formacao/${id}/confirmar`,
      {
        observacoes: observacoes.trim() || null
      }
    );

    setSucesso(
      data?.mensagem ||
        'Proposta confirmada com sucesso.'
    );

    await carregarProposta();
  } catch (error) {
    console.error(
      'Erro ao confirmar proposta:',
      error
    );

    setErro(
      error?.response?.data?.erro ||
        error?.response?.data?.message ||
        'Não foi possível confirmar a proposta.'
    );
  } finally {
    setProcessando(false);
  }
}

async function recusarProposta() {
  if (processando) {
    return;
  }

  if (!justificativaRecusa.trim()) {
    setErro(
      'Informe a justificativa antes de recusar a proposta.'
    );
    return;
  }

  const confirmou = window.confirm(
    'Deseja recusar esta proposta de formação?'
  );

  if (!confirmou) {
    return;
  }

  setProcessando(true);
  setErro('');
  setSucesso('');

  try {
    const { data } = await api.patch(
      `/propostas-formacao/${id}/recusar`,
      {
        justificativa: justificativaRecusa.trim(),
        observacoes: observacoes.trim() || null
      }
    );

    setSucesso(
      data?.mensagem ||
        'Proposta recusada com sucesso.'
    );

    await carregarProposta();
  } catch (error) {
    console.error(
      'Erro ao recusar proposta:',
      error
    );

    setErro(
      error?.response?.data?.erro ||
        error?.response?.data?.message ||
        'Não foi possível recusar a proposta.'
    );
  } finally {
    setProcessando(false);
  }
}

  function badgeStatus(status) {
    const valor = String(status || '').toLowerCase();

    if (valor === 'confirmada') {
      return (
        <span className="badge badge-sucesso">
          Confirmada
        </span>
      );
    }

    if (valor === 'recusada') {
      return (
        <span className="badge badge-perigo">
          Recusada
        </span>
      );
    }

    return (
      <span className="badge badge-aviso">
        Pendente
      </span>
    );
  }

  if (loading) {
    return (
      <PainelLayout titulo="Detalhes da Proposta">
        <Spinner />
      </PainelLayout>
    );
  }

  if (!proposta) {
    return (
      <PainelLayout titulo="Detalhes da Proposta">
        <div className="card">
          <p>
            {erro || 'Proposta não encontrada.'}
          </p>

          <button
            type="button"
            className="btn btn-secundario"
            onClick={() =>
              navigate('/coordenador/propostas-formacao')
            }
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
        </div>
      </PainelLayout>
    );
  }

  const status = String(
    proposta.status || ''
  ).toLowerCase();

  const pendente = status === 'pendente';

  return (
    <PainelLayout titulo="Detalhes da Proposta">
      <div
        className="mb-24"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          className="btn btn-secundario"
          onClick={() =>
            navigate('/coordenador/propostas-formacao')
          }
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        {badgeStatus(proposta.status)}
      </div>

      {erro && (
        <div
          className="alert alert-erro mb-24"
          role="alert"
        >
          {erro}
        </div>
      )}

      {sucesso && (
        <div
          className="alert alert-sucesso mb-24"
          role="alert"
        >
          {sucesso}
        </div>
      )}

      <div className="card mb-24">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '18px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <p
              style={{
                margin: '0 0 6px',
                color: 'var(--laranja-vivo)',
                fontSize: '.78rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '.04em'
              }}
            >
              Proposta de formação
            </p>

            <h2
              style={{
                margin: 0
              }}
            >
              {proposta.titulo}
            </h2>

            {proposta.subtitulo && (
              <p
                style={{
                  margin: '8px 0 0',
                  color: 'var(--cinza-600)'
                }}
              >
                {proposta.subtitulo}
              </p>
            )}
          </div>

          <div
            style={{
              color: 'var(--cinza-500)',
              fontSize: '.82rem'
            }}
          >
            Proposta nº {proposta.id}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <InformacaoCard
          icone={<CalendarDays size={21} />}
          titulo="Data"
          valor={formatarData(proposta.data_encontro)}
        />

        <InformacaoCard
  icone={<Clock3 size={21} />}
  titulo="Horário"
  valor={formatarHorariosProposta(proposta)}
/>

<InformacaoCard
  icone={<Clock3 size={21} />}
  titulo="Carga horária"
  valor={
    proposta.carga_horaria
      ? `${proposta.carga_horaria}h`
      : 'Não informada'
  }
/>

<InformacaoCard
  icone={<MapPin size={21} />}
  titulo="Local"
  valor={formatarTexto(proposta.espaco)}
/>

<InformacaoCard
  icone={<UserRound size={21} />}
  titulo="Responsável"
  valor={formatarTexto(
    proposta.responsavel_nome
  )}
/>

<InformacaoCard
  icone={<UsersRound size={21} />}
  titulo="Público-alvo"
  valor={formatarTexto(proposta.publico)}
/>
      </div>

      <div className="card mb-24">
        <h3
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            marginTop: 0
          }}
        >
          <FileText size={20} />
          Informações da formação
        </h3>

        <div
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px'
  }}
>
  <CampoTexto
    titulo="Propósito"
    valor={proposta.proposito}
  />

  <CampoTexto
    titulo="Conteúdo programático"
    valor={proposta.conteudo_programatico}
  />

  <CampoTexto
    titulo="Setor demandante"
    valor={proposta.setor}
  />

  <CampoTexto
    titulo="Público-alvo"
    valor={proposta.publico}
  />

  <CampoTexto
    titulo="Número de vagas"
    valor={
      Number(proposta.qtd_manha || 0) +
      Number(proposta.qtd_tarde || 0) +
      Number(proposta.qtd_noite || 0)
    }
  />

  <CampoTexto
    titulo="Ônibus"
    valor={formatarSimNao(proposta.onibus)}
  />
</div>
</div>

      <div className="card mb-24">
        <h3
          style={{
            marginTop: 0
          }}
        >
          Estrutura e equipamentos
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '14px'
          }}
        >
         <EquipamentoCard
  icone={<Monitor size={21} />}
  titulo="Datashow"
  valor={formatarSimNao(
    proposta.equipamentos?.datashow
  )}
/>

<EquipamentoCard
  icone={<Volume2 size={21} />}
  titulo="Som"
  valor={
    Number(proposta.equipamentos?.som || 0)
  }
/>

<EquipamentoCard
  icone={<Mic2 size={21} />}
  titulo="Microfone"
  valor={
    Number(
      proposta.equipamentos?.microfone || 0
    )
  }
/>

<EquipamentoCard
  icone={<Coffee size={21} />}
  titulo="Coffee Break"
  valor={formatarSimNao(proposta.coffee)}
/>
        </div>
      </div>

      <div className="card mb-24">
  <h3 style={{ marginTop: 0 }}>
    Observações da equipe
  </h3>

  <p
    style={{
      whiteSpace: 'pre-wrap',
      marginBottom: 0
    }}
  >
    {proposta.observacoes ||
      'Nenhuma observação informada.'}
  </p>
</div>

      <div
  className="card mb-24"
  style={{
    padding: 0,
    overflow: 'hidden',
    borderRadius: '18px',
    border: '1px solid var(--laranja-borda)',
    boxShadow: 'var(--sombra-dashboard)',
    background: 'var(--branco)'
  }}
>
  {/* Cabeçalho do card */}
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '22px 26px',
      background:
        'linear-gradient(135deg, var(--laranja-extra-suave), var(--branco))',
      borderBottom: '1px solid var(--laranja-borda)'
    }}
  >
    <div
      style={{
        width: '46px',
        height: '46px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '14px',
        color: 'var(--laranja)',
        background: 'var(--laranja-suave)'
      }}
    >
      <FileText size={23} />
    </div>

    <div>
      <h3
        style={{
          margin: 0,
          color: 'var(--cinza-900)',
          fontSize: '1.15rem'
        }}
      >
        Análise do coordenador
      </h3>

      <p
        style={{
          margin: '3px 0 0',
          color: 'var(--cinza-600)',
          fontSize: '.88rem'
        }}
      >
        Registre observações e analise a proposta antes
        de tomar uma decisão.
      </p>
    </div>
  </div>

  {/* Conteúdo do card */}
  <div
    style={{
      padding: '26px'
    }}
  >
    <div
      className="form-grupo"
      style={{
        padding: '18px',
        borderRadius: '14px',
        border: '1px solid var(--cinza-200)',
        background: 'var(--cinza-100)'
      }}
    >
      <label
        htmlFor="observacoes"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          marginBottom: '9px',
          color: 'var(--cinza-800)',
          fontWeight: '700'
        }}
      >
        Observações

        <span
          style={{
            padding: '3px 9px',
            borderRadius: '999px',
            color: 'var(--cinza-600)',
            background: 'var(--cinza-200)',
            fontSize: '.72rem',
            fontWeight: '600'
          }}
        >
          Opcional
        </span>
      </label>

      <textarea
        id="observacoes"
        className="input"
        rows="5"
        value={observacoes}
        onChange={(event) =>
          setObservacoes(event.target.value)
        }
        placeholder="Digite uma observação para a equipe responsável pela proposta."
        disabled={!pendente || processando}
        style={{
          width: '100%',
          minHeight: '140px',
          padding: '14px 16px',
          resize: 'vertical',
          borderRadius: '12px',
          border: '1px solid var(--cinza-300)',
          background: !pendente
            ? 'var(--cinza-200)'
            : 'var(--branco)',
          color: 'var(--cinza-800)',
          lineHeight: '1.5',
          boxSizing: 'border-box'
        }}
      />
    </div>

    {status === 'recusada' && (
      <div
        className="form-grupo"
        style={{
          marginTop: '20px',
          padding: '18px',
          borderRadius: '14px',
          border: '1px solid var(--perigo-bg)',
          background: '#fff8f8'
        }}
      >
        <label
          htmlFor="justificativa_recusa_visualizacao"
          style={{
            display: 'block',
            marginBottom: '9px',
            color: 'var(--perigo-texto)',
            fontWeight: '700'
          }}
        >
          Justificativa da recusa
        </label>

        <textarea
          id="justificativa_recusa_visualizacao"
          className="input"
          rows="4"
          value={
            proposta.justificativa_recusa || ''
          }
          disabled
          style={{
            width: '100%',
            minHeight: '110px',
            padding: '14px 16px',
            resize: 'vertical',
            borderRadius: '12px',
            border: '1px solid var(--cinza-300)',
            background: 'var(--branco)',
            boxSizing: 'border-box'
          }}
        />
      </div>
    )}

    {pendente && (
      <div
        className="form-grupo"
        style={{
          marginTop: '20px',
          padding: '18px',
          borderRadius: '14px',
          border: '1px solid var(--cinza-200)',
          background: 'var(--branco)'
        }}
      >
        <label
          htmlFor="justificativa_recusa"
          style={{
            display: 'block',
            marginBottom: '5px',
            color: 'var(--cinza-800)',
            fontWeight: '700'
          }}
        >
          Justificativa para recusa
        </label>

        <p
          style={{
            margin: '0 0 10px',
            color: 'var(--cinza-600)',
            fontSize: '.82rem'
          }}
        >
          Preencha somente quando a proposta precisar
          ser recusada.
        </p>

        <textarea
          id="justificativa_recusa"
          className="input"
          rows="4"
          value={justificativaRecusa}
          onChange={(event) =>
            setJustificativaRecusa(
              event.target.value
            )
          }
          placeholder="Informe o motivo da recusa."
          disabled={processando}
          style={{
            width: '100%',
            minHeight: '110px',
            padding: '14px 16px',
            resize: 'vertical',
            borderRadius: '12px',
            border: '1px solid var(--cinza-300)',
            background: 'var(--branco)',
            boxSizing: 'border-box'
          }}
        />
      </div>
    )}

    {pendente && (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          marginTop: '24px',
          paddingTop: '22px',
          flexWrap: 'wrap',
          borderTop: '1px solid var(--cinza-200)'
        }}
      >
        <button
          type="button"
          className="btn btn-perigo"
          onClick={recusarProposta}
          disabled={processando}
        >
          <XCircle size={18} />

          {processando
            ? 'Processando...'
            : 'Recusar proposta'}
        </button>

        <button
          type="button"
          className="btn btn-primario"
          onClick={confirmarProposta}
          disabled={processando}
        >
          <CheckCircle2 size={18} />

          {processando
            ? 'Processando...'
            : 'Confirmar proposta'}
        </button>
      </div>
    )}
  </div>
</div>
    </PainelLayout>
  );
}

function InformacaoCard({
  icone,
  titulo,
  valor
}) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        margin: 0
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'var(--laranja-extra-suave)',
          color: 'var(--laranja-vivo)'
        }}
      >
        {icone}
      </div>

      <div>
        <span
          style={{
            display: 'block',
            marginBottom: '4px',
            color: 'var(--cinza-500)',
            fontSize: '.76rem',
            fontWeight: '800',
            textTransform: 'uppercase'
          }}
        >
          {titulo}
        </span>

        <strong
          style={{
            color: 'var(--cinza-900)',
            fontSize: '.93rem'
          }}
        >
          {valor}
        </strong>
      </div>
    </div>
  );
}

function CampoTexto({
  titulo,
  valor
}) {
  return (
    <div>
      <span
        style={{
          display: 'block',
          marginBottom: '6px',
          color: 'var(--cinza-500)',
          fontSize: '.76rem',
          fontWeight: '800',
          textTransform: 'uppercase'
        }}
      >
        {titulo}
      </span>

      <p
        style={{
          margin: 0,
          color: 'var(--cinza-700)',
          fontSize: '.9rem',
          lineHeight: '1.55',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere'
        }}
      >
        {valor || 'Não informado'}
      </p>
    </div>
  );
}

function EquipamentoCard({
  icone,
  titulo,
  valor
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        minHeight: '78px',
        padding: '15px',
        border: '1px solid var(--cinza-200)',
        borderRadius: '14px',
        background: 'var(--cinza-50)'
      }}
    >
      <div
        style={{
          color: 'var(--laranja-vivo)'
        }}
      >
        {icone}
      </div>

      <div>
        <span
          style={{
            display: 'block',
            color: 'var(--cinza-500)',
            fontSize: '.74rem',
            fontWeight: '800',
            textTransform: 'uppercase'
          }}
        >
          {titulo}
        </span>

        <strong>
          {valor}
        </strong>
      </div>
    </div>
  );
}