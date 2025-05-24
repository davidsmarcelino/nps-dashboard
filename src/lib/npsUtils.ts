/**
 * npsUtils.ts
 * * Este arquivo contém funções para cálculo e análise de NPS (Net Promoter Score),
 * incluindo identificação de colunas com notas NPS, categorização de respostas,
 * e cálculo de métricas.
 * * O código foi projetado para ser robusto com dados desorganizados e variados,
 * como os gerados pelo Google Formulários, e para processar múltiplas colunas de NPS.
 */

/**
 * Categorias de classificação NPS
 * * Cada resposta NPS é classificada em uma destas três categorias:
 * - Detrator (0-6): Cliente insatisfeito
 * - Neutro (7-8): Cliente satisfeito, mas não entusiasmado
 * - Promotor (9-10): Cliente entusiasmado e leal
 */
export enum NPSCategory {
  DETRATOR = 'detrator',
  NEUTRO = 'neutro',
  PROMOTOR = 'promotor'
}

/**
 * Interface para dados de NPS processados
 * * Esta interface define a estrutura dos dados de NPS após o processamento,
 * incluindo contagens, percentuais e distribuição de respostas.
 */
export interface NPSData {
  // Pontuação NPS final (-100 a 100)
  score: number;
  
  // Contagens absolutas
  detratores: number;
  neutros: number;
  promotores: number;
  totalRespostas: number;
  
  // Percentuais
  percentualDetratores: number;
  percentualNeutros: number;
  percentualPromotores: number;
  
  // Distribuição de respostas por nota
  respostasPorNota: Record<number, number>;
  
  // Categoria de cada nota
  categoriaPorNota: Record<number, NPSCategory>;
  
  // Informações sobre as colunas identificadas para o cálculo
  colunasIdentificadas: string[]; // MODIFICADO
  
  // Detalhes sobre respostas inválidas ou ignoradas
  respostasInvalidas: number;
  
  // Informações adicionais para debug
  debug: {
    colunasAnalisadas: string[];
    valoresIgnorados: string[];
  };
}

/**
 * Determina a categoria NPS com base na nota
 * * Esta função classifica uma nota de 0 a 10 em uma das três categorias NPS:
 * - Detrator (0-6)
 * - Neutro (7-8)
 * - Promotor (9-10)
 * * @param score Nota de 0 a 10
 * @returns Categoria NPS (detrator, neutro ou promotor)
 */
export const getNPSCategory = (score: number): NPSCategory => {
  // Verifica se o valor é um número válido
  if (isNaN(score) || score === null || score === undefined) {
    console.warn(`Valor de NPS inválido (não é um número): ${score}`);
    return NPSCategory.NEUTRO; // Valor padrão para casos inválidos
  }
  
  // Arredonda o valor para o inteiro mais próximo
  const roundedScore = Math.round(score);
  
  // Classifica de acordo com as faixas padrão do NPS
  if (roundedScore >= 0 && roundedScore <= 6) {
    return NPSCategory.DETRATOR;
  } else if (roundedScore >= 7 && roundedScore <= 8) {
    return NPSCategory.NEUTRO;
  } else if (roundedScore >= 9 && roundedScore <= 10) {
    return NPSCategory.PROMOTOR;
  }
  
  // Para valores fora da faixa 0-10, exibe aviso e retorna neutro
  console.warn(`Valor de NPS fora da faixa 0-10: ${score}`);
  return NPSCategory.NEUTRO;
};

/**
 * Verifica se um valor pode ser convertido para um número válido de NPS
 * * Esta função tenta converter um valor de string para número e verifica
 * se está na faixa válida de NPS (0-10).
 * * @param value Valor a ser verificado (string ou número)
 * @returns Objeto com o valor numérico e flag de validade
 */
export const parseNPSValue = (value: any): { valid: boolean; value: number | null } => {
  // Se o valor for nulo ou indefinido, retorna inválido
  if (value === null || value === undefined || value === '') {
    return { valid: false, value: null };
  }
  
  // Se já for um número, verifica se está na faixa válida
  if (typeof value === 'number') {
    const isValid = !isNaN(value) && value >= 0 && value <= 10;
    return { valid: isValid, value: isValid ? value : null };
  }
  
  // Converte para string e remove espaços
  const strValue = String(value).trim();
  
  // Tenta extrair um número da string
  // Primeiro tenta converter diretamente
  let numValue = parseFloat(strValue);
  
  // Se não for um número válido, tenta extrair dígitos do início da string
  if (isNaN(numValue)) {
    const match = strValue.match(/^(\d+)/);
    if (match) {
      numValue = parseInt(match[1], 10);
    } else {
      // Casos especiais: verifica palavras que podem indicar valores
      const lowerValue = strValue.toLowerCase();
      
      // Mapeia palavras para valores numéricos (útil para respostas textuais)
      const wordToValue: Record<string, number> = {
        'péssimo': 0, 'pessimo': 0, 'ruim': 2, 'insatisfeito': 3,
        'regular': 5, 'médio': 5, 'medio': 5, 'neutro': 7,
        'bom': 8, 'satisfeito': 8, 'ótimo': 9, 'otimo': 9, 
        'excelente': 10, 'muito bom': 9, 'perfeito': 10
      };
      
      // Verifica se alguma palavra-chave está presente
      for (const [word, val] of Object.entries(wordToValue)) {
        if (lowerValue.includes(word)) {
          numValue = val;
          break;
        }
      }
    }
  }
  
  // Verifica se o valor está na faixa válida de NPS (0-10)
  const isValid = !isNaN(numValue) && numValue >= 0 && numValue <= 10;
  
  return { valid: isValid, value: isValid ? numValue : null };
};

/**
 * Analisa os valores de uma coluna para determinar se contém notas NPS
 * * Esta função examina os valores de uma coluna e calcula estatísticas
 * que ajudam a determinar se ela contém notas NPS válidas.
 * * @param data Dados da planilha
 * @param column Nome da coluna a ser analisada
 * @returns Estatísticas da coluna
 */
const analyzeColumnValues = (data: Record<string, string>[], column: string): {
  validCount: number;
  validPercentage: number;
  averageValue: number;
  hasExpectedRange: boolean;
} => {
  let validCount = 0;
  let sum = 0;
  const values: number[] = [];
  
  // Analisa cada valor na coluna
  for (const row of data) {
    // Verifica se a linha realmente tem a propriedade da coluna antes de acessá-la
    if (row.hasOwnProperty(column)) {
        const result = parseNPSValue(row[column]);
        if (result.valid && result.value !== null) {
        validCount++;
        sum += result.value;
        values.push(result.value);
        }
    }
  }
  
  // Calcula estatísticas
  const validPercentage = data.length > 0 ? (validCount / data.length) * 100 : 0;
  const averageValue = validCount > 0 ? sum / validCount : 0;
  
  // Verifica se os valores estão distribuídos na faixa esperada de NPS (0-10)
  let hasLowValues = false;  // 0-3
  let hasMidValues = false;  // 4-7
  let hasHighValues = false; // 8-10
  
  for (const value of values) {
    if (value >= 0 && value <= 3) hasLowValues = true;
    if (value >= 4 && value <= 7) hasMidValues = true;
    if (value >= 8 && value <= 10) hasHighValues = true;
  }
  
  const hasExpectedRange = 
    (hasLowValues && hasMidValues) || 
    (hasMidValues && hasHighValues) || 
    (hasLowValues && hasHighValues) ||
    (values.length > 0 && (hasLowValues || hasMidValues || hasHighValues)); // Considera válido se houver algum valor NPS válido

  return {
    validCount,
    validPercentage,
    averageValue,
    hasExpectedRange
  };
};

/**
 * Identifica as colunas que contêm as notas de NPS
 * * Esta função analisa os dados da planilha e tenta identificar quais colunas
 * contêm as notas de NPS (valores de 0 a 10).
 * * @param data Dados da planilha como array de objetos
 * @returns Objeto com a lista de nomes das colunas identificadas e estatísticas
 */
export const identifyNPSColumns = (data: Record<string, string>[]): { 
  columns: string[]; 
  stats: { 
    analyzedColumns: string[];
  } 
} => {
  if (!data || data.length === 0) {
    return { 
      columns: [], 
      stats: { analyzedColumns: [] } 
    };
  }

  const possibleColumnNames = [
    'nps', 'nota', 'score', 'avaliação', 'avaliacao', 'nota nps', 'pontuação', 'pontuacao',
    'recomendação', 'recomendacao', 'indicação', 'indicacao', 'satisfação', 'satisfacao',
    'classificação', 'classificacao', 'rating', 'rate', 'nota de 0 a 10', 'avaliação de 0 a 10',
    'qual nota você daria', 'qual nota voce daria', 'de 0 a 10', 'escala de 0 a 10'
  ];
  
  const firstRow = data[0];
  const allColumnHeaders = Object.keys(firstRow);
  const identifiedColumns: string[] = [];
  const analyzedColumns: string[] = [];

  for (const column of allColumnHeaders) {
    if (column === '_rowId') continue; 
    
    analyzedColumns.push(column);
    const columnLower = column.toLowerCase();
    const stats = analyzeColumnValues(data, column);

    const isNameSuggestive = possibleColumnNames.some(name => columnLower.includes(name));

    if (isNameSuggestive && stats.validPercentage >= 30 && stats.hasExpectedRange) {
      identifiedColumns.push(column);
      console.log(`Coluna NPS identificada (nome e conteúdo): ${column} (${stats.validPercentage.toFixed(1)}% válidos)`);
    } else if (!isNameSuggestive && stats.validPercentage >= 50 && stats.hasExpectedRange) {
      identifiedColumns.push(column);
      console.log(`Coluna NPS identificada (apenas conteúdo): ${column} (${stats.validPercentage.toFixed(1)}% válidos)`);
    } else if (isNameSuggestive && stats.validPercentage >= 10 && stats.hasExpectedRange) { // Um pouco mais leniente se o nome for muito sugestivo
        identifiedColumns.push(column);
        console.log(`Coluna NPS identificada (nome sugestivo, conteúdo mínimo): ${column} (${stats.validPercentage.toFixed(1)}% válidos)`);
    }
  }

  const uniqueIdentifiedColumns = Array.from(new Set(identifiedColumns));

  if (uniqueIdentifiedColumns.length === 0) {
    console.warn('Não foi possível identificar automaticamente colunas com notas NPS. Verifique os cabeçalhos ou o conteúdo das colunas.');
  } else {
    console.log('Colunas de NPS identificadas para cálculo:', uniqueIdentifiedColumns);
  }

  return { 
    columns: uniqueIdentifiedColumns, 
    stats: { 
      analyzedColumns 
    } 
  };
};

/**
 * Calcula o NPS a partir dos dados da planilha, considerando múltiplas colunas de score.
 * * Esta função processa os dados da planilha, identifica as colunas com notas NPS
 * (ou usa as colunas especificadas), e calcula todas as métricas do NPS.
 * * @param data Dados da planilha como array de objetos
 * @param npsScoreColumns Nomes das colunas que contêm as notas NPS (opcional). Se não fornecido, tenta identificar automaticamente.
 * @returns Dados de NPS processados ou null se não for possível calcular (ou uma estrutura NPSData com valores zerados em caso de falha).
 */
export const calculateNPS = (data: Record<string, string>[], npsScoreColumns?: string[]): NPSData => {
  const emptyNPSData = (colsIdentified: string[] = [], colsAnalyzed: string[] = [], valsIgnored: string[] = []): NPSData => ({
    score: 0,
    detratores: 0,
    neutros: 0,
    promotores: 0,
    totalRespostas: 0,
    percentualDetratores: 0,
    percentualNeutros: 0,
    percentualPromotores: 0,
    respostasPorNota: {},
    categoriaPorNota: {},
    colunasIdentificadas: colsIdentified,
    respostasInvalidas: valsIgnored.length,
    debug: {
      colunasAnalisadas: colsAnalyzed,
      valoresIgnorados: valsIgnored
    }
  });

  if (!data || data.length === 0) {
    console.warn('Dados vazios fornecidos para cálculo de NPS');
    return emptyNPSData();
  }

  let identifiedScoreColumns: string[];
  let columnIdentificationStats = { analyzedColumns: Object.keys(data[0] || []) };

  if (npsScoreColumns && npsScoreColumns.length > 0) {
    identifiedScoreColumns = npsScoreColumns;
  } else {
    const result = identifyNPSColumns(data);
    identifiedScoreColumns = result.columns;
    columnIdentificationStats = result.stats;
    
    if (identifiedScoreColumns.length === 0) {
      console.error('Não foi possível identificar colunas com as notas NPS para o cálculo.');
      return emptyNPSData([], columnIdentificationStats.analyzedColumns);
    }
  }
  
  let detratores = 0;
  let neutros = 0;
  let promotores = 0;
  let totalRespostas = 0;
  let respostasInvalidasCount = 0; // Renomeado para evitar conflito com a propriedade da interface
  const respostasPorNota: Record<number, number> = {};
  const categoriaPorNota: Record<number, NPSCategory> = {};
  const valoresIgnorados: string[] = [];

  for (let i = 0; i <= 10; i++) {
    respostasPorNota[i] = 0;
    categoriaPorNota[i] = getNPSCategory(i);
  }

  for (const row of data) {
    for (const scoreColumn of identifiedScoreColumns) {
      if (row.hasOwnProperty(scoreColumn)) {
        const scoreValue = row[scoreColumn];
        const result = parseNPSValue(scoreValue);
        
        if (result.valid && result.value !== null) {
          const score = result.value;
          totalRespostas++;
          
          respostasPorNota[Math.round(score)] = (respostasPorNota[Math.round(score)] || 0) + 1;
          
          const category = getNPSCategory(score);
          
          if (category === NPSCategory.DETRATOR) {
            detratores++;
          } else if (category === NPSCategory.NEUTRO) {
            neutros++;
          } else if (category === NPSCategory.PROMOTOR) {
            promotores++;
          }
        } else if (scoreValue !== undefined && scoreValue !== null && String(scoreValue).trim() !== '') {
          respostasInvalidasCount++;
          if (!valoresIgnorados.includes(String(scoreValue))) {
            valoresIgnorados.push(String(scoreValue));
          }
        }
      }
    }
  }
  
  if (totalRespostas === 0) {
    console.warn('Nenhuma resposta válida encontrada nas colunas NPS especificadas/identificadas.');
    return emptyNPSData(identifiedScoreColumns, columnIdentificationStats.analyzedColumns, valoresIgnorados);
  }
  
  const percentualDetratores = (detratores / totalRespostas) * 100;
  const percentualNeutros = (neutros / totalRespostas) * 100;
  const percentualPromotores = (promotores / totalRespostas) * 100;
  
  const npsScore = percentualPromotores - percentualDetratores;
  
  return {
    score: Math.round(npsScore),
    detratores,
    neutros,
    promotores,
    totalRespostas,
    percentualDetratores,
    percentualNeutros,
    percentualPromotores,
    respostasPorNota,
    categoriaPorNota,
    colunasIdentificadas: identifiedScoreColumns,
    respostasInvalidas: respostasInvalidasCount,
    debug: {
      colunasAnalisadas: columnIdentificationStats.analyzedColumns,
      valoresIgnorados
    }
  };
};

/**
 * Obtém a classificação qualitativa do NPS
 * * Esta função converte a pontuação numérica do NPS (-100 a 100)
 * em uma classificação qualitativa.
 * * @param score Pontuação NPS (-100 a 100)
 * @returns Classificação qualitativa
 */
export const getNPSClassification = (score: number): string => {
  if (score < 0) {
    return 'Crítico';
  } else if (score >= 0 && score <= 30) {
    return 'Ruim';
  } else if (score > 30 && score <= 50) {
    return 'Bom';
  } else if (score > 50 && score <= 75) {
    return 'Muito Bom';
  } else {
    return 'Excelente';
  }
};

/**
 * Obtém a cor associada à classificação do NPS
 * * Esta função retorna um código de cor hexadecimal correspondente
 * à classificação do NPS, para uso em elementos visuais.
 * * @param score Pontuação NPS (-100 a 100)
 * @returns Código de cor hexadecimal
 */
export const getNPSColor = (score: number): string => {
  if (score < 0) {
    return '#FF4136'; // Vermelho
  } else if (score >= 0 && score <= 30) {
    return '#FF851B'; // Laranja
  } else if (score > 30 && score <= 50) {
    return '#FFDC00'; // Amarelo
  } else if (score > 50 && score <= 75) {
    return '#2ECC40'; // Verde
  } else {
    return '#0074D9'; // Azul
  }
};