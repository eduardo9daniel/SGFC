export function obterRotaNotificacoes(tipoUsuario) {
  const perfil = String(tipoUsuario || '').toLowerCase();

  if (perfil === 'admin') {
    return '/admin/notificacoes';
  }

  if (perfil === 'coordenador') {
    return '/coordenador/notificacoes';
  }

  if (perfil === 'equipe') {
    return '/equipe/notificacoes';
  }

  return null;
}

function possuiReferenciaValida(referenciaId) {
  return (
    referenciaId !== null &&
    referenciaId !== undefined &&
    String(referenciaId).trim() !== ''
  );
}

function extrairIdPropostaDoLink(link) {
  const linkLimpo = String(link || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '');

  const partes = linkLimpo.split('/').filter(Boolean);
  const indicePropostas = partes.indexOf('propostas-formacao');

  if (
    indicePropostas === -1 ||
    indicePropostas >= partes.length - 1
  ) {
    return null;
  }

  const id = partes[indicePropostas + 1];

  return possuiReferenciaValida(id) ? id : null;
}

function montarRotaProposta(tipoUsuario, referenciaId) {
  const perfil = String(tipoUsuario || '').toLowerCase();

  if (
    !['admin', 'coordenador'].includes(perfil) ||
    !possuiReferenciaValida(referenciaId)
  ) {
    return null;
  }

  const id = encodeURIComponent(
    String(referenciaId).trim()
  );

  return `/${perfil}/propostas-formacao/${id}`;
}

export function obterDestinoNotificacao(
  notificacao,
  tipoUsuario
) {
  const perfil = String(tipoUsuario || '').toLowerCase();
  const tipo = String(
    notificacao?.tipo || ''
  ).toLowerCase();

  const referenciaTipo = String(
    notificacao?.referencia_tipo || ''
  ).toLowerCase();

  const link = String(
    notificacao?.link || ''
  ).trim();

  const referenciaId = possuiReferenciaValida(
    notificacao?.referencia_id
  )
    ? notificacao.referencia_id
    : extrairIdPropostaDoLink(link);

  const usuarioPodeAnalisarProposta =
    ['admin', 'coordenador'].includes(perfil);

  const notificacaoRelacionadaAProposta =
    tipo === 'nova_proposta_formacao' ||
    referenciaTipo === 'proposta_formacao' ||
    referenciaTipo === 'proposta-formacao' ||
    link.includes('/propostas-formacao');

  /*
   * Para Admin e Coordenador, a rota é sempre montada
   * utilizando o perfil atualmente conectado.
   *
   * Dessa forma:
   * Admin:
   * /admin/propostas-formacao/:id
   *
   * Coordenador:
   * /coordenador/propostas-formacao/:id
   *
   * Isso também corrige notificações antigas que tenham
   * sido gravadas com a rota do perfil errado.
   */
  if (
    usuarioPodeAnalisarProposta &&
    notificacaoRelacionadaAProposta &&
    possuiReferenciaValida(referenciaId)
  ) {
    return montarRotaProposta(
      perfil,
      referenciaId
    );
  }

  /*
   * Solicitação de empréstimo de livro.
   */
  if (
    usuarioPodeAnalisarProposta &&
    tipo === 'solicitacao_emprestimo_livro'
  ) {
    return perfil === 'admin'
      ? '/admin/biblioteca?aba=acervo&subaba=solicitacoes'
      : '/coordenador/biblioteca?subaba=solicitacoes';
  }

  /*
   * Notificações recebidas pelo perfil Equipe.
   */
  if (
    perfil === 'equipe' &&
    [
      'proposta_confirmada',
      'proposta_recusada'
    ].includes(tipo)
  ) {
    return '/equipe/minhas-propostas';
  }

  /*
   * Caso exista um link válido e ele não precise
   * ser corrigido, utiliza o link salvo.
   */
  if (
    link &&
    link !== '#' &&
    link !== '/'
  ) {
    /*
     * Corrige links de proposta do Coordenador
     * quando o usuário conectado for Admin.
     */
    if (
      perfil === 'admin' &&
      link.startsWith(
        '/coordenador/propostas-formacao'
      )
    ) {
      if (possuiReferenciaValida(referenciaId)) {
        return montarRotaProposta(
          'admin',
          referenciaId
        );
      }

      return '/admin/propostas-formacao';
    }

    /*
     * Corrige links de proposta do Admin
     * quando o usuário conectado for Coordenador.
     */
    if (
      perfil === 'coordenador' &&
      link.startsWith(
        '/admin/propostas-formacao'
      )
    ) {
      if (possuiReferenciaValida(referenciaId)) {
        return montarRotaProposta(
          'coordenador',
          referenciaId
        );
      }

      return '/coordenador/propostas-formacao';
    }

    /*
     * Corrige links antigos da Biblioteca.
     */
    if (
      perfil === 'admin' &&
      link.startsWith('/coordenador/biblioteca')
    ) {
      return '/admin/biblioteca?aba=acervo&subaba=solicitacoes';
    }

    if (
      perfil === 'coordenador' &&
      link.startsWith('/admin/biblioteca')
    ) {
      return '/coordenador/biblioteca?subaba=solicitacoes';
    }

    return link;
  }

  /*
   * Quando não existir um destino específico,
   * retorna a página de notificações do perfil.
   */
  return obterRotaNotificacoes(perfil);
}

export function formatarDataNotificacao(valor) {
  if (!valor) {
    return '';
  }

  const data = new Date(
    String(valor).replace(' ', 'T')
  );

  if (Number.isNaN(data.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(data);
}