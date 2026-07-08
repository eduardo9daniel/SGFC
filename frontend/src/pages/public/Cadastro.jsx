import { useEffect, useMemo, useState } from 'react';
import { escolasRegioes } from '../../data/escolasRegioes';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api';
import logo from '../../assets/img/logo/logotipo_centroformcacao.png';

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
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export default function Cadastro() {
  const toast = useToast();
  const navigate = useNavigate();
  const { concluirLoginCadastro } = useAuth();

  const [form, setForm] = useState({
    nome_completo: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    escola: '',
    regiao_nome: '',
    regiao_id: '',
    senha: '',
    confirma_senha: ''
  });

  const [regioes, setRegioes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carregandoRegioes, setCarregandoRegioes] = useState(true);

  const escolasOrdenadas = useMemo(() => {
    return [...escolasRegioes].sort((a, b) =>
      String(a.escola || '').localeCompare(String(b.escola || ''), 'pt-BR')
    );
  }, []);

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function selecionarEscola(nomeEscola) {
    const escolaSelecionada = escolasRegioes.find(
      item => item.escola === nomeEscola
    );

    if (!escolaSelecionada) {
      setForm(f => ({
        ...f,
        escola: nomeEscola,
        regiao_nome: '',
        regiao_id: ''
      }));

      return;
    }

    const regiaoEncontrada = regioes.find(
      r => normalizarTexto(r.nome) === normalizarTexto(escolaSelecionada.regiao)
    );

    setForm(f => ({
      ...f,
      escola: nomeEscola,
      regiao_nome: escolaSelecionada.regiao,
      regiao_id: regiaoEncontrada ? String(regiaoEncontrada.id) : ''
    }));
  }

  useEffect(() => {
    async function carregarRegioes() {
      try {
        const { data } = await api.get('/regioes');
        setRegioes(data.data || []);
      } catch (err) {
        console.error('Erro ao carregar regiões:', err);
        toast('Erro ao carregar regiões.', 'erro');
      } finally {
        setCarregandoRegioes(false);
      }
    }

    carregarRegioes();
  }, [toast]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.escola) {
      toast('Selecione sua unidade.', 'erro');
      return;
    }

    if (!form.regiao_id) {
      toast('Não foi possível identificar a região da escola selecionada.', 'erro');
      return;
    }

    if (form.senha.length < 8) {
      toast('Senha deve ter ao menos 8 caracteres.', 'erro');
      return;
    }

    if (form.senha !== form.confirma_senha) {
      toast('As senhas não conferem.', 'erro');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/cadastro', {
        nome_completo: form.nome_completo,
        email: form.email,
        cpf: form.cpf,
        telefone: form.telefone,
        data_nascimento: form.data_nascimento,
        regiao_id: form.regiao_id,
        senha: form.senha
      });

      concluirLoginCadastro(data);

      toast('Cadastro realizado. Complete seu primeiro acesso.', 'sucesso');

      navigate('/primeiro-acesso');
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao cadastrar.', 'erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-lateral">
        <Link
  to="/"
  title="Ir para a página inicial"
  aria-label="Ir para a página inicial"
  style={{
    display: 'inline-flex',
    textDecoration: 'none',
    cursor: 'pointer'
  }}
>
  <img
    className="logo-auth"
    src={logo}
    alt="Centro de Formação Darcy Ribeiro"
  />
</Link>

        <div className="auth-lateral-texto">
          <p>
            Crie sua conta gratuitamente e acesse todas as formações disponíveis
            no Centro Darcy Ribeiro.
          </p>
        </div>
      </div>

      <div
        className="auth-form-area"
        style={{ overflowY: 'auto', padding: '32px 60px' }}
      >
        <div className="auth-box" style={{ maxWidth: 500 }}>
          <h1 className="auth-titulo">Criar conta</h1>

          <p className="auth-subtitulo">
            Já tem conta? <Link to="/login">Faça login</Link>
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="campo">
              <label>Nome Completo *</label>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={form.nome_completo}
                onChange={e => set('nome_completo', e.target.value)}
                required
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16
              }}
            >
              <div className="campo">
                <label>E-mail *</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                />
              </div>

              <div className="campo">
                <label>CPF *</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  maxLength={14}
                  onChange={e => set('cpf', mascaraCPF(e.target.value))}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16
              }}
            >
              <div className="campo">
                <label>Telefone</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={form.telefone}
                  maxLength={15}
                  onChange={e => set('telefone', mascaraTel(e.target.value))}
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
            </div>

            <div className="campo">
            <label>Unidade *</label>
            <select
            value={form.escola}
            onChange={e => selecionarEscola(e.target.value)}
            required
            disabled={carregandoRegioes}
            >
            <option value="">
            {carregandoRegioes
            ? 'Carregando unidades...'
            : 'Selecione sua Unidade'}
            </option>

            {escolasOrdenadas.map(item => (
            <option key={item.escola} value={item.escola}>
            {item.escola}
            </option>
            ))}
    </select>
  </div>

            <div className="campo">
              <label>Região *</label>
              <input
                type="text"
                value={form.regiao_nome}
                placeholder="A região será preenchida automaticamente"
                disabled
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16
              }}
            >
              <div className="campo">
                <label>Senha *</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={form.senha}
                  onChange={e => set('senha', e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="campo">
                <label>Confirmar Senha *</label>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  value={form.confirma_senha}
                  onChange={e => set('confirma_senha', e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primario btn-full btn-lg"
              disabled={loading || carregandoRegioes}
            >
              {loading ? 'Criando conta…' : 'Criar Conta Gratuitamente →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}