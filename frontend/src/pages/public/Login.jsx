import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import logo from '../../assets/img/logo/logotipo_centroformcacao.png';

function IconeOlho() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeOlhoFechado() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
      <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17.2 17.2 0 0 1-3.1 4.1" />
      <path d="M6.6 6.6C3.8 8.5 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.3-1" />
    </svg>
  );
}

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ email: '', senha: '' });
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.primeiro_acesso) {
      navigate('/primeiro-acesso', { replace: true });
    } else {
      navigate(`/${user.tipo}`, { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const r = await login(form.email, form.senha);

      if (r.ok) {
        if (r.primeiro_acesso) {
          toast('Primeiro acesso detectado. Defina uma nova senha.', 'aviso');
          navigate('/primeiro-acesso', { replace: true });
        } else {
          navigate(`/${r.tipo}`, { replace: true });
        }
      } else {
        toast(r.erro || 'Erro ao fazer login.', 'erro');
      }
    } catch (err) {
      toast(err.response?.data?.erro || 'Erro ao fazer login.', 'erro');
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
            width={280}
            height="auto"
          />
        </Link>

        <div className="auth-lateral-texto">
          <p>
            Bem-vindo ao sistema de formações continuadas da Rede Municipal de Educação de Niterói.
          </p>
          <br />
          <p>✦ Inscrições &nbsp;&nbsp; ✦ Frequência &nbsp;&nbsp; ✦ Certificados</p>
        </div>
      </div>

      <div className="auth-form-area">
        <div className="auth-box">
          <h1 className="auth-titulo">Acesse sua conta</h1>

          <p className="auth-subtitulo">
            Novo por aqui? <Link to="/cadastro">Crie sua Conta</Link>
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>

            <div className="campo" style={{ position: 'relative' }}>
              <label htmlFor="senha">Senha</label>

              <input
                type={mostrarSenha ? 'text' : 'password'}
                id="senha"
                placeholder="••••••••"
                value={form.senha}
                onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                required
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setMostrarSenha(v => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                style={{
                  position: 'absolute',
                  right: 14,
                  bottom: 13,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlho />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <Link to="/validar-certificado" style={{ fontSize: '.88rem' }}>
                Esqueci minha senha
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primario btn-full btn-lg"
              disabled={loading}
            >
              {loading ? 'Entrando…' : 'Entrar no Sistema →'}
            </button>
          </form>

          <hr className="separador" />

          <p style={{ textAlign: 'center', fontSize: '.85rem', color: 'var(--cinza-500)' }}>
            <Link to="/validar-certificado" style={{ color: 'var(--cinza-500)' }}>
              🎓 Validar certificado
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}