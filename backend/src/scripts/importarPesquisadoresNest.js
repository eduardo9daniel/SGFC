const path = require('path');
const XLSX = require('xlsx');
const db = require('../config/db');

function limparTexto(valor) {
  if (valor === null || valor === undefined) return null;

  const texto = String(valor).trim();

  if (!texto) return null;

  return texto;
}

function linkValido(valor) {
  const texto = limparTexto(valor);

  if (!texto) return null;

  // Na planilha existem valores como "Link Lattes", que não são URLs reais
  if (!texto.startsWith('http://') && !texto.startsWith('https://')) {
    return null;
  }

  return texto;
}

async function importar() {
  try {
    const caminhoArquivo = process.argv[2];

    if (!caminhoArquivo) {
      console.log('Informe o caminho da planilha.');
      console.log(
        'Exemplo: node src/scripts/importarPesquisadoresNest.js "./Planilha Pesquisadores Nest.xlsx"'
      );
      process.exit(1);
    }

    const caminhoCompleto = path.resolve(caminhoArquivo);

    const workbook = XLSX.readFile(caminhoCompleto);

    const nomeAba = workbook.SheetNames.includes('Pesquisadores')
      ? 'Pesquisadores'
      : workbook.SheetNames[0];

    const sheet = workbook.Sheets[nomeAba];

    // header: 1 lê como matriz, preservando as linhas da planilha
    const linhas = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: ''
    });

    // A primeira linha é título geral da planilha.
    // A segunda linha contém os nomes reais das colunas.
    const linhasDados = linhas.slice(2);

    let importados = 0;
    let ignorados = 0;
    let duplicados = 0;

    for (const linha of linhasDados) {
      const idPlanilha = limparTexto(linha[0]);
      const nome = limparTexto(linha[1]);
      const naturezaPesquisa = limparTexto(linha[2]);
      const tituloTrabalho = limparTexto(linha[3]);
      const linkLattes = linkValido(linha[4]);
      const filiacao = limparTexto(linha[5]);
      const tipoTrabalho = limparTexto(linha[6]);
      const palavrasChave = limparTexto(linha[7]);

      if (!nome) {
        ignorados++;
        continue;
      }

      const [existente] = await db.query(
        `
        SELECT id
        FROM pesquisadores_nest
        WHERE nome = ?
          AND (
            titulo_trabalho = ?
            OR (titulo_trabalho IS NULL AND ? IS NULL)
          )
        LIMIT 1
        `,
        [nome, tituloTrabalho, tituloTrabalho]
      );

      if (existente.length > 0) {
        duplicados++;
        continue;
      }

      await db.query(
        `
        INSERT INTO pesquisadores_nest
        (
          nome,
          natureza_pesquisa,
          titulo_trabalho,
          link_lattes,
          filiacao,
          tipo_trabalho,
          palavras_chave,
          ativo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [
          nome,
          naturezaPesquisa,
          tituloTrabalho,
          linkLattes,
          filiacao,
          tipoTrabalho,
          palavrasChave
        ]
      );

      importados++;
    }

    console.log('Importação concluída!');
    console.log(`Aba utilizada: ${nomeAba}`);
    console.log(`Importados: ${importados}`);
    console.log(`Duplicados ignorados: ${duplicados}`);
    console.log(`Linhas ignoradas: ${ignorados}`);

    process.exit(0);
  } catch (error) {
    console.error('Erro ao importar planilha:', error);
    process.exit(1);
  }
}

importar();