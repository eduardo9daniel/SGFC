import React, { useState } from 'react';
import axios from 'axios';

export default function AgendarFormacaoPage() {
  const [form, setForm] = useState({
    titulo: '',
    proposito: '',
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
    obs: '',
  });

  const [turnos, setTurnos] = useState({
    manha: false,
    tarde: false,
    noite: false,
  });

  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleTurno(turno) {
    setTurnos((prev) => ({
      ...prev,
      [turno]: !prev[turno],
    }));
  }

  function maskPhone(value) {
    let v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return v;
  }

  function clearForm() {
    setForm({
      titulo: '',
      proposito: '',
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
      obs: '',
    });

    setTurnos({
      manha: false,
      tarde: false,
      noite: false,
    });

    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const requiredFields = [
      ['titulo', 'Título do encontro'],
      ['proposito', 'Propósito / Objetivo'],
      ['respNome', 'Nome do responsável'],
      ['respTel', 'Telefone'],
      ['respEmail', 'E-mail'],
      ['dataEncontro', 'Data do encontro'],
      ['horaInicio', 'Horário de início'],
      ['horaFim', 'Horário de encerramento'],
    ];

    for (const [field, label] of requiredFields) {
      if (!form[field]?.trim()) {
        alert(`Campo obrigatório não preenchido: ${label}`);
        return;
      }
    }

    if (!turnos.manha && !turnos.tarde && !turnos.noite) {
      alert('Selecione ao menos um turno.');
      return;
    }

    const dados = {
      titulo: form.titulo,
      proposito: form.proposito,
      responsavel: {
        nome: form.respNome,
        telefone: form.respTel,
        email: form.respEmail,
      },
      dataEncontro: form.dataEncontro,
      repete: form.repete,
      outrasDatas: form.repete === 'sim' ? form.outrasDatas : '',
      turnos: Object.keys(turnos).filter((k) => turnos[k]),
      convidados: {
        manha: form.qtdManha || 0,
        tarde: form.qtdTarde || 0,
        noite: form.qtdNoite || 0,
      },
      horaInicio: form.horaInicio,
      horaFim: form.horaFim,
      observacoes: form.obs,
    };

    try {
      await axios.post('/api/formacoes', dados);
      setSuccess(true);
      clearForm();
      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar a formação.');
    }
  }

  return (
    <div style={{ padding: '1.5rem', background: '#F4F6F9', minHeight: '100vh' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#212529' }}>
          Agendar Encontro Formativo
        </h1>
        <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
          Preencha os dados abaixo para registrar um novo encontro formativo.
        </p>
      </div>

      {success && (
        <div
          style={{
            background: '#d4edda',
            border: '1px solid #1D7118',
            color: '#155724',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '1rem',
          }}
        >
          Formação agendada com sucesso!
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          borderRadius: '10px',
          border: '0.5px solid #ddd',
          padding: '1.5rem',
        }}
      >
        <h3 style={{ color: '#EA5B23', marginBottom: '1rem' }}>Informações do Encontro</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label>Título do encontro formativo *</label>
          <input
            type="text"
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Propósito / Objetivo *</label>
          <textarea
            name="proposito"
            value={form.proposito}
            onChange={handleChange}
            rows={3}
            style={inputStyle}
          />
        </div>

        <h3 style={sectionStyle}>Responsável</h3>

        <div style={grid3}>
          <div>
            <label>Nome do responsável *</label>
            <input
              type="text"
              name="respNome"
              value={form.respNome}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label>Telefone *</label>
            <input
              type="text"
              name="respTel"
              value={form.respTel}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, respTel: maskPhone(e.target.value) }))
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label>E-mail *</label>
            <input
              type="email"
              name="respEmail"
              value={form.respEmail}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <h3 style={sectionStyle}>Datas e Turnos</h3>

        <div style={grid2}>
          <div>
            <label>Data do encontro *</label>
            <input
              type="date"
              name="dataEncontro"
              value={form.dataEncontro}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label>Repete em outras datas?</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '8px' }}>
              <label>
                <input
                  type="radio"
                  name="repete"
                  value="nao"
                  checked={form.repete === 'nao'}
                  onChange={handleChange}
                />{' '}
                Não
              </label>
              <label>
                <input
                  type="radio"
                  name="repete"
                  value="sim"
                  checked={form.repete === 'sim'}
                  onChange={handleChange}
                />{' '}
                Sim
              </label>
            </div>

            {form.repete === 'sim' && (
              <input
                type="text"
                name="outrasDatas"
                value={form.outrasDatas}
                onChange={handleChange}
                placeholder="Ex: 15/08/2025, 22/08/2025"
                style={{ ...inputStyle, marginTop: '8px' }}
              />
            )}
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label>Turno(s) *</label>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '8px', flexWrap: 'wrap' }}>
            {['manha', 'tarde', 'noite'].map((turno) => (
              <button
                key={turno}
                type="button"
                onClick={() => toggleTurno(turno)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: turnos[turno] ? '1.5px solid #EA5B23' : '1.5px solid #ddd',
                  background: turnos[turno] ? '#FFF5F1' : '#fff',
                  cursor: 'pointer',
                }}
              >
                {turno === 'manha' ? 'Manhã' : turno === 'tarde' ? 'Tarde' : 'Noite'}
              </button>
            ))}
          </div>
        </div>

        <h3 style={sectionStyle}>Quantidade de Convidados por Turno</h3>

        <div style={grid3}>
          <div>
            <label>Manhã</label>
            <input
              type="number"
              name="qtdManha"
              value={form.qtdManha}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label>Tarde</label>
            <input
              type="number"
              name="qtdTarde"
              value={form.qtdTarde}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label>Noite</label>
            <input
              type="number"
              name="qtdNoite"
              value={form.qtdNoite}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <h3 style={sectionStyle}>Horários</h3>

        <div style={grid2}>
          <div>
            <label>Horário de início *</label>
            <input
              type="time"
              name="horaInicio"
              value={form.horaInicio}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label>Horário de encerramento *</label>
            <input
              type="time"
              name="horaFim"
              value={form.horaFim}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <h3 style={sectionStyle}>Observações</h3>

        <div style={{ marginBottom: '1.5rem' }}>
          <textarea
            name="obs"
            value={form.obs}
            onChange={handleChange}
            rows={4}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={clearForm} style={btnSecondary}>
            Limpar
          </button>
          <button type="submit" style={btnPrimary}>
            Agendar Formação
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '13.5px',
  marginTop: '4px',
};

const sectionStyle = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#EA5B23',
  borderBottom: '1.5px solid #EA5B23',
  paddingBottom: '6px',
  marginBottom: '1rem',
  marginTop: '1.5rem',
};

const grid2 = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const grid3 = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '1rem',
  marginBottom: '1rem',
};

const btnPrimary = {
  background: '#EA5B23',
  color: '#fff',
  border: 'none',
  padding: '10px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  cursor: 'pointer',
};

const btnSecondary = {
  background: '#1D7118',
  color: '#fff',
  border: 'none',
  padding: '10px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  cursor: 'pointer',
};