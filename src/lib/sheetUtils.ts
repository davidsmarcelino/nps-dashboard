/**
 * sheetUtils.ts
 * 
 * Este arquivo contém funções para manipulação de dados do Google Sheets,
 * incluindo conversão de URLs, busca de dados e processamento de CSV.
 * 
 * Estas funções são projetadas para funcionar com planilhas desorganizadas
 * e com diferentes tipos de dados, como os gerados pelo Google Formulários.
 */

/**
 * Converte uma URL do Google Sheets para o formato de exportação CSV
 * 
 * Esta função aceita diferentes formatos de URL do Google Sheets e os
 * converte para um formato que permite download direto como CSV.
 * 
 * Exemplos de URLs aceitas:
 * - https://docs.google.com/spreadsheets/d/SHEET_ID/edit
 * - https://docs.google.com/spreadsheets/d/e/SHEET_ID/pub
 * - https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv
 * 
 * @param url URL do Google Sheets em qualquer formato
 * @returns URL para download do CSV ou null se a URL for inválida
 */
export const convertToCSVUrl = (url: string): string | null => {
  try {
    // Se a URL estiver vazia, retorna null
    if (!url || url.trim() === '') {
      console.log('URL vazia fornecida para conversão');
      return null;
    }
    
    // Padrões para diferentes formatos de URL do Google Sheets
    const patterns = {
      // URL de edição normal
      edit: /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit/,
      // URL publicada
      published: /https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)\/pub/,
      // URL de formulário
      form: /https:\/\/docs\.google\.com\/forms\/d\/([a-zA-Z0-9-_]+)/,
      // URL já no formato de exportação
      export: /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/export/
    };
    
    // Verifica se já é uma URL de exportação
    if (patterns.export.test(url)) {
      // Se já for uma URL de exportação, verifica se já está no formato CSV
      if (url.includes('format=csv')) {
        return url;
      } else {
        // Adiciona o parâmetro de formato CSV
        return url.includes('?') ? `${url}&format=csv` : `${url}?format=csv`;
      }
    }
    
    // Verifica se é uma URL de edição
    let match = url.match(patterns.edit);
    if (match && match[1]) {
      // Converte para o formato de exportação CSV
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
    
    // Verifica se é uma URL publicada
    match = url.match(patterns.published);
    if (match) {
      // Se já for uma URL publicada, verifica se já está no formato CSV
      if (url.includes('output=csv')) {
        return url;
      } else {
        // Adiciona o parâmetro de saída CSV
        return url.includes('?') ? `${url}&output=csv` : `${url}?output=csv`;
      }
    }
    
    // Verifica se é uma URL de formulário (não suportado diretamente)
    match = url.match(patterns.form);
    if (match) {
      console.log('URLs de formulário não podem ser convertidas diretamente para CSV. Use a URL da planilha vinculada.');
      return null;
    }
    
    // Se chegou aqui, a URL não corresponde a nenhum padrão conhecido
    console.log('Formato de URL não reconhecido:', url);
    return null;
  } catch (error) {
    console.error("Erro ao converter URL:", error);
    return null;
  }
};

/**
 * Busca os dados da planilha a partir da URL
 * 
 * Esta função converte a URL para o formato CSV, faz a requisição
 * e processa o conteúdo CSV retornado.
 * 
 * @param url URL do Google Sheets em qualquer formato suportado
 * @returns Promise com os dados da planilha como array bidimensional
 * @throws Error se a URL for inválida ou se ocorrer erro na requisição
 */
export const fetchSheetData = async (url: string): Promise<string[][]> => {
  // Converte a URL para o formato CSV
  const csvUrl = convertToCSVUrl(url);
  
  if (!csvUrl) {
    throw new Error("URL inválida para conversão. Verifique se é uma URL válida do Google Sheets.");
  }
  
  try {
    console.log('Buscando dados da URL:', csvUrl);
    
    // Faz a requisição HTTP para obter o conteúdo CSV
    const response = await fetch(csvUrl, {
      // Adiciona cabeçalhos para evitar problemas de CORS
      headers: {
        'Accept': 'text/csv,text/plain,*/*'
      },
      // Adiciona cache: no-cache para evitar problemas com cache
      cache: 'no-cache'
    });
    
    // Verifica se a requisição foi bem-sucedida
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.status} ${response.statusText}`);
    }
    
    // Obtém o texto CSV da resposta
    const csvText = await response.text();
    
    // Se o texto estiver vazio, retorna um array vazio
    if (!csvText || csvText.trim() === '') {
      console.warn('A planilha retornou conteúdo vazio');
      return [];
    }
    
    // Processa o texto CSV para um array bidimensional
    return parseCSV(csvText);
  } catch (error) {
    console.error("Erro ao buscar dados da planilha:", error);
    throw new Error("Não foi possível carregar os dados da planilha. Verifique se ela está publicada como CSV e acessível publicamente.");
  }
};

/**
 * Converte texto CSV para array bidimensional
 * 
 * Esta função processa texto no formato CSV e o converte em um array
 * bidimensional, lidando corretamente com vírgulas dentro de aspas,
 * quebras de linha e outros casos especiais.
 * 
 * @param csvText Texto no formato CSV
 * @returns Array bidimensional com os dados do CSV
 */
export const parseCSV = (csvText: string): string[][] => {
  // Verifica se o texto CSV está vazio
  if (!csvText || csvText.trim() === '') {
    console.warn('Texto CSV vazio fornecido para parsing');
    return [];
  }
  
  // Detecta o separador usado (vírgula, ponto-e-vírgula, tab)
  const separator = detectSeparator(csvText);
  console.log(`Separador detectado: "${separator}"`);
  
  // Divide o texto por quebras de linha (suporta \r\n e \n)
  const lines = csvText.split(/\r?\n/);
  
  // Processa cada linha
  const result = lines.map(line => {
    // Ignora linhas vazias
    if (line.trim() === '') {
      return [];
    }
    
    // Lógica para lidar com separadores dentro de aspas
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      // Lida com aspas (início ou fim de um valor entre aspas)
      if (char === '"') {
        // Se o próximo caractere também for aspas, é um escape de aspas
        if (i + 1 < line.length && line[i + 1] === '"') {
          currentValue += '"';
          i++; // Pula o próximo caractere
        } else {
          // Caso contrário, inverte o estado de "dentro de aspas"
          inQuotes = !inQuotes;
        }
      } 
      // Se encontrar o separador e não estiver dentro de aspas, finaliza o valor atual
      else if (char === separator && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } 
      // Qualquer outro caractere é adicionado ao valor atual
      else {
        currentValue += char;
      }
    }
    
    // Adiciona o último valor da linha
    values.push(currentValue);
    
    // Limpa os valores (remove aspas extras e espaços em branco)
    return values.map(value => {
      // Remove aspas no início e fim, se existirem
      let cleaned = value.replace(/^"(.*)"$/, '$1');
      // Substitui aspas duplas por aspas simples (caso de escape de aspas)
      cleaned = cleaned.replace(/""/g, '"');
      // Remove espaços em branco no início e fim
      return cleaned.trim();
    });
  });
  
  // Filtra linhas vazias
  return result.filter(line => line.length > 0);
};

/**
 * Detecta o separador usado no texto CSV
 * 
 * Esta função tenta identificar automaticamente qual separador está sendo
 * usado no arquivo CSV (vírgula, ponto-e-vírgula ou tab).
 * 
 * @param csvText Texto no formato CSV
 * @returns Caractere separador detectado (padrão: vírgula)
 */
export const detectSeparator = (csvText: string): string => {
  // Se o texto estiver vazio, retorna vírgula como padrão
  if (!csvText || csvText.trim() === '') {
    return ',';
  }
  
  // Pega a primeira linha não vazia
  const firstLine = csvText.split(/\r?\n/).find(line => line.trim() !== '');
  
  if (!firstLine) {
    return ',';
  }
  
  // Conta ocorrências de cada possível separador
  const counts = {
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length
  };
  
  // Encontra o separador com mais ocorrências
  let maxCount = 0;
  let detectedSeparator = ','; // Padrão
  
  for (const [sep, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedSeparator = sep;
    }
  }
  
  return detectedSeparator;
};

/**
 * Converte dados CSV em array de objetos usando a primeira linha como cabeçalho
 * 
 * Esta função transforma um array bidimensional de dados CSV em um array
 * de objetos, onde cada objeto representa uma linha e as propriedades são
 * baseadas nos cabeçalhos da primeira linha.
 * 
 * @param csvData Array bidimensional com dados CSV
 * @returns Array de objetos com chaves baseadas no cabeçalho
 */
export const csvToObjects = (csvData: string[][]): Record<string, string>[] => {
  // Verifica se há dados suficientes (pelo menos cabeçalho e uma linha)
  if (!csvData || csvData.length < 1) {
    console.warn('Dados CSV insuficientes para conversão em objetos');
    return [];
  }
  
  // Se houver apenas o cabeçalho, retorna um array vazio
  if (csvData.length === 1) {
    console.warn('Dados CSV contêm apenas o cabeçalho, sem linhas de dados');
    return [];
  }
  
  // Extrai o cabeçalho (primeira linha)
  const headers = csvData[0];
  
  // Verifica se há cabeçalhos válidos
  if (headers.length === 0 || headers.every(h => h.trim() === '')) {
    console.warn('Cabeçalhos CSV inválidos ou vazios');
    return [];
  }
  
  // Normaliza os cabeçalhos (remove espaços extras, caracteres especiais)
  const normalizedHeaders = headers.map((header, index) => {
    // Se o cabeçalho estiver vazio, gera um nome padrão
    if (!header || header.trim() === '') {
      return `coluna_${index + 1}`;
    }
    return header.trim();
  });
  
  // Extrai as linhas de dados (todas exceto a primeira)
  const rows = csvData.slice(1);
  
  // Converte cada linha em um objeto
  return rows.map((row, rowIndex) => {
    const obj: Record<string, string> = {};
    
    // Para cada cabeçalho, atribui o valor correspondente da linha
    normalizedHeaders.forEach((header, index) => {
      // Se o índice existir na linha, usa o valor; caso contrário, usa string vazia
      obj[header] = index < row.length ? row[index] : '';
    });
    
    // Adiciona um ID único para cada linha (útil para referência)
    obj['_rowId'] = `row_${rowIndex + 1}`;
    
    return obj;
  });
};

/**
 * Limpa e normaliza dados de uma planilha
 * 
 * Esta função processa os dados da planilha para remover linhas vazias,
 * normalizar valores e garantir consistência nos dados.
 * 
 * @param data Array de objetos representando os dados da planilha
 * @returns Array de objetos limpos e normalizados
 */
export const cleanSheetData = (data: Record<string, string>[]): Record<string, string>[] => {
  if (!data || data.length === 0) {
    return [];
  }
  
  // Filtra linhas que não têm conteúdo significativo
  return data.filter(row => {
    // Verifica se há pelo menos um campo com conteúdo não vazio
    return Object.values(row).some(value => 
      value !== undefined && 
      value !== null && 
      value.toString().trim() !== ''
    );
  }).map(row => {
    // Cria um novo objeto para a linha limpa
    const cleanRow: Record<string, string> = {};
    
    // Processa cada campo da linha
    for (const [key, value] of Object.entries(row)) {
      // Normaliza o valor (converte null/undefined para string vazia)
      cleanRow[key] = value !== undefined && value !== null 
        ? value.toString().trim() 
        : '';
    }
    
    return cleanRow;
  });
};

/**
 * Extrai informações básicas sobre os dados da planilha
 * 
 * Esta função analisa os dados e retorna informações úteis como
 * número de linhas, colunas, tipos de dados, etc.
 * 
 * @param data Array de objetos representando os dados da planilha
 * @returns Objeto com informações sobre os dados
 */
export const getSheetInfo = (data: Record<string, string>[]): Record<string, any> => {
  if (!data || data.length === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      columns: []
    };
  }
  
  // Obtém todas as colunas únicas (combinando todas as chaves de todos os objetos)
  const allColumns = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allColumns.add(key));
  });
  
  // Remove a coluna _rowId se existir
  allColumns.delete('_rowId');
  
  // Converte para array
  const columns = Array.from(allColumns);
  
  // Analisa os tipos de dados em cada coluna
  const columnTypes: Record<string, string> = {};
  
  columns.forEach(column => {
    // Obtém todos os valores não vazios da coluna
    const values = data
      .map(row => row[column])
      .filter(value => value !== undefined && value !== null && value.trim() !== '');
    
    if (values.length === 0) {
      columnTypes[column] = 'empty';
      return;
    }
    
    // Verifica se todos os valores são números
    const allNumbers = values.every(value => !isNaN(Number(value)));
    if (allNumbers) {
      columnTypes[column] = 'number';
      return;
    }
    
    // Verifica se todos os valores são datas
    const datePattern = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
    const allDates = values.every(value => datePattern.test(value));
    if (allDates) {
      columnTypes[column] = 'date';
      return;
    }
    
    // Se não for nenhum dos tipos acima, é texto
    columnTypes[column] = 'text';
  });
  
  return {
    rowCount: data.length,
    columnCount: columns.length,
    columns,
    columnTypes
  };
};
