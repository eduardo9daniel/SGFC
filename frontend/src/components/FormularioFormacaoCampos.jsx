import {
  ESPACOS_FORMACAO,
  TURNOS_FORMACAO
} from '../utils/formacaoForm';

const STATUS = ['aberta', 'andamento', 'concluida', 'cancelada'];

function maskPhone(value) {
  let v = String(value || '').replace(/\D/g, '').slice(0, 11);
  v = v.replace(/^(\d{2})(\d)/, '($1) $2');
  v = v.replace(/(\d{5})(\d)/, '$1-$2');
  return v;
}

function campoHorario(turno, tipo) {
  const nome = turno.charAt(0).toUpperCase() + turno.slice(1);
  return `${tipo}${nome}`;
}

export default function FormularioFormacaoCampos({
  form,
  onChange,
  mostrarStatus = false,
  mostrarObservacoes = true,
  rotuloObservacoes = 'Observações gerais',
  placeholderObservacoes = ''
}) {
  function atualizar(campo, valor) {
    onChange(prev => ({
      ...prev,
      [campo]: valor
    }));
  }

  function atualizarTurno(turno) {
    onChange(prev => ({
      ...prev,
      turnos: {
        ...prev.turnos,
        [turno]: !prev.turnos?.[turno]
      }
    }));
  }

  function quantidadeEquipamento(valor) {
    if (valor === true) {
      return 1;
    }

    if (
      valor === false ||
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return 0;
    }

    const quantidade = Number(valor);

    return Number.isFinite(quantidade) && quantidade >= 0
      ? Math.trunc(quantidade)
      : 0;
  }

  function atualizarEquipamento(equipamento, marcado) {
    onChange(prev => ({
      ...prev,
      equipamentos: {
        ...prev.equipamentos,
        [equipamento]: marcado
          ? Math.max(
              1,
              quantidadeEquipamento(
                prev.equipamentos?.[equipamento]
              )
            )
          : 0
      }
    }));
  }

  function atualizarQuantidadeEquipamento(equipamento, valor) {
    const quantidade = Math.max(
      1,
      Math.trunc(Number(valor) || 1)
    );

    onChange(prev => ({
      ...prev,
      equipamentos: {
        ...prev.equipamentos,
        [equipamento]: quantidade
      }
    }));
  }

  return (
    <>
      <h3 style={sectionStyle}>1. Identificação</h3>

      <div className="campo">
        <label>Setor demandante *</label>

        <input
          value={form.setor}
          onChange={e => atualizar('setor', e.target.value)}
          placeholder="Ex: SSDE, Coordenação de Formação, unidade escolar..."
        />
      </div>

      <div className="campo">
        <label>Título do encontro formativo *</label>

        <input
          value={form.titulo}
          onChange={e => atualizar('titulo', e.target.value)}
          placeholder="Ex: Formação de professores alfabetizadores"
        />
      </div>

      <div className="campo">
        <label>Propósito / Objetivo *</label>

        <textarea
          value={form.proposito}
          onChange={e => atualizar('proposito', e.target.value)}
          placeholder="Descreva o objetivo principal do encontro..."
          rows={4}
        />
      </div>

      <div className="campo">
        <label>Conteúdo Programático</label>

        <textarea
          value={form.conteudoProgramatico}
          onChange={e =>
            atualizar(
              'conteudoProgramatico',
              e.target.value
            )
          }
          placeholder="Informe os tópicos da formação, preferencialmente um por linha."
          rows={6}
        />

        <small
          style={{
            display: 'block',
            marginTop: 6,
            color: 'var(--cinza-500, #6b7280)'
          }}
        >
          Este conteúdo será exibido no verso do certificado.
        </small>
      </div>

      <div style={grid3}>
        <div className="campo">
          <label>Carga horária *</label>

          <input
            type="number"
            min="1"
            value={form.carga_horaria}
            onChange={e =>
              atualizar('carga_horaria', e.target.value)
            }
            placeholder="Ex: 4"
          />
        </div>

        <div className="campo">
          <label>Espaço</label>

          <select
            value={form.espaco}
            onChange={e => atualizar('espaco', e.target.value)}
          >
            <option value="">Selecione um espaço</option>

            {ESPACOS_FORMACAO.map(espaco => (
              <option key={espaco} value={espaco}>
                {espaco}
              </option>
            ))}
          </select>
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
      </div>

      <div className="campo">
        <label>Público</label>

        <input
          value={form.publico}
          onChange={e => atualizar('publico', e.target.value)}
          placeholder="Ex: Professores, coordenadores, equipe técnica..."
        />
      </div>

      <h3 style={sectionStyle}>
        2. Responsável pela solicitação
      </h3>

      <div style={grid3}>
        <div className="campo">
          <label>Nome completo *</label>

          <input
            value={form.respNome}
            onChange={e =>
              atualizar('respNome', e.target.value)
            }
          />
        </div>

        <div className="campo">
          <label>Telefone *</label>

          <input
            value={form.respTel}
            onChange={e =>
              atualizar(
                'respTel',
                maskPhone(e.target.value)
              )
            }
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="campo">
          <label>E-mail *</label>

          <input
            type="email"
            value={form.respEmail}
            onChange={e =>
              atualizar('respEmail', e.target.value)
            }
            placeholder="email@exemplo.com"
          />
        </div>
      </div>

      <h3 style={sectionStyle}>
        3. Datas, turnos e horários
      </h3>

      <div style={grid3}>
        <div className="campo">
          <label>Data do encontro *</label>

          <input
            type="date"
            value={form.dataEncontro}
            onChange={e => {
              const valor = e.target.value;

              onChange(prev => ({
                ...prev,
                dataEncontro: valor,
                dataFim: prev.dataFim || valor
              }));
            }}
          />
        </div>

        <div className="campo">
          <label>Data de encerramento</label>

          <input
            type="date"
            min={form.dataEncontro || undefined}
            value={form.dataFim}
            onChange={e =>
              atualizar('dataFim', e.target.value)
            }
          />
        </div>

        <div className="campo">
          <label>Chegada dos organizadores</label>

          <input
            type="time"
            value={form.horaChegada}
            onChange={e =>
              atualizar('horaChegada', e.target.value)
            }
          />
        </div>
      </div>

      <div style={grid2}>
        <div className="campo">
          <label>
            O encontro se repete em outras datas?
          </label>

          <select
            value={form.repete}
            onChange={e =>
              atualizar('repete', e.target.value)
            }
          >
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </div>

        {form.repete === 'sim' && (
          <div className="campo">
            <label>Outras datas</label>

            <input
              value={form.outrasDatas}
              onChange={e =>
                atualizar(
                  'outrasDatas',
                  e.target.value
                )
              }
              placeholder="Ex: 22/08/2026, 29/08/2026"
            />
          </div>
        )}
      </div>

      <div className="campo">
        <label>Turno(s) *</label>

        <div style={turnoGrid}>
          {TURNOS_FORMACAO.map(turno => (
            <button
              type="button"
              key={turno.id}
              onClick={() =>
                atualizarTurno(turno.id)
              }
              style={turnoStyle(
                Boolean(form.turnos?.[turno.id])
              )}
            >
              {form.turnos?.[turno.id] ? '✓ ' : ''}
              {turno.label}
            </button>
          ))}
        </div>
      </div>

      <div style={turnosCardsGrid}>
        {TURNOS_FORMACAO.map(turno => {
          if (!form.turnos?.[turno.id]) {
            return null;
          }

          const campoInicio = campoHorario(
            turno.id,
            'horaInicio'
          );

          const campoFim = campoHorario(
            turno.id,
            'horaFim'
          );

          const campoQtd = `qtd${
            turno.id.charAt(0).toUpperCase() +
            turno.id.slice(1)
          }`;

          return (
            <div
              key={turno.id}
              style={turnoCardStyle}
            >
              <h4
                style={{
                  margin: '0 0 14px',
                  fontSize: '1rem'
                }}
              >
                Turno da {turno.label.toLowerCase()}
              </h4>

              <div className="campo">
                <label>Horário de início *</label>

                <input
                  type="time"
                  value={form[campoInicio]}
                  onChange={e =>
                    atualizar(
                      campoInicio,
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="campo">
                <label>
                  Horário de encerramento *
                </label>

                <input
                  type="time"
                  value={form[campoFim]}
                  onChange={e =>
                    atualizar(
                      campoFim,
                      e.target.value
                    )
                  }
                />
              </div>

              <div
                className="campo"
                style={{ marginBottom: 0 }}
              >
                <label>
                  Quantidade de convidados
                </label>

                <input
                  type="number"
                  min="0"
                  value={form[campoQtd]}
                  onChange={e =>
                    atualizar(
                      campoQtd,
                      e.target.value
                    )
                  }
                  placeholder="0"
                />
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={sectionStyle}>
        4. Estrutura e organização
      </h3>

      <div className="campo">
        <label>Equipamentos</label>

        <div style={equipamentosGrid}>
          {[
            ['datashow', 'Datashow', false],
            ['som', 'Som', true],
            ['microfone', 'Microfone', true]
          ].map(
            ([
              id,
              label,
              permiteQuantidade
            ]) => {
              const quantidade =
                quantidadeEquipamento(
                  form.equipamentos?.[id]
                );

              const selecionado = quantidade > 0;

              return (
                <div
                  key={id}
                  style={equipamentoCardStyle(
                    selecionado,
                    permiteQuantidade
                  )}
                >
                  <label
                    style={equipamentoCheckStyle}
                  >
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={e =>
                        atualizarEquipamento(
                          id,
                          e.target.checked
                        )
                      }
                    />

                    <span>{label}</span>
                  </label>

                  {selecionado &&
                    permiteQuantidade && (
                      <div
                        className="campo"
                        style={{ margin: 0 }}
                      >
                        <label
                          style={{
                            fontSize: '.78rem'
                          }}
                        >
                          Quantidade
                        </label>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={
                            form.equipamentos?.[
                              id
                            ] ?? 1
                          }
                          onChange={e =>
                            atualizarQuantidadeEquipamento(
                              id,
                              e.target.value
                            )
                          }
                          placeholder="1"
                        />
                      </div>
                    )}
                </div>
              );
            }
          )}
        </div>
      </div>

      <div style={grid3}>
        <div className="campo">
          <label>
            Configuração das cadeiras
          </label>

          <select
            value={form.layoutCadeiras}
            onChange={e =>
              atualizar(
                'layoutCadeiras',
                e.target.value
              )
            }
          >
            <option value="">Selecione</option>

            <option value="auditorio">
              Formato auditório
            </option>

            <option value="u">
              Formato em U
            </option>
          </select>
        </div>

        <div className="campo">
          <label>
            Haverá necessidade de mesas?
          </label>

          <select
            value={form.mesas}
            onChange={e =>
              atualizar('mesas', e.target.value)
            }
          >
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
              onChange={e =>
                atualizar(
                  'qtdMesas',
                  e.target.value
                )
              }
            />
          </div>
        )}
      </div>

      <div className="campo">
        <label>
          Acessibilidade e demandas específicas
        </label>

        <textarea
          value={form.acessibilidade}
          onChange={e =>
            atualizar(
              'acessibilidade',
              e.target.value
            )
          }
          rows={3}
        />
      </div>

      <div className="campo">
        <label>Coffee Break</label>

        <select
          value={form.coffee || 'nao'}
          onChange={e =>
            atualizar('coffee', e.target.value)
          }
        >
          <option value="nao">Não</option>
          <option value="sim">Sim</option>
        </select>
      </div>

      <div className="campo">
        <label>Convidados especiais</label>

        <textarea
          value={form.convidadosEspeciais}
          onChange={e =>
            atualizar(
              'convidadosEspeciais',
              e.target.value
            )
          }
          rows={3}
        />
      </div>

      {mostrarObservacoes && (
        <div className="campo">
          <label>{rotuloObservacoes}</label>

          <textarea
            value={form.observacoes}
            onChange={e =>
              atualizar(
                'observacoes',
                e.target.value
              )
            }
            placeholder={placeholderObservacoes}
            rows={4}
          />
        </div>
      )}

      {mostrarStatus && (
        <div
          className="campo"
          style={{ maxWidth: 320 }}
        >
          <label>Status</label>

          <select
            value={form.status}
            onChange={e =>
              atualizar('status', e.target.value)
            }
          >
            {STATUS.map(status => (
              <option
                key={status}
                value={status}
              >
                {status.charAt(0).toUpperCase() +
                  status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

const sectionStyle = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#EA5B23',
  borderBottom: '1.5px solid #EA5B23',
  paddingBottom: 6,
  marginBottom: 16,
  marginTop: 24,
  textTransform: 'uppercase',
  letterSpacing: '.4px'
};

const equipamentosGrid = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  marginTop: 8
};

const equipamentoCheckStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: 0,
  cursor: 'pointer'
};

function equipamentoCardStyle(
  selecionado,
  permiteQuantidade
) {
  return {
    display: 'grid',
    gap: 12,
    alignContent: 'start',
    minHeight:
      selecionado && permiteQuantidade
        ? 126
        : 52,
    padding: '14px 16px',
    border: selecionado
      ? '1.5px solid #EA5B23'
      : '1px solid var(--cinza-200, #e5e7eb)',
    borderRadius: 10,
    background: selecionado
      ? '#FFF8F5'
      : '#fff'
  };
}

const grid2 = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 16
};

const grid3 = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(230px, 1fr))',
  gap: 16
};

const turnoGrid = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 12,
  marginTop: 8
};

const turnosCardsGrid = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(230px, 1fr))',
  gap: 16,
  marginBottom: 8
};

const turnoCardStyle = {
  border:
    '1px solid var(--cinza-200, #e5e7eb)',
  borderRadius: 10,
  padding: 16,
  background: '#fafafa'
};

function turnoStyle(selected) {
  return {
    border: selected
      ? '1.5px solid #EA5B23'
      : '1.5px solid #ddd',
    background: selected
      ? '#FFF5F1'
      : '#fff',
    color: '#333',
    borderRadius: 8,
    padding: '12px 14px',
    cursor: 'pointer',
    fontWeight: 600,
    textAlign: 'left'
  };
}