import {  Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/img/logo/logotipo_centroformcacao.png';

const menus = {
  admin: [
    { to: '/admin', icon: '📊', label: 'Dashboard' },
    { to: '/admin/formacoes', icon: '📚', label: 'Formações' },
    { to: '/admin/inscricoes', icon: '📋', label: 'Inscrições' },
    { to: '/admin/frequencia', icon: '✅', label: 'Frequência' },
    { to: '/admin/certificados', icon: '🎓', label: 'Certificados' },
    { to: '/admin/usuarios', icon: '👥', label: 'Usuários' },
    { to: '/admin/relatorios', icon: '📈', label: 'Relatórios' },
    { to: '/admin/logs', icon: '🗒️', label: 'Logs' },
    { to: '/admin/biblioteca-painel', icon: '📖', label: 'Biblioteca' },
    { to: '/admin/inventario-consumo', icon: '📦', label: 'Inventário de Consumo' },
  ],

  coordenador: [
    { to: '/coordenador', icon: '📊', label: 'Dashboard' },
    { to: '/coordenador/formacoes', icon: '📚', label: 'Formações' },
    { to: '/coordenador/inscricoes', icon: '📋', label: 'Inscrições' },
    { to: '/coordenador/frequencia', icon: '✅', label: 'Frequência' },
    { to: '/coordenador/certificados', icon: '🎓', label: 'Certificados' },
    { to: '/coordenador/participantes', icon: '👥', label: 'Participantes' },
    { to: '/coordenador/relatorios', icon: '📈', label: 'Relatórios' },
    { to: '/coordenador/propostas-formacao', icon: '📝', label: 'Propostas de Formação' },
    { to: '/coordenador/notificacoes', icon: '🔔', label: 'Notificações' },
    { to: '/coordenador/inventario-consumo', icon: '📦', label: 'Inventário de Consumo' },
  ],

  participante: [
    { to: '/participante', icon: '📊', label: 'Meu Painel' },
    { to: '/participante/formacoes', icon: '📚', label: 'Formações' },
    { to: '/participante/inscricoes', icon: '📋', label: 'Minhas Inscrições' },
    { to: '/participante/frequencia', icon: '✅', label: 'Minha Frequência' },
    { to: '/participante/certificados', icon: '🎓', label: 'Certificados' },
    { to: '/participante/perfil', icon: '👤', label: 'Meu Perfil' },
  ],

  equipe: [
    { to: '/equipe', icon: '📊', label: 'Dashboard' },
    { to: '/equipe/formacoes', icon: '📚', label: 'Formações' },
    { to: '/equipe/inscricoes', icon: '📋', label: 'Inscrições' },
    { to: '/equipe/certificados', icon: '🎓', label: 'Certificados' },
    { to: '/equipe/participantes', icon: '👥', label: 'Participantes' },
    { to: '/equipe/relatorios', icon: '📈', label: 'Relatórios' },
    { to: '/equipe/agendar-formacao', icon: '🗓️', label: 'Agendar Formação' },
    { to: '/equipe/minhas-propostas', icon: '📝', label: 'Minhas Propostas' },
    { to: '/equipe/notificacoes', icon: '🔔', label: 'Notificações' },
  ],
};

export default function Sidebar({ aberta = false, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = menus[user?.tipo] || [];
  const inicial = user?.nome?.[0]?.toUpperCase() || '?';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleClickMenu() {
    if (window.innerWidth <= 768 && onNavigate) {
      onNavigate();
    }
  }

  return (
    <aside className={`sidebar ${aberta ? 'sidebar-open' : ''}`}>
      <div
        style={{
          padding: '18px 16px 16px',
          borderBottom: '1px solid rgba(255,255,255,.16)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #f15a24 0%, #e94b1b 100%)',
        }}
      >
        <Link
  to="/"
  onClick={handleClickMenu}
  title="Ir para a página inicial"
  style={{
    width: '100%',
    maxWidth: 190,
    minHeight: 72,
    borderRadius: 12,
    background: '#ff7a2f',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px 12px',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)',
    textDecoration: 'none',
    cursor: 'pointer',
  }}
>
  <img
    src={logo}
    alt="Centro de Formação Darcy Ribeiro"
    loading="eager"
    decoding="sync"
    style={{
      display: 'block',
      width: '100%',
      maxWidth: 165,
      height: 'auto',
      objectFit: 'contain',
    }}
  />
</Link>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-secao">Menu</div>

        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={handleClickMenu}
            end={
              l.to === '/admin' ||
              l.to === '/coordenador' ||
              l.to === '/participante' ||
              l.to === '/equipe'
            }
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' ativo' : ''}`
            }
          >
            <span className="icon">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-usuario">
          <div className="sidebar-avatar">{inicial}</div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 150,
              }}
            >
              {user?.nome}
            </div>

            <div style={{ fontSize: '.75rem' }}>
              {user?.tipo}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-outline"
          style={{
            marginTop: 12,
            width: '100%',
            color: 'rgba(255,255,255,.6)',
            borderColor: 'rgba(255,255,255,.2)',
            fontSize: '.82rem',
            padding: '8px 12px',
          }}
        >
          🚪 Sair
        </button>
      </div>
    </aside>
  );
}