import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api';

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

function getDestinoPorTipo(tipo) {
  if (tipo === 'equipe') return '/equipe/dashboard';
  if (tipo === 'admin') return '/admin';
  if (tipo === 'coordenador') return '/coordenador';
  if (tipo === 'participante') return '/participante';
  return '/';
}

export default function PrimeiroAcesso() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, concluirPrimeiroAcesso, logout } = useAuth();

  const [form, setForm] = useState({
    nome_usuario: '',
    codigo_confirmacao: '',
    nova_senha: '',
    confirmar_senha: ''
  });

  const [loading, setLoading] = useState(false);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.primeiro_acesso) {
      navigate(getDestinoPorTipo(user.tipo), { replace: true });
      return;
    }

    setForm(f => ({
      ...f,
      nome_usuario: f.nome_usuario || user.nome || ''
    }));
  }, [user, navigate]);

  const criterios = useMemo(() => {
    const nome = form.nome_usuario.trim();
    const codigo = form.codigo_confirmacao.trim();

    return {
      nome: nome.length >= 3,
      codigo: codigo.length === 6 && /^\d{6}$/.test(codigo),
      codigoGerado,
      tamanho: form.nova_senha.length >= 8,
      maiuscula: /[A-ZÀ-Ý]/.test(form.nova_senha),
      minuscula: /[a-zà-ÿ]/.test(form.nova_senha),
      numero: /\d/.test(form.nova_senha),
      iguais:
        form.nova_senha.length > 0 &&
        form.nova_senha === form.confirmar_senha
    };
  }, [form, codigoGerado]);

  const senhaValida =
    criterios.tamanho &&
    criterios.maiuscula &&
    criterios.minuscula &&
    criterios.numero &&
    criterios.iguais;

  const formularioValido =
    criterios.nome &&
    criterios.codigoGerado &&
    criterios.codigo &&
    senhaValida;

  async function handleGerarCodigo() {
    setEnviandoCodigo(true);

    try {
      const { data } = await api.post('/auth/gerar-codigo-primeiro-acesso');

      setCodigoGerado(true);

      toast(
        data?.mensagem ||
        'Código enviado para o e-mail cadastrado.'
      );
    } catch (err) {
      toast(
        err.response?.data?.erro ||
        'Erro ao enviar código de confirmação.',
        'erro'
      );
    } finally {
      setEnviandoCodigo(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!criterios.nome) {
      return toast('Informe o nome do usuário.', 'erro');
    }

    if (!criterios.codigoGerado) {
      return toast('Gere um código de confirmação antes de continuar.', 'erro');
    }

    if (!criterios.codigo) {
      return toast('Informe o código de confirmação com 6 dígitos.', 'erro');
    }

    if (!senhaValida) {
      return toast('Confira os critérios da senha antes de continuar.', 'erro');
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/primeiro-acesso', {
        nome_completo: form.nome_usuario.trim(),
        codigo_confirmacao: form.codigo_confirmacao.trim(),
        nova_senha: form.nova_senha,
        confirmar_senha: form.confirmar_senha
      });

      concluirPrimeiroAcesso({
        nome: data?.user?.nome || form.nome_usuario.trim(),
        email: data?.user?.email || user.email
      });

      toast('Primeiro acesso concluído com sucesso.');
      navigate(getDestinoPorTipo(user.tipo), { replace: true });
    } catch (err) {
      toast(
        err.response?.data?.erro || 'Erro ao concluir primeiro acesso.',
        'erro'
      );
    } finally {
      setLoading(false);
    }
  }

  const itemCriterio = (ok, texto) => (
    <li
      style={{
        color: ok ? 'var(--verde)' : 'var(--cinza-500)',
        fontWeight: ok ? 700 : 500,
        fontSize: '.86rem',
        marginBottom: 6
      }}
    >
      {ok ? '✓' : '○'} {texto}
    </li>
  );

  return (
    <div className="auth-wrapper">
      <div className="auth-form-area" style={{ margin: '0 auto' }}>
        <div className="auth-box" style={{ maxWidth: 500 }}>
          <h1 className="auth-titulo">Primeiro acesso</h1>

          <p className="auth-subtitulo">
            Olá, <strong>{user?.nome}</strong>. Antes de continuar, confirme seus dados e defina sua senha definitiva.
          </p>

          <div
            style={{
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 12,
              padding: 14,
              marginBottom: 18,
              color: '#8a5a00',
              fontSize: '.9rem',
              lineHeight: 1.45
            }}
          >
            Você entrou com uma senha provisória. Após confirmar seus dados e criar sua nova senha,
            seu acesso ao sistema será liberado normalmente.
          </div>

          <div
            style={{
              background: 'var(--cinza-100)',
              borderRadius: 12,
              padding: 14,
              marginBottom: 18,
              fontSize: '.9rem'
            }}
          >
            <strong>Dados da conta</strong>

            <p style={{ margin: '8px 0 0' }}>
              E-mail cadastrado: {user?.email}
            </p>

            <p style={{ margin: '4px 0 0' }}>
              Perfil: {user?.tipo}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="campo">
              <label htmlFor="nome_usuario">Nome do usuário</label>
              <input
                type="text"
                id="nome_usuario"
                placeholder="Digite seu nome completo"
                value={form.nome_usuario}
                onChange={e =>
                  setForm(f => ({ ...f, nome_usuario: e.target.value }))
                }
                autoComplete="name"
                required
              />
            </div>

            <div
              style={{
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 12,
                padding: 14,
                marginBottom: 18
              }}
            >
              <strong style={{ fontSize: '.9rem' }}>
                Código de confirmação
              </strong>

              <p
                style={{
                  margin: '8px 0 12px',
                  color: 'var(--cinza-600)',
                  fontSize: '.86rem',
                  lineHeight: 1.45
                }}
              >
                O sistema enviará um código de confirmação para o e-mail cadastrado.
                Verifique sua caixa de entrada e também a pasta de spam ou lixo eletrônico.
              </p>

              <button
                type="button"
                className="btn btn-secundario btn-full"
                onClick={handleGerarCodigo}
                disabled={enviandoCodigo}
              >
                {enviandoCodigo ? 'Enviando código…' : 'Enviar código por e-mail'}
              </button>
            </div>

            <div className="campo">
              <label htmlFor="codigo_confirmacao">Digite o código de confirmação</label>
              <input
                type="text"
                id="codigo_confirmacao"
                placeholder="Ex.: 123456"
                value={form.codigo_confirmacao}
                onChange={e => {
                  const apenasNumeros = e.target.value.replace(/\D/g, '').slice(0, 6);

                  setForm(f => ({
                    ...f,
                    codigo_confirmacao: apenasNumeros
                  }));
                }}
                inputMode="numeric"
                maxLength={6}
                required
              />
              <small style={{ color: 'var(--cinza-500)', fontSize: '.78rem' }}>
                Informe o código de 6 dígitos enviado para seu e-mail.
              </small>
            </div>

            <div className="campo" style={{ position: 'relative' }}>
              <label htmlFor="nova_senha">Nova senha</label>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                id="nova_senha"
                placeholder="Digite sua nova senha"
                value={form.nova_senha}
                onChange={e =>
                  setForm(f => ({ ...f, nova_senha: e.target.value }))
                }
                autoComplete="new-password"
                required
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

            <div className="campo">
              <label htmlFor="confirmar_senha">Confirmar nova senha</label>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                id="confirmar_senha"
                placeholder="Repita a nova senha"
                value={form.confirmar_senha}
                onChange={e =>
                  setForm(f => ({ ...f, confirmar_senha: e.target.value }))
                }
                autoComplete="new-password"
                required
              />
            </div>

            <div
              style={{
                background: 'var(--branco)',
                border: '1px solid var(--cinza-200)',
                borderRadius: 12,
                padding: 14,
                marginBottom: 18
              }}
            >
              <strong style={{ fontSize: '.9rem' }}>
                Critérios de liberação
              </strong>

              <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
                {itemCriterio(criterios.nome, 'nome do usuário preenchido')}
                {itemCriterio(criterios.codigoGerado, 'código de confirmação enviado')}
                {itemCriterio(criterios.codigo, 'código de confirmação com 6 dígitos')}
                {itemCriterio(criterios.tamanho, 'senha com mínimo de 8 caracteres')}
                {itemCriterio(criterios.maiuscula, 'senha com pelo menos uma letra maiúscula')}
                {itemCriterio(criterios.minuscula, 'senha com pelo menos uma letra minúscula')}
                {itemCriterio(criterios.numero, 'senha com pelo menos um número')}
                {itemCriterio(criterios.iguais, 'as senhas precisam coincidir')}
              </ul>
            </div>

            <button
              type="submit"
              className="btn btn-primario btn-full btn-lg"
              disabled={loading || !formularioValido}
            >
              {loading ? 'Salvando…' : 'Confirmar dados e continuar'}
            </button>
          </form>

          <hr className="separador" />

          <p style={{ textAlign: 'center', fontSize: '.85rem' }}>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--cinza-500)',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Sair e voltar depois
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}