import { useEffect, useMemo, useState } from 'react';
import PainelLayout from '../../components/PainelLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../api';
import { escolasRegioes } from '../../data/escolasRegioes';

function mascaraTel(v) {
  v = v.replace(/\D/g, '').substring(0, 11);

  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }

  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function dataInput(v) {
  if (!v) return '';
  return String(v).slice(0, 10);
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

export default function PartPerfil() {
  const toast = useToast();

  const [form, setForm] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    escola: '',
    regiao: '',
    regiao_id: ''
  });

  const [senhaForm, setSenhaForm] = useState({
    atual: '',
    nova: '',
    confirma: ''
  });

  const [regioes, setRegioes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);

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

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function encontrarRegiaoId(nomeRegiao, listaRegioes) {
    if (!nomeRegiao || !Array.isArray(listaRegioes)) {
      return '';
    }

    const alvoOriginal = normalizarTexto(nomeRegiao);
    const alvoSimplificado = normalizarRegiao(nomeRegiao);

    const regiaoEncontrada = listaRegioes.find(r => {
      const nomeBancoOriginal = normalizarTexto(r.nome);
      const nomeBancoSimplificado = normalizarRegiao(r.nome);

      return (
        nomeBancoOriginal === alvoOriginal ||
        nomeBancoSimplificado === alvoSimplificado ||
        nomeBancoOriginal.includes(alvoOriginal) ||
        alvoOriginal.includes(nomeBancoOriginal) ||
        nomeBancoSimplificado.includes(alvoSimplificado) ||
        alvoSimplificado.includes(nomeBancoSimplificado)
      );
    });

    return regiaoEncontrada ? String(regiaoEncontrada.id) : '';
  }

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

  useEffect(() => {
    async function carregarDados() {
      try {
        const [meRes, regioesRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/regioes')
        ]);

        const u = meRes.data.user || {};
        const listaRegioes = regioesRes.data.data || [];

        setRegioes(listaRegioes);

        const escolaUsuario = u.escola || '';
        const itemEscola = escolasDisponiveis.find(e => {
          return normalizarTexto(e.escola) === normalizarTexto(escolaUsuario);
        });

        const regiaoNome =
          u.regiao ||
          itemEscola?.regiao ||
          '';

        const regiaoId =
          u.regiao_id
            ? String(u.regiao_id)
            : encontrarRegiaoId(regiaoNome, listaRegioes);

        setForm({
          nome_completo: u.nome_completo || u.nome || '',
          email: u.email || '',
          cpf: u.cpf || '',
          telefone: u.telefone || '',
          data_nascimento: dataInput(u.data_nascimento),
          escola: escolaUsuario,
          regiao: regiaoNome,
          regiao_id: regiaoId
        });
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
        toast('Erro ao carregar dados do perfil.', 'erro');
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, [toast, escolasDisponiveis]);

  async function salvar(e) {
    e.preventDefault();

    if (!form.nome_completo.trim()) {
      toast('Informe o nome completo.', 'erro');
      return;
    }

    if (!form.escola) {
      toast('Selecione sua escola.', 'erro');
      return;
    }

    if (!form.regiao) {
      toast('A região da escola não foi encontrada no CSV.', 'erro');
      return;
    }

    if (!form.regiao_id || Number(form.regiao_id) <= 0) {
      console.log('Escola selecionada:', form.escola);
      console.log('Região encontrada no CSV:', form.regiao);
      console.log('Regiões vindas do banco:', regioes);

      toast(
        'A região da escola existe no CSV, mas não foi encontrada no banco. Verifique se o nome da região no banco está igual ao CSV.',
        'erro'
      );
      return;
    }

    setLoading(true);

    try {
      await api.put('/usuarios/me', {
    nome_completo: form.nome_completo,
    telefone: form.telefone,
    data_nascimento: form.data_nascimento || null,
    regiao_id: form.regiao_id ? Number(form.regiao_id) : null,
    regiao_nome: form.regiao
      });

      toast('Perfil atualizado com sucesso!', 'sucesso');
    } catch (err) {
      console.error('Erro completo ao atualizar perfil:', err.response?.data || err);

      toast(
        err.response?.data?.erro ||
        err.response?.data?.message ||
        'Erro ao atualizar perfil.',
        'erro'
      );
    } finally {
      setLoading(false);
    }
  }

  async function trocarSenha(e) {
    e.preventDefault();

    if (senhaForm.nova.length < 8) {
      toast('Nova senha deve ter ao menos 8 caracteres.', 'erro');
      return;
    }

    if (senhaForm.nova !== senhaForm.confirma) {
      toast('As senhas não conferem.', 'erro');
      return;
    }

    toast('Para trocar a senha, entre em contato com o administrador.', 'aviso');
  }

  return (
    <PainelLayout titulo="Meu Perfil">
      <div className="mb-24">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Meu Perfil</h2>
        <p style={{ color: 'var(--cinza-600)', fontSize: '.88rem' }}>
          Atualize seus dados pessoais
        </p>
      </div>

      {carregando ? (
        <div className="card">
          <p>Carregando dados do perfil...</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            alignItems: 'start'
          }}
        >
          <div className="card">
            <div className="card-titulo">
              <span className="icone">👤</span> Dados Pessoais
            </div>

            <form onSubmit={salvar}>
              <div className="campo">
                <label>Nome Completo</label>
                <input
                  type="text"
                  value={form.nome_completo}
                  onChange={e => set('nome_completo', e.target.value)}
                  required
                />
              </div>

              <div className="campo">
                <label>E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  title="O e-mail não pode ser alterado pelo participante."
                />
              </div>

              <div className="campo">
                <label>CPF</label>
                <input
                  type="text"
                  value={form.cpf}
                  disabled
                  title="O CPF não pode ser alterado pelo participante."
                />
              </div>

              <div className="campo">
                <label>Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  maxLength={15}
                  onChange={e => set('telefone', mascaraTel(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="campo">
                <label>Data de Nascimento</label>
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={e => set('data_nascimento', e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Escola</label>
                <select
                  value={form.escola}
                  onChange={e => selecionarEscola(e.target.value)}
                  required
                >
                  <option value="">Selecione sua escola</option>

                  {escolasDisponiveis.map(item => (
                    <option key={item.escola} value={item.escola}>
                      {item.escola}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label>Região</label>
                <input
                  type="text"
                  value={form.regiao}
                  disabled
                  placeholder="A região será preenchida automaticamente"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primario"
                disabled={loading}
              >
                {loading ? 'Salvando…' : '💾 Salvar Alterações'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-titulo">
              <span className="icone">🔑</span> Segurança
            </div>

            <form onSubmit={trocarSenha}>
              <div className="campo">
                <label>Senha Atual</label>
                <input
                  type="password"
                  value={senhaForm.atual}
                  onChange={e =>
                    setSenhaForm(f => ({ ...f, atual: e.target.value }))
                  }
                />
              </div>

              <div className="campo">
                <label>Nova Senha</label>
                <input
                  type="password"
                  value={senhaForm.nova}
                  onChange={e =>
                    setSenhaForm(f => ({ ...f, nova: e.target.value }))
                  }
                  minLength={8}
                />
              </div>

              <div className="campo">
                <label>Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={senhaForm.confirma}
                  onChange={e =>
                    setSenhaForm(f => ({ ...f, confirma: e.target.value }))
                  }
                />
              </div>

              <button type="submit" className="btn btn-secundario">
                🔒 Trocar Senha
              </button>
            </form>
          </div>
        </div>
      )}
    </PainelLayout>
  );
}