import React, { useState, useMemo } from 'react';
import { ReportData, Scenario } from '../types';

interface PredictiveSimulatorProps {
  reportData: ReportData;
  onReset: () => void;
}

const PredictiveSimulator: React.FC<PredictiveSimulatorProps> = ({ reportData, onReset }) => {
  const [adherence, setAdherence] = useState<number>(60);
  const [timeHorizon, setTimeHorizon] = useState<number>(12);

  const scenarios = reportData.metabolic_simulation?.scenarios || [];
  
  // Safe access to initial weight
  const currentWeight = scenarios.length > 0 && scenarios[0].curve_data && scenarios[0].curve_data.length > 0
    ? scenarios[0].curve_data[0].weight
    : 70; // Fallback default

  // Lógica de Interpolação
  const interpolatedResult = useMemo(() => {
    if (scenarios.length === 0) {
        return { projectedWeight: currentWeight, weightChange: 0, riskScore: 0 };
    }

    let lowerScenario: Scenario | undefined;
    let upperScenario: Scenario | undefined;
    let ratio: number;

    const inertia = scenarios.find(s => s.id === 'inertia');
    const partial = scenarios.find(s => s.id === 'partial');
    const total = scenarios.find(s => s.id === 'total');

    // Fallback if specific scenarios are missing
    if (!inertia || !partial || !total) {
         return { projectedWeight: currentWeight, weightChange: 0, riskScore: 0 };
    }

    if (adherence <= 60) {
      lowerScenario = inertia;
      upperScenario = partial;
      ratio = adherence / 60;
    } else {
      lowerScenario = partial;
      upperScenario = total;
      ratio = (adherence - 60) / 40;
    }

    const getWeightAtMonth = (scenario: Scenario, month: number) => {
      const point = scenario.curve_data.find(p => p.month >= month) || scenario.curve_data[scenario.curve_data.length - 1];
      return point ? point.weight : currentWeight;
    };

    const wLower = getWeightAtMonth(lowerScenario, timeHorizon);
    const wUpper = getWeightAtMonth(upperScenario, timeHorizon);
    
    const projectedWeight = wLower + (wUpper - wLower) * ratio;
    const weightChange = projectedWeight - currentWeight;
    const riskScore = Math.max(0, 100 - adherence * 1.2); 

    return { projectedWeight, weightChange, riskScore };
  }, [adherence, timeHorizon, scenarios, currentWeight]);

  if (scenarios.length === 0) {
      return (
          <div className="flex flex-col h-full bg-slate-900 animate-fadeIn items-center justify-center text-white">
              <p className="mb-4">Dados de simulação indisponíveis.</p>
              <button onClick={onReset} className="text-sm font-bold bg-brand-600 hover:bg-brand-500 shadow-lg px-6 py-2 rounded-lg">
                Voltar
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 animate-fadeIn overflow-y-auto">
      {/* Top Bar - Results Mode */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-brand-500">◆</span> Análise Preditiva & Futuro
          </h2>
          <p className="text-slate-400 text-sm">Auditoria Cruzada: Exames vs Visão Computacional</p>
        </div>
        <button onClick={onReset} className="text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/20 px-6 py-2 rounded-lg transition-all">
          Concluir Atendimento
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        
        {/* Left Panel: Controls & Data Fusion */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* NEW: Auditoria Cruzada (Data Fusion Card) */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
             <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 flex justify-between items-center">
               <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                 </svg>
                 Auditoria de Dados
               </h3>
               <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600">Exame vs AI</span>
             </div>
             <div className="p-4 space-y-4">
                {reportData.comparativo_dados && reportData.comparativo_dados.length > 0 ? (
                  reportData.comparativo_dados.map((comp, idx) => (
                  <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 hover:border-brand-500/30 transition-colors">
                     <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-bold text-white">{comp.metric}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold tracking-wider ${comp.correlation === 'high' ? 'bg-green-900/20 text-green-400 border-green-900' : comp.correlation === 'medium' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900' : 'bg-red-900/20 text-red-400 border-red-900'}`}>
                           {comp.correlation === 'high' ? 'COMPATÍVEL' : comp.correlation === 'medium' ? 'DIVERGÊNCIA LEVE' : 'DISCREPÂNCIA'}
                        </span>
                     </div>
                     <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-slate-800 rounded p-2 border border-slate-700">
                           <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Fonte: Exame/Bio</span>
                           <span className="text-white font-mono text-sm">{comp.source_exam}</span>
                        </div>
                        <div className="bg-brand-900/10 rounded p-2 border border-brand-900/30 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-2 h-2 bg-brand-500 rounded-bl-full"></div>
                           <span className="block text-[10px] text-brand-300 uppercase font-bold mb-1">Fonte: Vision AI</span>
                           <span className="text-brand-400 font-mono text-sm">{comp.source_vision}</span>
                        </div>
                     </div>
                     <p className="text-xs text-slate-400 italic border-t border-slate-700/50 pt-2 leading-relaxed">
                        <span className="text-brand-500 font-bold not-italic mr-1">Insight:</span>
                        {comp.insight}
                     </p>
                  </div>
                ))) : (
                    <p className="text-slate-500 text-xs text-center py-4">Nenhum dado comparativo gerado.</p>
                )}
             </div>
          </div>

          {/* Adherence Control */}
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-4 relative z-10">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wide">Adesão ao Plano</label>
              <span className={`text-xl font-bold ${adherence > 80 ? 'text-brand-400' : adherence > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {adherence}%
              </span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={adherence} 
              onChange={(e) => setAdherence(Number(e.target.value))}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500 relative z-10"
            />
             <p className="mt-3 text-xs text-slate-400 leading-relaxed">
               Ajuste o slider para simular o impacto do comprometimento do paciente nos resultados futuros.
             </p>
          </div>
        </div>

        {/* Right Panel: Visualization & Digital Twin */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Projection Card */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            {/* Visual Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-slate-400 font-medium mb-1 uppercase text-xs tracking-widest">Peso Estimado ({timeHorizon} meses)</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-white tracking-tight">
                    {interpolatedResult.projectedWeight.toFixed(1)}
                  </span>
                  <span className="text-xl text-slate-500">kg</span>
                </div>
                
                <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${interpolatedResult.weightChange <= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {interpolatedResult.weightChange <= 0 ? 'Perda de' : 'Ganho de'} {Math.abs(interpolatedResult.weightChange).toFixed(1)} kg
                </div>
              </div>

              {/* Dynamic Risk Gauge */}
              <div className="flex flex-col items-center">
                 <div className="relative w-48 h-24 overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full bg-slate-800 rounded-t-full border-t-8 border-slate-700"></div>
                   <div 
                      className="absolute top-0 left-0 w-full h-full rounded-t-full origin-bottom transition-transform duration-700 ease-out border-t-8"
                      style={{ 
                        borderColor: interpolatedResult.riskScore > 60 ? '#ef4444' : interpolatedResult.riskScore > 30 ? '#f59e0b' : '#14b8a6',
                        transform: `rotate(${ (interpolatedResult.riskScore / 100) * 180 - 180 }deg)` 
                      }}
                   ></div>
                </div>
                <p className="mt-2 text-slate-400 font-bold uppercase tracking-widest text-xs">Risco Metabólico</p>
              </div>
            </div>
          </div>

          {/* Body Transformation Visualizer */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col relative overflow-hidden min-h-[300px]">
            <h4 className="text-slate-400 text-sm uppercase mb-6 w-full text-left relative z-10">Transformação Digital (Malha Estimada)</h4>
            
            <div className="flex-1 flex items-center justify-around relative z-10">
              {/* Current State */}
              <div className="flex flex-col items-center gap-4 group">
                 <div className="relative h-48 w-16 bg-slate-700/50 rounded-full border border-slate-600 flex items-center justify-center">
                    <div className="w-1 h-32 bg-slate-600 rounded"></div>
                    {/* Simulated Skeleton Lines */}
                    <div className="absolute w-12 h-1 bg-slate-600 top-10"></div>
                    <div className="absolute w-10 h-1 bg-slate-600 top-24"></div>
                 </div>
                 <span className="text-xs font-bold text-slate-400 uppercase">Hoje</span>
              </div>

              {/* Progress Arrow */}
              <div className="h-0.5 w-24 bg-gradient-to-r from-slate-700 to-brand-500 relative">
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-500 rotate-45 transform translate-x-1"></div>
              </div>

              {/* Projected State */}
              <div className="flex flex-col items-center gap-4">
                 <div 
                    className="relative h-48 w-16 rounded-full border flex items-center justify-center transition-all duration-700 shadow-[0_0_40px_rgba(20,184,166,0.2)]"
                    style={{ 
                        width: `${Math.max(40, 64 + (interpolatedResult.weightChange * 1.5))}px`,
                        borderColor: interpolatedResult.riskScore > 50 ? '#f59e0b' : '#14b8a6',
                        backgroundColor: interpolatedResult.riskScore > 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(20, 184, 166, 0.1)'
                    }}
                 >
                    <div className="w-1 h-32 bg-white/20 rounded"></div>
                    <div className="absolute w-12 h-1 bg-white/20 top-10"></div>
                    <div className="absolute w-10 h-1 bg-white/20 top-24"></div>
                 </div>
                 <span className="text-xs font-bold text-white uppercase text-brand-400">Futuro ({timeHorizon}m)</span>
              </div>
            </div>

            {/* Background Grid */}
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          </div>
          
          {/* Time Control */}
          <div className="flex gap-4">
            {[6, 12, 24].map((m) => (
                <button
                    key={m}
                    onClick={() => setTimeHorizon(m)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                    timeHorizon === m 
                    ? 'bg-slate-700 border-brand-500 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                    }`}
                >
                    {m} Meses
                </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PredictiveSimulator;