const fs = require('fs');
const path = require('path');

const entrada = path.resolve(__dirname, '../12mar.csv');
const saida = path.resolve(__dirname, '../frontend/src/data/escolasRegioes.js');

if (!fs.existsSync(entrada)) {
  throw new Error(`Arquivo CSV não encontrado em: ${entrada}`);
}

const conteudo = fs.readFileSync(entrada, 'latin1');

const linhas = conteudo
  .split(/\r?\n/)
  .map(linha => linha.trim())
  .filter(Boolean);

if (linhas.length === 0) {
  throw new Error('CSV está vazio.');
}

function detectarSeparador(linha) {
  if (linha.includes(';')) return ';';
  if (linha.includes('\t')) return '\t';
  if (linha.includes(',')) return ',';
  return ';';
}

function limparTexto(texto) {
  return String(texto || '')
    .replace(/^\uFEFF/, '')
    .trim();
}

function normalizarCabecalho(texto) {
  return limparTexto(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

const separador = detectarSeparador(linhas[0]);

const cabecalhoOriginal = linhas[0].split(separador).map(limparTexto);
const cabecalhoNormalizado = cabecalhoOriginal.map(normalizarCabecalho);

console.log('Separador detectado:', separador === '\t' ? 'TAB' : separador);
console.log('Cabeçalho encontrado:', cabecalhoOriginal);

const idxEscola = cabecalhoNormalizado.findIndex(coluna =>
  coluna === 'UE' ||
  coluna === 'ESCOLA' ||
  coluna === 'UNIDADE ESCOLAR' ||
  coluna.includes('UNIDADE')
);

const idxRegiao = cabecalhoNormalizado.findIndex(coluna =>
  coluna === 'REGIAO' ||
  coluna === 'REGIAO/ZONA' ||
  coluna === 'ZONA' ||
  coluna.includes('REGIAO')
);

if (idxEscola === -1 || idxRegiao === -1) {
  console.log('Colunas normalizadas:', cabecalhoNormalizado);

  throw new Error(
    'CSV precisa ter uma coluna de escola, como UE, ESCOLA ou UNIDADE ESCOLAR, e uma coluna de região, como REGIAO ou ZONA.'
  );
}

const escolas = linhas.slice(1)
  .map(linha => {
    const colunas = linha.split(separador);

    return {
      escola: limparTexto(colunas[idxEscola]),
      regiao: limparTexto(colunas[idxRegiao])
    };
  })
  .filter(item => item.escola && item.regiao);

const js = `export const escolasRegioes = ${JSON.stringify(escolas, null, 2)};\n`;

fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, js, 'utf8');

console.log(`Arquivo gerado com ${escolas.length} escolas.`);
console.log(`Arquivo salvo em: ${saida}`);