import { useState } from 'react';
import Sidebar from './Sidebar';
import NotificacaoPopup from './NotificacaoPopup';

export default function PainelLayout({ titulo, children }) {
  const [sidebarAberta, setSidebarAberta] = useState(false);

  function fecharSidebar() {
    setSidebarAberta(false);
  }

  return (
    <div className={`painel-wrapper${sidebarAberta ? ' menu-aberto' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarAberta(true)}
        aria-label="Abrir menu"
        aria-expanded={sidebarAberta}
      >
        ☰
      </button>

      <Sidebar aberta={sidebarAberta} onNavigate={fecharSidebar} />

      {sidebarAberta && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={fecharSidebar}
          aria-label="Fechar menu"
        />
      )}

      <NotificacaoPopup />

      <div className="painel-conteudo">
        <header className="topbar">
          <span className="topbar-titulo">{titulo}</span>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}