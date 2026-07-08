// pages/admin/Usuarios.jsx

import { useEffect, useMemo, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { Badge, Spinner, fmtData } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../api';
import { escolasRegioes } from '../../data/escolasRegioes';

function mascaraCPF(v) {
  return v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function mascaraTel(v) {
  v = v.replace(/\D/g, '').substring(0, 11);

  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }

  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function normalizarTexto(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizarRegiao(v) {
  return normalizarTexto(v)
    .replace(/^ZONA\s+/, '')
    .replace(/^REGIAO\s+/, '')
    .replace(/^REGIÃO\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function encontrarRegiaoId(nomeRegiao, listaRegioes) {
  if (!nomeRegiao || !Array.isArray(listaRegioes)) {
    return '';
  }

  const alvoOriginal = normalizarTexto(nomeRegiao);
  const alvoSimplificado = normalizarRegiao(nomeRegiao);

  const regiaoExata = listaRegioes.find(r => {
    return normalizarTexto(r.nome) === alvoOriginal;
  });

  if (regiaoExata) {
    return String(regiaoExata.id);
  }

  const regiaoSimplificada = listaRegioes.find(r => {
    return normalizarRegiao(r.nome) === alvoSimplificado;
  });

  if (regiaoSimplificada) {
    return String(regiaoSimplificada.id);
  }

  return '';
}

function Modal({ titulo, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--branco)',
          borderRadius: 'var(--raio-lg)',
          padding: 32,
          width: '100%',
          maxWidth: 640,
          boxShadow: '0 8px 40px rgba(0,0,0,.18)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            {titulo}
          </h3>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              color: 'var(--cinza-500)'
            }}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ModalCriarUsuario({
  regioes = [],
  escolasDisponiveis = [],
  onClose,
  onSuccess
}) {
  const toast = useToast();

  const [form, setForm] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    escola: '',
    regiao: '',
    regiao_id: '',
    tipo_usuario: 'participante',
    senha: ''
  });

  const [salvando, setSalvando] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function selecionarEscola(nomeEscola) {
    const item = escolasDisponiveis.find(e => e.escola === nomeEscola);

    const regiaoNome = item?.regiao || '';
    const regiaoId = encontrarRegiaoId(regiaoNome, regioes);

    setForm(f => ({
      ...f,
      escola: nomeEscola,
      regiao: regiaoNome,
      regiao_id: regiaoId
    }));
  }

  async function salvar() {
    if (
      !form.nome_completo ||
      !form.email ||
      !form.cpf ||
      !form.senha ||
      !form.tipo_usuario
    ) {
      return toast('Preencha todos os campos obrigatórios.', 'erro');
    }

    if (form.tipo_usuario === 'participante' && !form.escola) {
      return toast('Selecione a escola do participante.', 'erro');
    }

    if (form.tipo_usuario === 'participante' && !form.regiao) {
      return toast('A região da escola não foi encontrada no CSV.', 'erro');
    }

    if (form.senha.length < 8) {
      return toast('A senha deve ter ao menos 8 caracteres.', 'erro');
    }

    setSalvando(true);

    try {
      const payload = {
        nome_completo: form.nome_completo.trim(),
        email: form.email.trim(),
        cpf: form.cpf,
        telefone: form.telefone || null,
        data_nascimento: form.data_nascimento || null,

        regiao_id:
          form.tipo_usuario === 'participante' && form.regiao_id
            ? Number(form.regiao_id)
            : null,

        regiao_nome:
          form.tipo_usuario === 'participante'
            ? form.regiao
            : null,

        tipo_usuario: form.tipo_usuario,
        senha: form.senha,
        primeiro_acesso: form.tipo_usuario === 'equipe'
      };

      await api.post('/usuarios', payload);

      const nomesTipos = {
        admin: 'Admin',
        coordenador: 'Coordenador',
        equipe: 'Equipe',
        participante: 'Participante'
      };

      if (form.tipo_usuario === 'equipe') {
        toast(
          'Equipe criada com sucesso! Informe a senha provisória. No primeiro acesso, o usuário deverá criar uma nova senha.',
          'aviso'
        );
      } else {
        toast(
          `${nomesTipos[form.tipo_usuario] || 'Usuário'} criado com sucesso!`,
          'sucesso'
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro completo ao criar usuário:', err.response?.data || err);

      toast(
        err.response?.data?.erro ||
        err.response?.data?.message ||
        'Erro ao criar usuário.',
        'erro'
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo="➕ Criar Usuário" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Nome completo *</label>
          <input
            value={form.nome_completo}
            onChange={e => set('nome_completo', e.target.value)}
            placeholder="Nome completo"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="campo" style={{ marginBottom: 0 }}>
            <label>E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <label>CPF *</label>
            <input
              value={form.cpf}
              maxLength={14}
              onChange={e => set('cpf', mascaraCPF(e.target.value))}
              placeholder="000.000.000-00"
            />
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Telefone</label>
            <input
              value={form.telefone}
              maxLength={15}
              onChange={e => set('telefone', mascaraTel(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="campo" style={{ marginBottom: 0 }}>
            <label>Data de nascimento</label>
            <input
              type="date"
              value={form.data_nascimento}
              onChange={e => set('data_nascimento', e.target.value)}
            />
          </div>
        </div>

        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Tipo de usuário *</label>
          <select
            value={form.tipo_usuario}
            onChange={e => {
              const novoTipo = e.target.value;

              setForm(f => ({
                ...f,
                tipo_usuario: novoTipo,
                escola: novoTipo === 'participante' ? f.escola : '',
                regiao: novoTipo === 'participante' ? f.regiao : '',
                regiao_id: novoTipo === 'participante' ? f.regiao_id : ''
              }));
            }}
          >
            <option value="participante">Participante</option>
            <option value="equipe">Equipe</option>
            <option value="coordenador">Coordenador</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {form.tipo_usuario === 'participante' && (
          <>
            <div className="campo" style={{ marginBottom: 0 }}>
              <label>Escola do participante *</label>
              <select
                value={form.escola}
                onChange={e => selecionarEscola(e.target.value)}
              >
                <option value="">Selecione uma escola</option>

                {escolasDisponiveis.map(item => (
                  <option key={item.escola} value={item.escola}>
                    {item.escola}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo" style={{ marginBottom: 0 }}>
              <label>Região</label>
              <input
                type="text"
                value={form.regiao}
                disabled
                placeholder="A região será preenchida automaticamente"
              />
            </div>
          </>
        )}

        {form.tipo_usuario === 'equipe' && (
          <div
            style={{
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 10,
              padding: 12,
              fontSize: '.86rem',
              color: '#8a5a00',
              lineHeight: 1.45
            }}
          >
            Este usuário será criado com <strong>primeiro acesso obrigatório</strong>.
            A senha abaixo será provisória e deverá ser alterada no primeiro login.
          </div>
        )}

        <div className="campo" style={{ marginBottom: 0 }}>
          <label>
            {form.tipo_usuario === 'equipe'
              ? 'Senha provisória *'
              : 'Senha inicial *'}
          </label>

          <input
            type="password"
            value={form.senha}
            onChange={e => set('senha', e.target.value)}
            placeholder={
              form.tipo_usuario === 'equipe'
                ? 'Senha provisória para o primeiro login'
                : 'Mínimo 8 caracteres'
            }
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            marginTop: 8
          }}
        >
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            className="btn btn-primario"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Salvando…' : 'Criar Usuário'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModalInscreverParticipante({
  participanteId,
  participanteNome,
  formacoes,
  onClose,
  onSuccess
}) {
  const toast = useToast();
  const [formacaoId, setFormacaoId] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function inscrever() {
    if (!formacaoId) return toast('Selecione uma formação.', 'erro');

    setSalvando(true);

    try {
      await api.post('/inscricoes/admin', {
        usuario_id: participanteId,
        formacao_id: formacaoId
      });

      toast(`${participanteNome} inscrito com sucesso!`, 'sucesso');
      onSuccess();
      onClose();
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao inscrever.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={`📋 Inscrever: ${participanteNome}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="campo" style={{ marginBottom: 0 }}>
          <label>Selecionar Formação *</label>

          <select value={formacaoId} onChange={e => setFormacaoId(e.target.value)}>
            <option value="">Escolha uma formação aberta</option>

            {formacoes
              .filter(f => f.status === 'aberta')
              .map(f => (
                <option key={f.id} value={f.id}>
                  {f.titulo}
                  {f.regiao_nome ? ` - ${f.regiao_nome}` : ''}
                  {` (${f.vagas_disponiveis ?? '?'} vagas)`}
                </option>
              ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            className="btn btn-primario"
            onClick={inscrever}
            disabled={salvando}
          >
            {salvando ? 'Inscrevendo…' : 'Confirmar Inscrição'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminUsuarios() {
  const toast = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [formacoes, setFormacoes] = useState([]);
  const [regioes, setRegioes] = useState([]);

  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [regiaoFiltro, setRegiaoFiltro] = useState('');

  const [loading, setLoading] = useState(true);
  const [modalCriar, setModalCriar] = useState(false);
  const [modalInscr, setModalInscr] = useState(null);

  const escolasDisponiveis = useMemo(() => {
    return Array.from(
      new Map(
        escolasRegioes
          .filter(item => item.escola && item.regiao)
          .map(item => [
            normalizarTexto(item.escola),
            {
              escola: String(item.escola).trim(),
              regiao: String(item.regiao).trim()
            }
          ])
      ).values()
    ).sort((a, b) => a.escola.localeCompare(b.escola, 'pt-BR'));
  }, []);

  async function carregar(
    p = 1,
    filtros = {
      buscaAtual: busca,
      tipoAtual: tipo,
      regiaoAtual: regiaoFiltro
    }
  ) {
    setLoading(true);

    try {
      const q = new URLSearchParams();

      if (filtros.buscaAtual) q.set('busca', filtros.buscaAtual);
      if (filtros.tipoAtual) q.set('tipo', filtros.tipoAtual);
      if (filtros.regiaoAtual) q.set('regiao_id', filtros.regiaoAtual);

      q.set('p', p);

      const [uRes, fRes, rRes] = await Promise.all([
        api.get('/usuarios?' + q.toString()),
        api.get('/formacoes'),
        api.get('/regioes')
      ]);

      setUsuarios(uRes.data.data || []);
      setTotal(uRes.data.total || 0);
      setTotalPaginas(uRes.data.totalPaginas || 1);
      setPagina(p);
      setFormacoes(fRes.data.data || []);
      setRegioes(rRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      toast('Erro ao carregar.', 'erro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus(id) {
    try {
      await api.put('/usuarios/' + id + '/toggle-status');
      toast('Status atualizado.', 'sucesso');
      carregar(pagina);
    } catch {
      toast('Erro ao atualizar.', 'erro');
    }
  }

  async function resetarSenha(id) {
    if (
      !confirm(
        'Resetar a senha? O usuário precisará redefinir a senha no próximo acesso.'
      )
    ) {
      return;
    }

    try {
      const { data } = await api.put('/usuarios/' + id + '/resetar-senha');
      toast(
        'Nova senha provisória: ' + data.novaSenha + ' — informe ao usuário.',
        'aviso'
      );
      carregar(pagina);
    } catch {
      toast('Erro ao resetar.', 'erro');
    }
  }

  async function excluirUsuario(id, nome) {
    const confirmar = confirm(
      `Tem certeza que deseja excluir o usuário "${nome}"?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmar) return;

    try {
      await api.delete('/usuarios/' + id);
      toast('Usuário excluído com sucesso.', 'sucesso');

      const proximaPagina =
        usuarios.length === 1 && pagina > 1 ? pagina - 1 : pagina;

      carregar(proximaPagina);
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao excluir usuário.', 'erro');
    }
  }

  function limparFiltros() {
    setBusca('');
    setTipo('');
    setRegiaoFiltro('');

    carregar(1, {
      buscaAtual: '',
      tipoAtual: '',
      regiaoAtual: ''
    });
  }

  return (
    <PainelLayout titulo="Usuários">
      <div className="d-flex align-center justify-between mb-24 flex-wrap gap-16">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Gerenciar Usuários
          </h2>

          <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
            {total} usuário(s)
          </p>
        </div>

        <button className="btn btn-primario" onClick={() => setModalCriar(true)}>
          ➕ Criar Usuário
        </button>
      </div>

      <div className="card mb-24">
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'flex-end'
          }}
        >
          <div className="campo" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label>Buscar</label>
            <input
              type="text"
              placeholder="Nome, e-mail ou CPF..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && carregar(1)}
            />
          </div>

          <div className="campo" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="">Todos</option>
              <option value="admin">Admin</option>
              <option value="coordenador">Coordenador</option>
              <option value="equipe">Equipe</option>
              <option value="participante">Participante</option>
            </select>
          </div>

          <div className="campo" style={{ marginBottom: 0, minWidth: 190 }}>
            <label>Região</label>
            <select
              value={regiaoFiltro}
              onChange={e => setRegiaoFiltro(e.target.value)}
            >
              <option value="">Todas</option>

              {regioes.map(regiao => (
                <option key={regiao.id} value={regiao.id}>
                  {regiao.nome}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primario" onClick={() => carregar(1)}>
            Filtrar
          </button>

          <button className="btn btn-outline" onClick={limparFiltros}>
            Limpar
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : usuarios.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">👥</div>
          <p>Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <>
          <div className="card p-0">
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>CPF</th>
                    <th>Tipo</th>
                    <th>Região</th>
                    <th>Primeiro acesso</th>
                    <th>Status</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {usuarios.map(u => (
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

                      <td>
                        <Badge status={u.tipo_usuario} />
                      </td>

                      <td style={{ fontSize: '.83rem' }}>
                        {u.regiao_nome || '—'}
                      </td>

                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '.82rem',
                            color: u.primeiro_acesso ? '#b26a00' : 'var(--verde)'
                          }}
                        >
                          {u.primeiro_acesso ? 'Pendente' : 'Concluído'}
                        </span>
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

                      <td style={{ fontSize: '.82rem' }}>
                        {fmtData(u.data_cadastro)}
                      </td>

                      <td>
                        {u.tipo_usuario !== 'admin' && (
                          <div className="d-flex gap-8 flex-wrap">
                            <button
                              className={
                                'btn btn-sm ' +
                                (u.status ? 'btn-outline' : 'btn-secundario')
                              }
                              onClick={() => toggleStatus(u.id)}
                            >
                              {u.status ? '🔴 Desativar' : '🟢 Ativar'}
                            </button>

                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => resetarSenha(u.id)}
                              title="Resetar senha"
                            >
                              🔑
                            </button>

                            {u.tipo_usuario === 'participante' && u.status === 1 && (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() =>
                                  setModalInscr({
                                    id: u.id,
                                    nome: u.nome_completo
                                  })
                                }
                              >
                                📋 Inscrever
                              </button>
                            )}

                            <button
                              className="btn btn-sm"
                              onClick={() => excluirUsuario(u.id, u.nome_completo)}
                              style={{
                                background: 'var(--cor-perigo)',
                                color: 'white',
                                border: '1px solid var(--cor-perigo)'
                              }}
                            >
                              🗑 Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPaginas > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'center',
                marginTop: 20,
                flexWrap: 'wrap'
              }}
            >
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={
                    'btn btn-sm ' + (p === pagina ? 'btn-primario' : 'btn-outline')
                  }
                  onClick={() => carregar(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {modalCriar && (
        <ModalCriarUsuario
          regioes={regioes}
          escolasDisponiveis={escolasDisponiveis}
          onClose={() => setModalCriar(false)}
          onSuccess={() => carregar(pagina)}
        />
      )}

      {modalInscr && (
        <ModalInscreverParticipante
          participanteId={modalInscr.id}
          participanteNome={modalInscr.nome}
          formacoes={formacoes}
          onClose={() => setModalInscr(null)}
          onSuccess={() => carregar(pagina)}
        />
      )}
    </PainelLayout>
  );
}