import { useEffect, useMemo, useRef, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData, fmtPct } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

function carregarScript(src, verificarGlobal) {
  return new Promise((resolve, reject) => {
    if (verificarGlobal()) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar: ${src}`));
    document.head.appendChild(script);
  });
}

async function carregarBibliotecasPDF() {
  await carregarScript(
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    () => window.html2canvas
  );

  await carregarScript(
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    () => window.jspdf?.jsPDF
  );

  return {
    html2canvas: window.html2canvas,
    jsPDF: window.jspdf.jsPDF
  };
}

function timestampArquivo() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizarTexto(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function textoPessoa(qtd) {
  const total = Number(qtd || 0);
  return total === 1 ? '1 pessoa' : `${total} pessoas`;
}

function textoAcesso(qtd) {
  const total = Number(qtd || 0);
  return total === 1 ? '1 pessoa acessou' : `${total} pessoas acessaram`;
}

function organizarPessoasPorRegiao(lista = []) {
  const mapa = new Map();

  lista.forEach(item => {
    const nomeRegiao = String(item.regiao || 'Sem região').trim();
    const chave = normalizarTexto(nomeRegiao);

    const anterior = mapa.get(chave);

    if (anterior) {
      mapa.set(chave, {
        regiao: anterior.regiao,
        pessoas: Number(anterior.pessoas || 0) + Number(item.pessoas || 0)
      });
    } else {
      mapa.set(chave, {
        regiao: nomeRegiao,
        pessoas: Number(item.pessoas || 0)
      });
    }
  });

  return Array.from(mapa.values()).sort((a, b) => {
    const pessoasA = Number(a.pessoas || 0);
    const pessoasB = Number(b.pessoas || 0);

    if (pessoasB !== pessoasA) return pessoasB - pessoasA;

    return a.regiao.localeCompare(b.regiao, 'pt-BR');
  });
}

function criarEstiloPDFUmaPagina() {
  const style = document.createElement('style');
  style.id = '__pdf_estilo_uma_pagina__';

  style.innerHTML = `
    .pdf-uma-pagina {
      width: 1120px !important;
      background: #ffffff !important;
      color: #111827 !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      opacity: 1 !important;
      filter: none !important;
    }

    .pdf-uma-pagina * {
      box-sizing: border-box !important;
      opacity: 1 !important;
      filter: none !important;
    }

    .pdf-uma-pagina .mb-24 {
      margin-bottom: 8px !important;
    }

    .pdf-uma-pagina .stats-grid {
      display: grid !important;
      grid-template-columns: repeat(5, 1fr) !important;
      gap: 10px !important;
      margin-bottom: 8px !important;
    }

    .pdf-uma-pagina .stat-card {
      min-height: 64px !important;
      padding: 12px 14px !important;
      background: #ffffff !important;
      box-shadow: none !important;
      border: 1.5px solid #d1d5db !important;
      border-radius: 10px !important;
      opacity: 1 !important;
    }

    .pdf-uma-pagina .stat-card > div {
      opacity: 1 !important;
    }

    .pdf-uma-pagina .stat-icone {
      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;
      min-height: 40px !important;
      font-size: 20px !important;
      border-radius: 10px !important;
      opacity: 1 !important;
      color: #111827 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .pdf-uma-pagina .stat-icone.laranja {
      background: #ffedd5 !important;
      color: #c2410c !important;
      border: 1px solid #fed7aa !important;
    }

    .pdf-uma-pagina .stat-icone.verde {
      background: #dcfce7 !important;
      color: #166534 !important;
      border: 1px solid #bbf7d0 !important;
    }

    .pdf-uma-pagina .stat-icone.amarelo {
      background: #fef3c7 !important;
      color: #92400e !important;
      border: 1px solid #fde68a !important;
    }

    .pdf-uma-pagina .stat-valor {
      font-size: 26px !important;
      line-height: 1 !important;
      font-weight: 900 !important;
      color: #111827 !important;
      opacity: 1 !important;
    }

    .pdf-uma-pagina .stat-label {
      font-size: 12px !important;
      line-height: 1.15 !important;
      font-weight: 700 !important;
      color: #374151 !important;
      opacity: 1 !important;
    }

    .pdf-uma-pagina .card {
      padding: 10px 12px !important;
      margin-bottom: 8px !important;
      background: #ffffff !important;
      box-shadow: none !important;
      border: 1px solid #d1d5db !important;
      border-radius: 10px !important;
      opacity: 1 !important;
    }

    .pdf-uma-pagina .card-titulo {
      font-size: 14px !important;
      margin-bottom: 8px !important;
      padding-bottom: 6px !important;
      line-height: 1.2 !important;
      color: #111827 !important;
      font-weight: 800 !important;
    }

    .pdf-uma-pagina .card-titulo .icone {
      font-size: 16px !important;
    }

    .pdf-uma-pagina .card-titulo-com-total {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
    }

    .pdf-uma-pagina .card-titulo-com-total > div {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    .pdf-uma-pagina .card-total-regioes {
      background: #ffedd5 !important;
      color: #c2410c !important;
      border: 1px solid #fed7aa !important;
      font-size: 10px !important;
      font-weight: 800 !important;
      padding: 4px 8px !important;
      border-radius: 999px !important;
      white-space: nowrap !important;
    }

    .pdf-uma-pagina .grid-pdf-duas-colunas {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      margin-bottom: 8px !important;
    }

    .pdf-uma-pagina .progress-bar {
      height: 7px !important;
      background: #e5e7eb !important;
    }

    .pdf-uma-pagina .progress-fill {
      height: 7px !important;
    }

    .pdf-uma-pagina .vazio {
      padding: 8px !important;
    }

    .pdf-uma-pagina .linha-pessoas-regiao {
      padding: 7px 0 !important;
    }

    .pdf-uma-pagina .linha-top-formacao {
      padding: 6px 0 !important;
    }

    .pdf-uma-pagina .linha-status {
      margin-bottom: 6px !important;
    }

    .pdf-uma-pagina table {
      font-size: 9px !important;
    }

    .pdf-uma-pagina th,
    .pdf-uma-pagina td {
      padding: 3px 5px !important;
    }

    .pdf-uma-pagina #__pdf-cabecalho__ {
      padding-bottom: 8px !important;
      margin-bottom: 8px !important;
    }
  `;

  return style;
}

export default function EquipeRelatorios() {
  const { user } = useAuth();

  const hoje = new Date().toISOString().slice(0, 10);
  const inicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [formacoes, setFormacoes] = useState([]);
  const [formacaoSel, setFormacaoSel] = useState('');
  const [dataInicio, setDataInicio] = useState(inicio);
  const [dataFim, setDataFim] = useState(hoje);
  const [rel, setRel] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({});
  const [pessoasRegiaoDados, setPessoasRegiaoDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);

  const relatorioRef = useRef(null);

  useEffect(() => {
    api.get('/formacoes')
      .then(r => setFormacoes(r.data.data || []))
      .catch(() => setFormacoes([]));
  }, []);

  async function gerar(e) {
    if (e) e.preventDefault();

    setLoading(true);

    try {
      const q = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
        formacao_id: formacaoSel
      }).toString();

      const { data } = await api.get('/relatorios?' + q);
      setRel(data.data);

      try {
        const dash = await api.get('/usuarios/dashboard');

        const dadosDashboard = dash.data.data || {};

        setDashboardStats(dadosDashboard);
        setPessoasRegiaoDados(dadosDashboard.acessos_por_regiao || []);
      } catch (errDash) {
        console.error('Erro ao carregar dados do dashboard:', errDash);
        setDashboardStats({});
        setPessoasRegiaoDados([]);
      }
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      setRel(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    gerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportarPDF() {
    if (!relatorioRef.current) return;

    setExportando(true);

    const elemento = relatorioRef.current;
    const estiloPDF = criarEstiloPDFUmaPagina();

    try {
      const { html2canvas, jsPDF } = await carregarBibliotecasPDF();

      const nomeFormacao = formacaoSel
        ? formacoes.find(f => String(f.id) === String(formacaoSel))?.titulo || 'formacao'
        : 'todas';

      const cabecalho = document.createElement('div');
      cabecalho.id = '__pdf-cabecalho__';
      cabecalho.style.cssText =
        'font-family:Arial,sans-serif;padding:0 0 10px 0;border-bottom:2px solid #1e3a5f;margin-bottom:10px;';

      cabecalho.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:18px;font-weight:700;color:#1e3a5f;">
              Relatório de Formações
            </div>
            <div style="font-size:11px;color:#555;margin-top:2px;">
              Período: ${dataInicio} a ${dataFim}
              ${formacaoSel ? ` &nbsp;·&nbsp; Formação: ${nomeFormacao}` : ''}
            </div>
          </div>

          <div style="font-size:10px;color:#888;text-align:right;">
            Exportado em ${new Date().toLocaleString('pt-BR')}<br/>
            Por: ${user?.nome || user?.nome_completo || user?.email || ''}
          </div>
        </div>
      `;

      document.head.appendChild(estiloPDF);
      elemento.classList.add('pdf-uma-pagina');
      elemento.prepend(cabecalho);

      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const larguraPagina = pdf.internal.pageSize.getWidth();
      const alturaPagina = pdf.internal.pageSize.getHeight();

      const margem = 5;
      const larguraMaxima = larguraPagina - margem * 2;
      const alturaMaxima = alturaPagina - margem * 2;

      const proporcao = Math.min(
        larguraMaxima / canvas.width,
        alturaMaxima / canvas.height
      );

      const larguraImagem = canvas.width * proporcao;
      const alturaImagem = canvas.height * proporcao;

      const x = (larguraPagina - larguraImagem) / 2;
      const y = (alturaPagina - alturaImagem) / 2;

      pdf.addImage(
        imgData,
        'PNG',
        x,
        y,
        larguraImagem,
        alturaImagem,
        undefined,
        'FAST'
      );

      pdf.save(`relatorio_equipe_${timestampArquivo()}.pdf`);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Não foi possível gerar o PDF. Verifique sua conexão e tente novamente.');
    } finally {
      document.getElementById('__pdf-cabecalho__')?.remove();
      document.getElementById('__pdf_estilo_uma_pagina__')?.remove();
      elemento.classList.remove('pdf-uma-pagina');
      setExportando(false);
    }
  }

  const ep = rel?.estatsPeriodo || {};
  const total = rel?.distStatus?.reduce((a, b) => a + Number(b.total), 0) || 0;

  const pessoasPorRegiao = useMemo(() => {
    return organizarPessoasPorRegiao(pessoasRegiaoDados);
  }, [pessoasRegiaoDados]);

  const totalPessoasPorRegiao = useMemo(() => {
    return pessoasPorRegiao.reduce(
      (acc, item) => acc + Number(item.pessoas || 0),
      0
    );
  }, [pessoasPorRegiao]);

  const sucessoFormacoes = useMemo(() => {
    const lista = rel?.topFormacoes || [];

    const vagasOfertadas = lista.reduce(
      (acc, item) => acc + Number(item.vagas || 0),
      0
    );

    const vagasOcupadas = lista.reduce(
      (acc, item) => acc + Number(item.total_inscritos || 0),
      0
    );

    return vagasOfertadas > 0
      ? Math.round((vagasOcupadas / vagasOfertadas) * 100)
      : 0;
  }, [rel]);

  return (
    <PainelLayout titulo="Relatórios">
      <div className="card mb-24">
        <form
          onSubmit={gerar}
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-end'
          }}
        >
          <div className="campo" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Data Inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
            />
          </div>

          <div className="campo" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Data Final</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
            />
          </div>

          <div className="campo" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
            <label>Filtrar por Formação (opcional)</label>
            <select
              value={formacaoSel}
              onChange={e => setFormacaoSel(e.target.value)}
            >
              <option value="">Todas</option>

              {formacoes.map(f => (
                <option key={f.id} value={f.id}>
                  {f.titulo}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
              marginLeft: 'auto'
            }}
          >
            <button type="submit" className="btn btn-primario">
              Gerar Relatório
            </button>

            {rel && (
              <button
                type="button"
                className="btn btn-secundario"
                onClick={exportarPDF}
                disabled={exportando || loading}
                title="Exportar relatório atual em PDF"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {exportando ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite'
                      }}
                    />
                    Exportando…
                  </>
                ) : (
                  <>📄 Exportar PDF</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {loading ? (
        <Spinner />
      ) : rel ? (
        <div ref={relatorioRef}>
          <div className="stats-grid mb-24">
            {[
              {
                icon: '📋',
                valor: ep.inscricoes || 0,
                label: 'Inscrições no Período',
                cor: 'laranja'
              },
              {
                icon: '👥',
                valor: ep.participantes || 0,
                label: 'Participantes Únicos',
                cor: 'verde'
              },
              {
                icon: '📚',
                valor: ep.formacoes || 0,
                label: 'Formações com Inscrição',
                cor: 'amarelo'
              },
              {
                icon: '📖',
                valor: dashboardStats.totalItensBiblioteca || 0,
                label: 'Itens da Biblioteca',
                cor: 'verde'
              },
              {
                icon: '🎯',
                valor: `${sucessoFormacoes}%`,
                label: 'Taxa de Sucesso',
                cor: sucessoFormacoes >= 75
                  ? 'verde'
                  : sucessoFormacoes >= 50
                    ? 'amarelo'
                    : 'laranja'
              }
            ].map(c => (
              <div key={c.label} className="stat-card animar-entrada">
                <div className={`stat-icone ${c.cor}`}>
                  {c.icon}
                </div>

                <div>
                  <div className="stat-valor">
                    {c.valor}
                  </div>

                  <div className="stat-label">
                    {c.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card mb-24">
            <div className="card-titulo card-titulo-com-total">
              <div>
                <span className="icone">🗺️</span>
                Pessoas por Zona/Região
              </div>

              <span className="card-total-regioes">
                {textoPessoa(totalPessoasPorRegiao)}
              </span>
            </div>

            {pessoasPorRegiao.length === 0 ? (
              <div className="vazio compacto">
                <p>Nenhuma pessoa por região encontrada.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pessoasPorRegiao.map(item => {
                  const pessoas = Number(item.pessoas || 0);

                  const percentual = totalPessoasPorRegiao > 0
                    ? Math.round((pessoas / totalPessoasPorRegiao) * 100)
                    : 0;

                  return (
                    <div
                      key={normalizarTexto(item.regiao)}
                      className="linha-pessoas-regiao"
                      style={{
                        padding: '12px 0',
                        borderBottom: '1px solid var(--cinza-200)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 16,
                          marginBottom: 6
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '.92rem' }}>
                            {item.regiao}
                          </strong>

                          <div style={{ fontSize: '.78rem', color: 'var(--cinza-500)' }}>
                            {textoAcesso(pessoas)}
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: 800,
                            color: 'var(--laranja)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {textoPessoa(pessoas)} • {percentual}%
                        </div>
                      </div>

                      <div className="progress-bar">
                        <div
                          className="progress-fill medio"
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid-pdf-duas-colunas">
            <div className="card">
              <div className="card-titulo">
                <span className="icone">📈</span>
                Formações Mais Procuradas
              </div>

              {rel.topFormacoes?.length === 0 ? (
                <div className="vazio">
                  <p>Nenhum dado.</p>
                </div>
              ) : (
                rel.topFormacoes?.map(tf => {
                  const pct = tf.vagas > 0
                    ? Math.round((tf.total_inscritos / tf.vagas) * 100)
                    : 0;

                  return (
                    <div
                      key={tf.titulo}
                      className="linha-top-formacao"
                      style={{
                        padding: '10px 0',
                        borderBottom: '1px solid var(--cinza-200)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '.88rem',
                            maxWidth: 240
                          }}
                        >
                          {tf.titulo}
                        </span>

                        <span
                          style={{
                            fontSize: '.85rem',
                            color: 'var(--cinza-600)'
                          }}
                        >
                          {tf.total_inscritos} inscr.
                        </span>
                      </div>

                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${pct >= 75 ? 'alto' : 'medio'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="card">
              <div className="card-titulo">
                <span className="icone">📊</span>
                Distribuição por Status
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginTop: 8
                }}
              >
                {rel.distStatus?.map(ds => {
                  const pct = total > 0
                    ? Math.round((Number(ds.total) / total) * 100)
                    : 0;

                  return (
                    <div key={ds.status} className="linha-status">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4
                        }}
                      >
                        <Badge status={ds.status} />

                        <span style={{ fontWeight: 700 }}>
                          {ds.total}{' '}
                          <span
                            style={{
                              color: 'var(--cinza-500)',
                              fontWeight: 400
                            }}
                          >
                            ({pct}%)
                          </span>
                        </span>
                      </div>

                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${
                            ds.status === 'concluida'
                              ? 'alto'
                              : ds.status === 'aberta'
                                ? 'medio'
                                : 'baixo'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {formacaoSel && rel.relInscricoes?.length > 0 && (
            <div className="card p-0">
              <div
                className="card-titulo p-24"
                style={{
                  marginBottom: 0,
                  borderRadius: 'var(--raio-lg) var(--raio-lg) 0 0'
                }}
              >
                <span className="icone">📋</span>
                Participantes da Formação

                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '.82rem',
                    color: 'var(--cinza-500)'
                  }}
                >
                  {rel.relInscricoes.length} participante(s)
                </span>
              </div>

              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>CPF</th>
                      <th>E-mail</th>
                      <th>Telefone</th>
                      <th>Inscrição</th>
                      <th>Status</th>
                      <th>Frequência</th>
                      <th>Certificado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rel.relInscricoes.map(ri => {
                      const pct = fmtPct(ri.presentes, ri.total_aulas);

                      return (
                        <tr key={ri.cpf}>
                          <td style={{ fontWeight: 600 }}>
                            {ri.nome_completo}
                          </td>

                          <td style={{ fontSize: '.83rem' }}>
                            {ri.cpf}
                          </td>

                          <td style={{ fontSize: '.83rem' }}>
                            {ri.email}
                          </td>

                          <td style={{ fontSize: '.83rem' }}>
                            {ri.telefone || '—'}
                          </td>

                          <td style={{ fontSize: '.83rem' }}>
                            {fmtData(ri.data_inscricao)}
                          </td>

                          <td>
                            <Badge status={ri.status} />
                          </td>

                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                color: pct >= 75 ? 'var(--verde)' : 'var(--cor-perigo)'
                              }}
                            >
                              {pct}%
                            </span>{' '}

                            <span
                              style={{
                                fontSize: '.75rem',
                                color: 'var(--cinza-500)'
                              }}
                            >
                              ({ri.presentes}/{ri.total_aulas})
                            </span>
                          </td>

                          <td>
                            {ri.codigo_validacao ? (
                              <span
                                style={{
                                  fontSize: '.75rem',
                                  fontFamily: 'monospace',
                                  color: 'var(--verde)'
                                }}
                              >
                                ✅ {ri.codigo_validacao}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--cinza-400)' }}>
                                —
                              </span>
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
        </div>
      ) : (
        <div className="vazio">
          <div className="vazio-icone">📊</div>
          <p>Nenhum relatório encontrado.</p>
        </div>
      )}
    </PainelLayout>
  );
}