import { useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

const vazio = {
  setor: '',
  titulo: '',
  proposito: '',
  carga_horaria: '',
  espaco: '',
  publico : '',
  onibus: 'nao',
  respNome: '',
  respTel: '',
  respEmail: '',
  dataEncontro: '',
  repete: 'nao',
  outrasDatas: '',
  qtdManha: '',
  qtdTarde: '',
  qtdNoite: '',
  horaInicio: '',
  horaFim: '',
  horaChegada: '',
  layoutCadeiras: '',
  mesas: 'nao',
  qtdMesas: '',
  acessibilidade: '',
  coffee: '',
  convidadosEspeciais: '',
  observacoes: ''
};

const ESPACOS = [
  'Clube Linguagens',
  'Ateliê Linguagens',
  'Ateliê Linguagens e Sabor',
  'Linguagens e Maker',
  'Clubes e Ateliês',
  'Clubes e Ateliês, Sala de Trabalho 2',
  'Lélia',
  'Carolina',
  'Carolina e Lélia',
  'Carolina e Maker',
  'Inovação e Maker',
  'Sala Maker',
  'Clubes - Sala Maker',
  'Sala de Trabalho 2',
  'Carolina (manhã e tarde)'
];

export default function AgendarFormacao() {
  const toast = useToast();

  const [form, setForm] = useState(vazio);
  const [turnos, setTurnos] = useState({
    manha: false,
    tarde: false,
    noite: false
  });

  const [equipamentos, setEquipamentos] = useState({
    datashow: false,
    som: false,
    microfone: false
  });

  function atualizar(campo, valor) {
    setForm(prev => ({
      ...prev,
      [campo]: valor
    }));
  }

  function toggleTurno(turno) {
    setTurnos(prev => ({
      ...prev,
      [turno]: !prev[turno]
    }));
  }

  function toggleEquipamento(campo) {
    setEquipamentos(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
  }

  async function enviar(e) {
    e.preventDefault();

    if (!form.titulo || !form.proposito || !form.dataEncontro || !form.horaInicio || !form.horaFim) {
      return toast('Preencha os campos obrigatórios.', 'erro');
    }

    const turnosSelecionados = Object.keys(turnos).filter(t => turnos[t]);

    if (turnosSelecionados.length === 0) {
      return toast('Selecione ao menos um turno.', 'erro');
    }

    const payload = {
      setor: form.setor,
      titulo: form.titulo,
      proposito: form.proposito,
      carga_horaria: form.carga_horaria,
      espaco: form.espaco,
      publico: form.publico,
      onibus: form.onibus,
      responsavel: {
        nome: form.respNome,
        telefone: form.respTel,
        email: form.respEmail
      },
      dataEncontro: form.dataEncontro,
      repete: form.repete,
      outrasDatas: form.repete === 'sim' ? form.outrasDatas : '',
      turnos: turnosSelecionados,
      convidados: {
        manha: form.qtdManha || 0,
        tarde: form.qtdTarde || 0,
        noite: form.qtdNoite || 0
      },
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
      horaChegada: form.horaChegada,
      equipamentos,
      layoutCadeiras: form.layoutCadeiras,
      mesas: form.mesas,
      qtdMesas: form.mesas === 'sim' ? form.qtdMesas : '',
      acessibilidade: form.acessibilidade,
      coffee: form.coffee,
      convidadosEspeciais: form.convidadosEspeciais,
      observacoes: form.observacoes
    };

    try {
      await api.post('/propostas-formacao', payload);

      toast('Proposta enviada ao coordenador.');
      setForm(vazio);
      setTurnos({ manha: false, tarde: false, noite: false });
      setEquipamentos({ datashow: false, som: false, microfone: false });
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao enviar proposta.', 'erro');
    }
  }

  return (
    <PainelLayout titulo="Agendar Formação">
      <div className="page-header mb-24">
        <h2>Agendar Encontro Formativo</h2>
        <p style={{ color: 'var(--cinza-600)', fontSize: '.9rem' }}>
          Preencha o formulário para enviar a proposta ao coordenador.
        </p>
      </div>

      <form className="card" onSubmit={enviar}>
        <h3 className="card-titulo">1. Identificação</h3>

        <div className="campo">
          <label>Setor demandante</label>
          <input
            value={form.setor}
            onChange={e => atualizar('setor', e.target.value)}
            placeholder="Ex: Recursos Humanos, Educação, Saúde..."
          />
        </div>

        <div className="campo">
          <label>Título do encontro formativo *</label>
          <input
            value={form.titulo}
            onChange={e => atualizar('titulo', e.target.value)}
            placeholder="Ex: Formação de Líderes Comunitários"
          />
        </div>

        <div className="campo">
          <label>Propósito / Objetivo *</label>
          <textarea
            value={form.proposito}
            onChange={e => atualizar('proposito', e.target.value)}
            placeholder="Descreva o objetivo principal do encontro..."
          />
        </div>

        <div className="campo">
          <label>Carga horária *</label>
          <input
            type="number"
            min="1"
            value={form.carga_horaria}
            onChange={e => atualizar('carga_horaria', e.target.value)}
            placeholder="Ex: 4"
          />
        </div>

        <div className="campo">
        <label>Espaço</label>

        <select
        value={form.espaco}
        onChange={e => atualizar('espaco', e.target.value)}
        >
        <option value="">
          Selecione um espaço
        </option>

    {ESPACOS.map(espaco => (
      <option
        key={espaco}
        value={espaco}
      >
        {espaco}
      </option>
    ))}
  </select>
</div>

        <div className="campo">
          <label>Público</label>
          <input
          value={form.publico}
          onChange={e => atualizar('publico', e.target.value)}
          placeholder="Ex: Professores, coordenadores, equipe técnica..."
          />
        </div>

        <div className="campo">
        <label>Necessita de ônibus?</label>

        <select
        value={form.onibus}
        onChange={e => atualizar('onibus', e.target.value)}
        >
        <option value="nao">Não</option>
        <option value="sim">Sim</option>
        </select>
      </div>

        <h3 className="card-titulo">2. Responsável pela solicitação</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="campo">
            <label>Nome completo *</label>
            <input
              value={form.respNome}
              onChange={e => atualizar('respNome', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Telefone *</label>
            <input
              value={form.respTel}
              onChange={e => atualizar('respTel', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>E-mail *</label>
            <input
              type="email"
              value={form.respEmail}
              onChange={e => atualizar('respEmail', e.target.value)}
            />
          </div>
        </div>

        <h3 className="card-titulo">3. Datas e horários</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="campo">
            <label>Data do encontro *</label>
            <input
              type="date"
              value={form.dataEncontro}
              onChange={e => atualizar('dataEncontro', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Horário de início *</label>
            <input
              type="time"
              value={form.horaInicio}
              onChange={e => atualizar('horaInicio', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Horário de encerramento *</label>
            <input
              type="time"
              value={form.horaFim}
              onChange={e => atualizar('horaFim', e.target.value)}
            />
          </div>
        </div>

        <div className="campo">
          <label>Chegada dos organizadores</label>
          <input
            type="time"
            value={form.horaChegada}
            onChange={e => atualizar('horaChegada', e.target.value)}
          />
        </div>

        <div className="campo">
          <label>O encontro se repete em outras datas?</label>
          <select value={form.repete} onChange={e => atualizar('repete', e.target.value)}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </div>

        {form.repete === 'sim' && (
          <div className="campo">
            <label>Outras datas</label>
            <input
              value={form.outrasDatas}
              onChange={e => atualizar('outrasDatas', e.target.value)}
              placeholder="Ex: 22/08/2026, 29/08/2026"
            />
          </div>
        )}

        <h3 className="card-titulo">4. Turnos e convidados</h3>

        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {['manha', 'tarde', 'noite'].map(t => (
            <button
              type="button"
              key={t}
              className={turnos[t] ? 'btn btn-primario' : 'btn btn-outline'}
              onClick={() => toggleTurno(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="campo">
            <label>Convidados manhã</label>
            <input
              type="number"
              min="0"
              value={form.qtdManha}
              onChange={e => atualizar('qtdManha', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Convidados tarde</label>
            <input
              type="number"
              min="0"
              value={form.qtdTarde}
              onChange={e => atualizar('qtdTarde', e.target.value)}
            />
          </div>

          <div className="campo">
            <label>Convidados noite</label>
            <input
              type="number"
              min="0"
              value={form.qtdNoite}
              onChange={e => atualizar('qtdNoite', e.target.value)}
            />
          </div>
        </div>

        <h3 className="card-titulo">5. Estrutura e organização</h3>

        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {['datashow', 'som', 'microfone'].map(eq => (
            <label key={eq}>
              <input
                type="checkbox"
                checked={equipamentos[eq]}
                onChange={() => toggleEquipamento(eq)}
              />{' '}
              {eq}
            </label>
          ))}
        </div>

        <div className="campo">
          <label>Configuração das cadeiras</label>
          <select
            value={form.layoutCadeiras}
            onChange={e => atualizar('layoutCadeiras', e.target.value)}
          >
            <option value="">Selecione</option>
            <option value="auditorio">Formato auditório</option>
            <option value="u">Formato em U</option>
          </select>
        </div>

        <div className="campo">
          <label>Haverá necessidade de mesas?</label>
          <select value={form.mesas} onChange={e => atualizar('mesas', e.target.value)}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </div>

        {form.mesas === 'sim' && (
          <div className="campo">
            <label>Quantidade de mesas</label>
            <input
              type="number"
              min="1"
              value={form.qtdMesas}
              onChange={e => atualizar('qtdMesas', e.target.value)}
            />
          </div>
        )}

        <div className="campo">
          <label>Acessibilidade e demandas específicas</label>
          <textarea
            value={form.acessibilidade}
            onChange={e => atualizar('acessibilidade', e.target.value)}
          />
        </div>

        <div className="campo">
          <label>Coffee-break</label>
          <select value={form.coffee} onChange={e => atualizar('coffee', e.target.value)}>
            <option value="">Selecione</option>
            <option value="inicio">No início do encontro</option>
            <option value="final">No final do encontro</option>
            <option value="nao">Não haverá coffee-break</option>
          </select>
        </div>

        <div className="campo">
          <label>Convidados especiais</label>
          <textarea
            value={form.convidadosEspeciais}
            onChange={e => atualizar('convidadosEspeciais', e.target.value)}
          />
        </div>

        <div className="campo">
          <label>Observações gerais</label>
          <textarea
            value={form.observacoes}
            onChange={e => atualizar('observacoes', e.target.value)}
          />
        </div>

        <div className="d-flex gap-12 justify-end">
          <button type="button" className="btn btn-outline" onClick={() => setForm(vazio)}>
            Limpar
          </button>

          <button type="submit" className="btn btn-primario">
            Enviar proposta ao coordenador
          </button>
        </div>
      </form>
    </PainelLayout>
  );
}