import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import api from '../api';

const TITULOS = {
  '/admin': 'Painel do administrador',
  '/admin/formacoes': 'Formações',
  '/admin/agenda-semanal': 'Agenda semanal',
  '/admin/agendar-formacao': 'Agendar formação',
  '/admin/inscricoes': 'Inscrições',
  '/admin/frequencia': 'Frequência',
  '/admin/certificados': 'Certificados',
  '/admin/usuarios': 'Usuários',
  '/admin/relatorios': 'Relatórios',
  '/admin/logs': 'Logs de atividades',
  '/admin/biblioteca-painel': 'Painel da biblioteca',
  '/admin/biblioteca': 'Acervo da biblioteca',
  '/admin/biblioteca/novo': 'Novo item da biblioteca',
  '/admin/biblioteca/pesquisa/nova': 'Nova pesquisa acadêmica',
  '/admin/inventario': 'Inventário',
  '/admin/inventario/bens-consumo': 'Bens de consumo',
  '/admin/inventario/bens-duraveis': 'Bens duráveis',
  '/admin/inventario-consumo': 'Bens de consumo',
  '/admin/pesquisadores-nest': 'Pesquisadores NEST',

  '/coordenador': 'Painel do coordenador',
  '/coordenador/formacoes': 'Formações',
  '/coordenador/agenda-semanal': 'Agenda semanal',
  '/coordenador/agendar-formacao': 'Agendar formação',
  '/coordenador/inscricoes': 'Inscrições',
  '/coordenador/frequencia': 'Frequência',
  '/coordenador/certificados': 'Certificados',
  '/coordenador/participantes': 'Participantes',
  '/coordenador/relatorios': 'Relatórios',
  '/coordenador/propostas-formacao': 'Propostas de formação',
  '/coordenador/notificacoes': 'Notificações',
  '/coordenador/inventario': 'Inventário',
  '/coordenador/inventario/bens-consumo': 'Bens de consumo',
  '/coordenador/inventario/bens-duraveis': 'Bens duráveis',
  '/coordenador/inventario-consumo': 'Bens de consumo',

  '/equipe': 'Painel da equipe',
  '/equipe/dashboard': 'Painel da equipe',
  '/equipe/formacoes': 'Formações',
  '/equipe/inscricoes': 'Inscrições',
  '/equipe/certificados': 'Certificados',
  '/equipe/participantes': 'Participantes',
  '/equipe/relatorios': 'Relatórios',
  '/equipe/agendar-formacao': 'Propor formação',
  '/equipe/minhas-propostas': 'Minhas propostas',
  '/equipe/notificacoes': 'Notificações',

  '/participante': 'Painel do participante',
  '/participante/formacoes': 'Formações disponíveis',
  '/participante/inscricoes': 'Minhas inscrições',
  '/participante/frequencia': 'Minha frequência',
  '/participante/certificados': 'Meus certificados',
  '/participante/perfil': 'Meu perfil',

  '/primeiro-acesso': 'Primeiro acesso'
};

function obterTitulo(pathname) {
  if (
    /^\/coordenador\/propostas-formacao\/\d+$/.test(
      pathname
    )
  ) {
    return 'Detalhes da proposta de formação';
  }

  if (
    /^\/participante\/certificados\/[^/]+\/visualizar$/.test(
      pathname
    )
  ) {
    return 'Visualização de certificado';
  }

  if (
    /^\/admin\/biblioteca\/\d+$/.test(
      pathname
    )
  ) {
    return 'Detalhes do item da biblioteca';
  }

  if (
    /^\/admin\/biblioteca\/\d+\/editar$/.test(
      pathname
    )
  ) {
    return 'Edição de item da biblioteca';
  }

  if (
    /^\/admin\/pesquisadores-nest\/\d+$/.test(
      pathname
    )
  ) {
    return 'Detalhes da pesquisa acadêmica';
  }

  if (
    /^\/admin\/pesquisadores-nest\/\d+\/editar$/.test(
      pathname
    )
  ) {
    return 'Edição de pesquisa acadêmica';
  }

  return TITULOS[pathname] || 'Página do sistema';
}

export default function AuditoriaNavegacao() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    /*
     * Evita registrar a mesma rota várias vezes durante
     * renderizações consecutivas do React.
     */
    const agora = Date.now();

    const chave =
      `cfdr-auditoria-navegacao-${user.id}`;

    const anterior =
      sessionStorage.getItem(chave);

    if (anterior) {
      try {
        const registro =
          JSON.parse(anterior);

        const mesmaRota =
          registro.rota === pathname;

        const intervaloCurto =
          agora - Number(registro.em) < 1500;

        if (
          mesmaRota &&
          intervaloCurto
        ) {
          return;
        }
      } catch {
        /*
         * Ignora registros antigos ou inválidos.
         */
      }
    }

    sessionStorage.setItem(
      chave,
      JSON.stringify({
        rota: pathname,
        em: agora
      })
    );

    api
      .post('/auth/navegacao', {
        rota: pathname,
        titulo: obterTitulo(pathname)
      })
      .catch(erro => {
        /*
         * Uma falha na auditoria não pode interromper
         * a navegação do usuário.
         */
        if (
          import.meta.env.DEV
        ) {
          console.warn(
            '[AUDITORIA] Não foi possível registrar a navegação:',
            erro?.response?.data?.erro ||
              erro.message
          );
        }
      });
  }, [
    pathname,
    user?.id
  ]);

  return null;
}