/**
 * App.tsx
 * 
 * Componente principal da aplicação Dashboard NPS.
 * 
 * Este componente gerencia:
 * - A entrada da URL da planilha pelo usuário
 * - O carregamento e processamento dos dados
 * - A exibição do dashboard com os resultados do NPS
 * 
 * O código foi projetado para ser robusto com diferentes formatos de planilha
 * e tratar erros de forma amigável ao usuário.
 */

import { useState } from 'react'
import './App.css'
import { fetchSheetData, csvToObjects, cleanSheetData, getSheetInfo } from './lib/sheetUtils'
import { calculateNPS } from './lib/npsUtils'
import Dashboard from './components/Dashboard'

// Tipos para melhorar a tipagem e evitar o uso de "any"
import type { NPSData } from './lib/npsUtils'

function App() {
  // Estado para armazenar a URL da planilha
  const [url, setUrl] = useState('')
  
  // Estado para controlar o carregamento
  const [isLoading, setIsLoading] = useState(false)
  
  // Estado para armazenar mensagens de erro
  const [error, setError] = useState('')
  
  // Estado para controlar a exibição do dashboard
  const [showDashboard, setShowDashboard] = useState(false)
  
  // Estado para armazenar os dados processados do NPS
  const [npsData, setNpsData] = useState<NPSData | null>(null)
  
  // Estado para armazenar informações sobre os dados carregados
  const [dataInfo, setDataInfo] = useState<{
    totalRows: number;
    processedRows: number;
    identifiedColumn: string | null;
  } | null>(null)

  /**
   * Valida se a URL fornecida é uma URL válida do Google Sheets
   * 
   * Esta função verifica se a URL corresponde aos padrões conhecidos
   * de URLs do Google Sheets, incluindo URLs de edição e publicadas.
   * 
   * @param url URL a ser validada
   * @returns true se a URL for válida, false caso contrário
   */
  const validateUrl = (url: string): boolean => {
    // Se a URL estiver vazia, retorna false
    if (!url || url.trim() === '') {
      return false;
    }
    
    // Padrões para diferentes formatos de URL do Google Sheets
    const patterns = {
      // URL de edição normal
      edit: /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/edit/,
      // URL publicada
      published: /https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)\/pub/,
      // URL de exportação
      export: /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/export/,
      // URL de formulário (não suportada diretamente)
      form: /https:\/\/docs\.google\.com\/forms\/d\/([a-zA-Z0-9-_]+)/
    };
    
    // Verifica se a URL corresponde a algum dos padrões válidos
    return patterns.edit.test(url) || 
           patterns.published.test(url) || 
           patterns.export.test(url);
  }

  /**
   * Manipula o envio do formulário para carregar e processar os dados
   * 
   * Esta função é chamada quando o usuário clica no botão "Carregar Dados".
   * Ela valida a URL, busca os dados da planilha, processa-os e calcula o NPS.
   * 
   * @param e Evento de formulário
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Previne o comportamento padrão do formulário
    e.preventDefault();
    
    // Limpa mensagens de erro anteriores
    setError('');
    
    // Valida se a URL foi fornecida
    if (!url.trim()) {
      setError('Por favor, insira a URL da planilha');
      return;
    }

    // Valida se a URL é válida
    if (!validateUrl(url)) {
      setError('Por favor, insira uma URL válida do Google Sheets');
      return;
    }

    // Inicia o carregamento
    setIsLoading(true);
    
    try {
      console.log('Iniciando carregamento dos dados da planilha:', url);
      
      // Busca os dados da planilha como CSV
      const csvData = await fetchSheetData(url);
      
      // Verifica se há dados
      if (!csvData || csvData.length === 0) {
        throw new Error('A planilha está vazia ou não foi possível acessá-la. Verifique se ela está publicada corretamente.');
      }
      
      console.log(`Dados CSV carregados: ${csvData.length} linhas`);
      
      // Converte os dados CSV para objetos
      let objectData = csvToObjects(csvData);
      
      // Verifica se há dados após a conversão
      if (objectData.length === 0) {
        throw new Error('Nenhum dado válido encontrado na planilha após processamento.');
      }
      
      // Limpa e normaliza os dados
      objectData = cleanSheetData(objectData);
      
      // Obtém informações sobre os dados
      const sheetInfo = getSheetInfo(objectData);
      
      console.log(`Dados processados: ${objectData.length} linhas, ${sheetInfo.columns.length} colunas`);
      
      // Calcula o NPS
      const calculatedNPS = calculateNPS(objectData);
      
      // Verifica se foi possível calcular o NPS
      if (!calculatedNPS) {
        throw new Error(
          'Não foi possível calcular o NPS. Verifique se a planilha contém uma coluna com notas de 0 a 10. ' +
          'A coluna pode ter qualquer nome, mas os valores devem ser números entre 0 e 10.'
        );
      }
      
      console.log(`NPS calculado: ${calculatedNPS.score} (${calculatedNPS.totalRespostas} respostas válidas)`);
      
      // Armazena os dados processados
      setNpsData(calculatedNPS);
      
      // Armazena informações sobre os dados
      setDataInfo({
        totalRows: objectData.length,
        processedRows: calculatedNPS.totalRespostas,
        identifiedColumn: calculatedNPS.colunaIdentificada
      });
      
      // Finaliza o carregamento
      setIsLoading(false);
      
      // Exibe o dashboard
      setShowDashboard(true);
    } catch (err: any) {
      // Em caso de erro, finaliza o carregamento e exibe a mensagem
      setIsLoading(false);
      
      // Formata a mensagem de erro para ser mais amigável
      const errorMessage = err.message || 'Erro desconhecido ao carregar os dados da planilha';
      setError(errorMessage);
      
      console.error('Erro ao processar dados:', err);
    }
  }

  /**
   * Renderiza a interface da aplicação
   * 
   * A interface tem duas partes principais:
   * 1. Formulário para entrada da URL da planilha
   * 2. Dashboard com os resultados do NPS
   */
  return (
    <div className="min-h-screen bg-gray-50">
      {!showDashboard ? (
        // Tela inicial com formulário para entrada da URL
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard NPS</h1>
              <p className="text-gray-600">
                Insira a URL da sua planilha do Google Sheets para visualizar os resultados do NPS
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="sheet-url" className="block text-sm font-medium text-gray-700">
                  URL da Planilha
                </label>
                <input
                  id="sheet-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-2">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                    isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  } transition-colors`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Carregando...
                    </span>
                  ) : 'Carregar Dados'}
                </button>
                
                <p className="text-sm text-gray-500 text-center">
                  Certifique-se de que sua planilha esteja publicada na web como CSV
                </p>
              </div>
            </form>
            
            <div className="mt-8 border-t pt-6">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Como usar:</h2>
              <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                <li>Abra sua planilha do Google Sheets</li>
                <li>Vá em Arquivo &gt; Compartilhar &gt; Publicar na web</li>
                <li>Selecione a planilha específica e formato CSV</li>
                <li>Clique em "Publicar" e copie o link</li>
                <li>Cole o link acima e clique em "Carregar Dados"</li>
              </ol>
              
              <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4">
                <h3 className="text-blue-700 font-medium">Dicas para planilhas do Google Formulários:</h3>
                <ul className="list-disc pl-5 mt-2 text-sm text-gray-600 space-y-1">
                  <li>O sistema identifica automaticamente a coluna com notas de NPS (0-10)</li>
                  <li>Funciona com planilhas desorganizadas e diferentes formatos de dados</li>
                  <li>Não é necessário formatar ou organizar a planilha antes de usar</li>
                  <li>Suporta planilhas com textos, números, datas e outros tipos de dados misturados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Dashboard com os resultados do NPS
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard NPS</h1>
                {dataInfo && (
                  <p className="text-sm text-gray-500">
                    {dataInfo.processedRows} respostas válidas de {dataInfo.totalRows} linhas
                    {dataInfo.identifiedColumn && ` (coluna: ${dataInfo.identifiedColumn})`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDashboard(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-700 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors"
                >
                  Imprimir
                </button>
              </div>
            </div>
            
            {npsData ? (
              // Exibe o dashboard se houver dados
              <Dashboard npsData={npsData} />
            ) : (
              // Exibe mensagem se não houver dados
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-gray-600">
                  Não foi possível calcular o NPS com os dados fornecidos.
                </p>
                <p className="mt-2 text-gray-500 text-sm">
                  Verifique se a planilha contém uma coluna com valores de 0 a 10.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
