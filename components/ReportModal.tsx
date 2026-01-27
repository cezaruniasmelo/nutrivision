import React, { useState } from 'react';
import { ReportData, Scenario } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReportData | null;
}

// Sub-componente para desenhar o gráfico SVG
const PredictionChart: React.FC<{ scenarios: Scenario[], currentWeight: number }> = ({ scenarios, currentWeight }) => {
  if (!scenarios || !scenarios.length) return null;

  // Configuração do Gráfico
  const width = 600;
  const height = 300;
  const padding = 40;
  
  // Encontrar limites (Min/Max Weight) para escala Y
  const allPoints = scenarios.flatMap(s => s.curve_data ? s.curve_data.map(p => p.weight) : []);
  if (allPoints.length === 0) return null;

  const maxWeight = Math.max(...allPoints, currentWeight) * 1.05;
  const minWeight = Math.min(...allPoints, currentWeight) * 0.95;
  const rangeY = maxWeight - minWeight || 1; // Prevent division by zero

  // Escala X (Meses 0 a 24)
  const maxMonth = 24;
  
  const getX = (month: number) => padding + (month / maxMonth) * (width - padding * 2);
  const getY = (weight: number) => height - padding - ((weight - minWeight) / rangeY) * (height - padding * 2);

  // Cores por cenário
  const colors = {
    inertia: '#ef4444', // Red (Perigo)
    partial: '#f59e0b', // Amber (Atenção/Realista)
    total: '#14b8a6'   // Teal (Meta)
  };

  return (
    <div className="w-full overflow-x-auto bg-slate-900/50 rounded-xl border border-slate-700 p-4">
      <h5 className="text-xs font-bold text-slate-400 uppercase mb-4 text-center">Projeção de Dinâmica de Peso (2 Anos)</h5>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
        {/* Grid Lines Y */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding + pct * (height - padding * 2);
          const val = maxWeight - pct * rangeY;
          return (
            <g key={pct}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4" />
              <text x={padding - 10} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">{val.toFixed(0)}kg</text>
            </g>
          );
        })}

        {/* Eixo X Labels */}
        {[0, 6, 12, 18, 24].map((month) => (
          <text key={month} x={getX(month)} y={height - 10} textAnchor="middle" fill="#64748b" fontSize="10">
            {month}m
          </text>
        ))}

        {/* Lines */}
        {scenarios.map((scenario) => {
          if (!scenario.curve_data || scenario.curve_data.length === 0) return null;
          const points = scenario.curve_data.map(p => `${getX(p.month)},${getY(p.weight)}`).join(' ');
          const color = colors[scenario.id as keyof typeof colors] || '#fff';
          const lastPoint = scenario.curve_data[scenario.curve_data.length-1];

          return (
            <g key={scenario.id}>
              <polyline 
                points={points} 
                fill="none" 
                stroke={color} 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="drop-shadow-md"
              />
              {/* Pontos finais */}
              <circle cx={getX(24)} cy={getY(lastPoint.weight)} r="4" fill={color} />
            </g>
          );
        })}
      </svg>
      
      {/* Legenda */}
      <div className="flex justify-center gap-6 mt-4">
        {scenarios.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[s.id as keyof typeof colors] }}></span>
            <span className="text-xs text-slate-300">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, data }) => {
  const [activeTab, setActiveTab] = useState<'auditoria' | 'simulacao'>('auditoria');

  if (!isOpen || !data) return null;

  const scenarios = data.metabolic_simulation?.scenarios || [];
  const currentWeight = scenarios.length > 0 && scenarios[0].curve_data && scenarios[0].curve_data.length > 0
    ? scenarios[0].curve_data[0].weight 
    : 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>

      <div className="relative bg-slate-800 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">NutriVision Intelligence</h3>
              <p className="text-xs text-brand-400 font-mono uppercase tracking-wider">Relatório Integrado</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/80 shrink-0">
          <button 
            onClick={() => setActiveTab('auditoria')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'auditoria' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            Auditoria Clínica (RAG)
          </button>
          <button 
            onClick={() => setActiveTab('simulacao')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'simulacao' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            Simulação de Futuro (Kevin Hall Model)
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-800">
          
          {/* TAB 1: AUDITORIA */}
          {activeTab === 'auditoria' && (
            <div className="space-y-6 animate-fadeIn">
               {/* Section 1: Análise Fisiológica */}
              <section>
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
                  <span className="w-1.5 h-4 bg-brand-500 rounded-full"></span>
                  Análise Fisiológica & Antropométrica
                </h4>
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/50 text-slate-300 leading-relaxed text-sm md:text-base shadow-inner">
                  {data.analise_fisiologica}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Section 2: Riscos */}
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
                    <span className="w-1.5 h-4 bg-red-500 rounded-full"></span>
                    Alertas de Risco (ABESO)
                  </h4>
                  <ul className="space-y-2">
                    {data.riscos_identificados && data.riscos_identificados.map((risco, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-red-100">{risco}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Section 3: Grounding */}
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
                    <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                    Base Científica (Grounding)
                  </h4>
                  <ul className="space-y-2">
                    {data.referencias_grounding && data.referencias_grounding.map((ref, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-blue-200 bg-blue-900/20 p-2 rounded border border-blue-900/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {ref}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}

          {/* TAB 2: SIMULAÇÃO */}
          {activeTab === 'simulacao' && data.metabolic_simulation && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Header Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl">
                  <p className="text-slate-400 text-xs uppercase font-bold">Taxa Metabólica Basal (TMB)</p>
                  <p className="text-2xl font-bold text-white mt-1">{data.metabolic_simulation.basal_metabolic_rate} <span className="text-sm font-normal text-slate-500">kcal/dia</span></p>
                </div>
                <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl">
                  <p className="text-slate-400 text-xs uppercase font-bold">Manutenção Estimada</p>
                  <p className="text-2xl font-bold text-white mt-1">{data.metabolic_simulation.maintenance_calories} <span className="text-sm font-normal text-slate-500">kcal/dia</span></p>
                </div>
              </div>

              {/* Gráfico */}
              <PredictionChart 
                scenarios={scenarios} 
                currentWeight={currentWeight} 
              />

              {/* Cards Comparativos */}
              <div>
                 <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Análise de Cenários (12 Meses)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {scenarios.map((scenario) => (
                      <div 
                        key={scenario.id} 
                        className={`
                          p-4 rounded-xl border relative overflow-hidden group hover:scale-[1.02] transition-transform
                          ${scenario.id === 'total' ? 'bg-brand-900/20 border-brand-500/30' : 
                            scenario.id === 'partial' ? 'bg-yellow-900/10 border-yellow-500/30' : 
                            'bg-red-900/10 border-red-500/30'}
                        `}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-bold text-white">{scenario.name}</h5>
                          <span className="text-xs font-mono opacity-70 px-2 py-0.5 rounded bg-black/20">{scenario.adherence_level}</span>
                        </div>
                        
                        <div className="my-3">
                          <span className="text-3xl font-bold text-white">{scenario.projected_weight_1yr}</span>
                          <span className="text-sm text-slate-400 ml-1">kg</span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed min-h-[60px]">
                          {scenario.health_outcome}
                        </p>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;