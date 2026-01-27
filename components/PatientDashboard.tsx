import React from 'react';
import { TimelineEvent, PatientData } from '../types';

interface PatientDashboardProps {
  onNewScan: () => void;
  professionalName: string;
  patientData: PatientData | null;
  onChangePatient: () => void;
}

// Mock Data for the Timeline (Static for now, but could be dynamic)
const MOCK_TIMELINE: TimelineEvent[] = [
  { id: '1', date: '15 Out 2023', type: 'scan', summary: 'Scan Inicial - Risco Moderado' },
  { id: '2', date: '20 Nov 2023', type: 'lab', summary: 'Exames de Sangue (Glicemia Alta)' },
  { id: '3', date: '15 Jan 2024', type: 'scan', summary: 'Retorno - Perda de 2kg de Gordura' },
];

const PatientDashboard: React.FC<PatientDashboardProps> = ({ onNewScan, professionalName, patientData, onChangePatient }) => {
  
  // Safe Fallback
  if (!patientData) return null;

  return (
    <div className="flex flex-col h-full animate-fadeIn p-6 md:p-10 max-w-6xl mx-auto w-full font-sans">
      {/* Header - Welcome Professional */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <button onClick={onChangePatient} className="text-xs font-bold text-slate-500 hover:text-brand-500 uppercase tracking-widest mb-2 flex items-center gap-1 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Trocar Paciente
          </button>
          <h2 className="text-4xl font-bold text-white tracking-tight">Painel de Atendimento</h2>
          <p className="text-slate-400 text-base mt-1">
             Paciente Ativo: <span className="text-white font-bold">{patientData.name}</span>
          </p>
        </div>
        <button 
          onClick={onNewScan}
          className="bg-brand-500 hover:bg-brand-400 text-slate-900 px-8 py-4 rounded-full font-bold shadow-[0_4px_20px_rgba(161,234,147,0.3)] flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Novo Scan 3D
        </button>
      </div>

      {/* Active Patient Context (Card Style) */}
      <div className="mb-8 flex flex-col md:flex-row items-center gap-4 p-6 bg-slate-800 rounded-[2rem] border border-slate-700/50 shadow-sm">
        <div className="flex items-center gap-4 flex-1 w-full">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-brand-500 font-bold border-2 border-slate-600 text-xl shrink-0 overflow-hidden">
                {patientData.photoURL ? (
                    <img src={patientData.photoURL} alt={patientData.name} className="w-full h-full object-cover" />
                ) : (
                    patientData.name.split(' ').map(n => n[0]).join('').substring(0, 2)
                )}
            </div>
            <div>
                <p className="text-xs text-brand-500 font-bold uppercase tracking-wider mb-1">Paciente em Foco</p>
                <p className="text-white font-bold text-2xl">{patientData.name}</p>
                <p className="text-slate-500 text-sm">{patientData.age} Anos • {patientData.gender} • {patientData.height}cm</p>
            </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto mt-4 md:mt-0">
            <div className="px-6 py-3 bg-slate-900 rounded-2xl border border-slate-700 flex-1 text-center md:text-left">
                <span className="block text-xs text-slate-500 uppercase font-bold">Último Peso</span>
                <span className="text-white font-bold text-lg">{patientData.weight}kg</span>
            </div>
             <div className="px-6 py-3 bg-slate-900 rounded-2xl border border-slate-700 flex-1 text-center md:text-left">
                <span className="block text-xs text-slate-500 uppercase font-bold">Status</span>
                <span className="text-green-400 font-bold text-lg flex items-center gap-1 justify-center md:justify-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Ativo
                </span>
            </div>
        </div>
      </div>

      {/* Main Stats Cards (Patient Data) - FitLife Bubbly Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 hover:border-brand-500/50 transition-all hover:-translate-y-1">
          <div className="flex justify-between items-start mb-4">
             <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide">Peso Atual</p>
             <div className="p-2 bg-green-900/30 rounded-full text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
             </div>
          </div>
          <p className="text-5xl font-bold text-white tracking-tight">{patientData.weight} <span className="text-xl text-slate-500 font-normal">kg</span></p>
          <div className="mt-4 inline-block px-3 py-1 rounded-full bg-slate-700 text-slate-400 text-xs font-bold border border-slate-600">
            Aguardando novo scan
          </div>
        </div>

        <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 hover:border-brand-500/50 transition-all hover:-translate-y-1">
          <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-4">Gordura Corporal</p>
          <p className="text-5xl font-bold text-white tracking-tight">
            {patientData.bioimpedanceBF ? patientData.bioimpedanceBF : '--'} <span className="text-xl text-slate-500 font-normal">%</span>
          </p>
          <div className="mt-4 text-slate-500 text-sm">
             {patientData.bioimpedanceBF ? 'Dado de Bioimpedância' : 'Necessário Scan'}
          </div>
        </div>

        <div className="bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 hover:border-brand-500/50 transition-all hover:-translate-y-1">
          <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-4">Objetivo Clínico</p>
          <p className="text-3xl font-bold text-yellow-500 tracking-tight capitalize">{patientData.clinicalGoal === 'weight_loss' ? 'Emagrecimento' : patientData.clinicalGoal}</p>
          <div className="mt-4 text-slate-500 text-sm">Foco do Plano</div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex-1 bg-slate-800/50 rounded-[2.5rem] border border-slate-700 p-8">
        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-slate-900">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Histórico Clínico (Demo)
        </h3>
        
        <div className="relative border-l-2 border-slate-700 ml-4 space-y-8">
          {MOCK_TIMELINE.map((event) => (
            <div key={event.id} className="relative pl-10 group cursor-pointer">
              {/* Dot */}
              <div className={`
                absolute -left-[9px] top-1 w-5 h-5 rounded-full border-4 border-slate-900 transition-all group-hover:scale-125
                ${event.type === 'scan' ? 'bg-brand-500' : event.type === 'lab' ? 'bg-blue-500' : 'bg-purple-500'}
              `}></div>
              
              {/* Content */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 group-hover:border-brand-500/50 transition-colors shadow-sm flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider
                        ${event.type === 'scan' ? 'bg-brand-500/20 text-brand-400' : event.type === 'lab' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}
                      `}>
                        {event.type === 'scan' ? 'Scanner 3D' : event.type === 'lab' ? 'Laboratorial' : 'Bioimpedância'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{event.date}</span>
                    </div>
                    <p className="text-slate-200 font-semibold text-lg">{event.summary}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;