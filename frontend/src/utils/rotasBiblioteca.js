export function criarRotasBiblioteca(tipoUsuario) {
  const prefixo =
    tipoUsuario === 'coordenador'
      ? '/coordenador'
      : '/admin';

  const gerenciamento = `${prefixo}/biblioteca`;

  return {
    prefixo,
    painel: `${prefixo}/biblioteca-painel`,
    gerenciamento,
    pesquisas: `${gerenciamento}?aba=pesquisas`,
    acervo: `${gerenciamento}?aba=acervo`,
    novoItem: `${gerenciamento}/novo`,
    novaPesquisa: `${gerenciamento}/pesquisa/nova`,
    novoLivro: `${gerenciamento}/livro/novo`
  };
}
