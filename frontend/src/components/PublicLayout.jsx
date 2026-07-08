import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/img/logo/logo_menu_publico_recortado.png';
import logoPrefeituraEducacao from '../assets/img/logo/logo_prefeitura_educacao_negativa.png';

export function HeaderPublico() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuAberto, setMenuAberto] = useState(false);

  const dashPath = user ? `/${user.tipo}` : null;

  function fecharMenu() {
    setMenuAberto(false);
  }

  function handleLogout() {
    logout();
    fecharMenu();
    navigate('/');
  }

  return (
    <header className="header-publico">
      <div className="header-faixa-superior" />

      <div className="header-inner">
        <Link
          className="header-logo"
          to="/"
          onClick={fecharMenu}
          aria-label="Ir para a página inicial"
        >
          <img
            src={logo}
            alt="Centro de Formação Darcy Ribeiro"
          />
        </Link>

        <button
          type="button"
          className={`header-menu-mobile ${
            menuAberto ? 'ativo' : ''
          }`}
          onClick={() => setMenuAberto((estado) => !estado)}
          aria-label={
            menuAberto ? 'Fechar menu' : 'Abrir menu'
          }
          aria-expanded={menuAberto}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`nav-publico ${
            menuAberto ? 'nav-publico-aberto' : ''
          }`}
          aria-label="Menu principal"
        >
          <a
            href="/#inicio"
            className="nav-publico-link"
            onClick={fecharMenu}
          >
            O Centro
          </a>

          <a
            href="/#servicos"
            className="nav-publico-link"
            onClick={fecharMenu}
          >
            Serviços
          </a>

          <Link
            to="/biblioteca"
            className="nav-publico-link"
            onClick={fecharMenu}
          >
            Biblioteca e Pesquisas 
          </Link>

          <Link
            to="/validar-certificado"
            className="nav-publico-link"
            onClick={fecharMenu}
          >
            Certificados
          </Link>

          {user ? (
            <div className="nav-publico-acoes">
              <Link
                to={dashPath}
                className="btn btn-outline btn-sm"
                onClick={fecharMenu}
              >
                Painel
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-primario btn-sm"
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="nav-publico-acoes">
              <Link
                to="/login"
                className="nav-publico-entrar"
                onClick={fecharMenu}
              >
                Entrar
              </Link>

              <Link
                to="/cadastro"
                className="header-botao-inscricao"
                onClick={fecharMenu}
              >
                Crie sua Conta
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export function FooterPublico() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          {/* Logos institucionais */}
          <div className="footer-marcas">
            <div className="footer-logos-linha">
              <img
                className="footer-logo-prefeitura"
                src={logoPrefeituraEducacao}
                alt="Prefeitura de Niterói - Educação"
              />

              <span
                className="footer-logo-separador"
                aria-hidden="true"
              />

              <Link
                to="/"
                className="footer-logo-cf"
                title="Ir para a página inicial"
              >
                <img
                  src={logo}
                  alt="Centro de Formação Darcy Ribeiro"
                />
              </Link>
            </div>
          </div>

          {/* Links */}
          <div style={{ flex: 1 }}>
            <h4
              style={{
                color: '#fff',
                marginBottom: 12,
                fontFamily: 'var(--fonte-display)'
              }}
            >
              Links Rápidos
            </h4>

            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              {[
                ['/', 'Página Inicial'],
                ['/biblioteca', 'Biblioteca'],
                ['/cadastro', 'Cadastrar-se'],
                ['/login', 'Login'],
                ['/validar-certificado', 'Verificar Certificado'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link
                    to={to}
                    style={{
                      color: 'rgba(255,255,255,.6)',
                      fontSize: '.88rem',
                      textDecoration: 'none'
                    }}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Endereço */}
          <div style={{ flex: 1 }}>
            <h4
              style={{
                color: '#fff',
                marginBottom: 12,
                fontFamily: 'var(--fonte-display)'
              }}
            >
              Endereço
            </h4>

            <p
              style={{
                color: 'rgba(255,255,255,.6)',
                fontSize: '.88rem',
                lineHeight: 1.8,
                maxWidth: 280
              }}
            >
              R. Benjamin Constant, 562
              <br />
              Largo do Barradas
              <br />
              Niterói - RJ
              <br />
              CEP: 24110-002
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} Centro de Formação Darcy
          Ribeiro — Todos os direitos reservados
        </div>
      </div>
    </footer>
  );
}