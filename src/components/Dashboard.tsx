import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { NPSData, NPSCategory, getNPSClassification, getNPSColor } from '../lib/npsUtils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

interface DashboardProps {
  npsData: NPSData;
}

const Dashboard: React.FC<DashboardProps> = ({ npsData }) => {
  const barData = Object.entries(npsData.respostasPorNota).map(([nota, quantidade]) => ({
    nota: parseInt(nota),
    quantidade,
    categoria: npsData.categoriaPorNota[parseInt(nota)]
  }));

  const pieData = [
    { name: 'Promotores', value: npsData.percentualPromotores, color: '#2ECC40' },
    { name: 'Neutros', value: npsData.percentualNeutros, color: '#FFDC00' },
    { name: 'Detratores', value: npsData.percentualDetratores, color: '#FF4136' }
  ];

  const npsClassification = getNPSClassification(npsData.score);
  const npsColor = getNPSColor(npsData.score);

  const getCategoryColor = (category: NPSCategory): string => {
    switch (category) {
      case NPSCategory.DETRATOR:
        return '#FF4136';
      case NPSCategory.NEUTRO:
        return '#FFDC00';
      case NPSCategory.PROMOTOR:
        return '#2ECC40';
      default:
        return '#AAAAAA';
    }
  };

  const debugInfo = {
    colunaIdentificada: npsData.colunasIdentificadas,
    respostasInvalidas: npsData.respostasInvalidas,
    colunasAnalisadas: npsData.debug?.colunasAnalisadas || [],
    valoresIgnorados: npsData.debug?.valoresIgnorados || []
  };

  return (
    <div className="space-y-8">
      <Card className="flex flex-col items-center justify-center p-6 text-center">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl font-medium text-gray-700">Pontuação NPS</CardTitle>
          {npsData?.totalRespostas !== undefined && npsData.totalRespostas !== null && (
            <CardDescription className="text-sm text-gray-500 mt-1">
              Baseado em {npsData?.totalRespostas} respostas válidas
              {npsData.respostasInvalidas > 0 && ` (${npsData.respostasInvalidas} respostas inválidas ignoradas)`}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center p-0">
          <div
            className="text-5xl font-bold rounded-full w-32 h-32 flex items-center justify-center"
            style={{ backgroundColor: npsColor, color: npsColor === '#FFDC00' ? '#333' : 'white' }}
          >
            {npsData.score !== null && npsData.score !== undefined ? npsData.score : '--'}
          </div>
          <p className="mt-4 text-lg font-medium" style={{ color: npsColor }}>
            {npsClassification}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Promotores</h3>
          <p className="text-3xl font-bold text-green-600">{npsData.percentualPromotores.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">{npsData.promotores} respostas</p>
          <p className="text-xs text-gray-400 mt-2">Notas 9-10</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Neutros</h3>
          <p className="text-3xl font-bold text-yellow-500">{npsData.percentualNeutros.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">{npsData.neutros} respostas</p>
          <p className="text-xs text-gray-400 mt-2">Notas 7-8</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Detratores</h3>
          <p className="text-3xl font-bold text-red-600">{npsData.percentualDetratores.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">{npsData.detratores} respostas</p>
          <p className="text-xs text-gray-400 mt-2">Notas 0-6</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Distribuição de Notas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nota" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`${value} respostas`, 'Quantidade']}
                  labelFormatter={(label) => `Nota ${label}`}
                />
                <Legend />
                <Bar dataKey="quantidade" name="Quantidade de Respostas">
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.categoria)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Distribuição por Categoria</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => {
                  if (typeof value === 'number') {
                    return `${value.toFixed(1)}%`;
                  }
                  return `${value}%`;
                }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-700 mb-2">Sobre o NPS</h3>
        <p className="text-gray-600">
          O Net Promoter Score (NPS) é uma métrica que mede a lealdade e satisfação dos clientes. 
          A pontuação varia de -100 a 100 e é calculada subtraindo a porcentagem de detratores 
          (notas 0-6) da porcentagem de promotores (notas 9-10).
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-red-100 rounded">
            <strong className="text-red-700">Detratores (0-6):</strong> Clientes insatisfeitos que podem prejudicar sua marca através de feedback negativo.
          </div>
          <div className="p-3 bg-yellow-100 rounded">
            <strong className="text-yellow-700">Neutros (7-8):</strong> Clientes satisfeitos, mas não entusiasmados, vulneráveis a ofertas competitivas.
          </div>
          <div className="p-3 bg-green-100 rounded">
            <strong className="text-green-700">Promotores (9-10):</strong> Clientes leais e entusiasmados que continuarão comprando e recomendando a outros.
          </div>
        </div>
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
          <h4 className="font-medium mb-2">Informações de Debug:</h4>
          <p>Coluna identificada: {debugInfo.colunaIdentificada || 'Nenhuma'}</p>
          <p>Respostas inválidas: {debugInfo.respostasInvalidas}</p>
          <p>Colunas analisadas: {debugInfo.colunasAnalisadas.join(', ') || 'Nenhuma'}</p>
          {debugInfo.valoresIgnorados.length > 0 && (
            <div>
              <p>Valores ignorados:</p>
              <ul className="list-disc pl-5">
                {debugInfo.valoresIgnorados.slice(0, 10).map((valor, index) => (
                  <li key={index}>{valor}</li>
                ))}
                {debugInfo.valoresIgnorados.length > 10 && <li>... e mais {debugInfo.valoresIgnorados.length - 10} valores</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;