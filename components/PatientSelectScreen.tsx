
import React, { useState } from 'react';
import { PatientData } from '../types';

interface PatientSelectScreenProps {
  patients: PatientData[];
  isLoading: boolean;
  onSelectPatient: (patient: PatientData) => void;
  onNewPatient: () => void;
  onLoadDemoData?: () => void; // Novo prop
  userName: string;
}

const PatientSelectScreen: React.FC<PatientSelectScreenProps> = ({ 
  patients, 
  isLoading,
  onSelectPatient, 
  onNewPatient,
  onLoadDemoData,
  userName 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full p-6 md:p-10 max-w-7xl mx-auto w-full animate-fadeIn font-sans">
      
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Bem-vindo, {userName}</h1>
        <p className="text-slate-400">Selecione um paciente para iniciar o atendimento ou cadastre um novo perfil.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <div className="flex-1 relative">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
           </svg>
           <input 
             type="text" 
             placeholder="Buscar paciente por nome..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-slate-800 border border-slate-700 rounded-full py-4 pl-12 pr-6 text-white focus:border-brand-500 outline-none transition-all shadow-lg"
           />
        </div>
        <div className="flex gap-4">
            <button 
              onClick={onNewPatient}
              className="bg-brand-500 hover:bg-brand-400 text-slate-900 px-8 py-4 rounded-full font-bold shadow-[0_4px_20px_rgba(161,234,147,0.3)] flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Paciente
            </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
         <div className="flex justify-center py-20">
             <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
         </div>
      )}

      {/* Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div 
              key={patient.id || patient.name}
              onClick={() => onSelectPatient(patient)}
              className="group bg-slate-800 rounded-[2.5rem] border border-slate-700 p-8 cursor-pointer hover:border-brand-500/50 hover:bg-slate-800/80 transition-all hover:-translate-y-1 shadow-md relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-slate-600 overflow-hidden flex items-center justify-center text-xl font-bold text-white group-hover:border-brand-500 transition-colors">
                      {patient.photoURL ? (
                          <img src={patient.photoURL} alt={patient.name} className="w-full h-full object-cover" />
                      ) : (
                          <span className="group-hover:text-brand-500 transition-colors uppercase">
                             {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                      )}
                  </div>
                  <div className="text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Última Visita</span>
                      <span className="text-sm text-slate-300 font-medium">{patient.lastVisit || 'Cadastro'}</span>
                  </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-brand-400 transition-colors relative z-10 truncate">{patient.name}</h3>
              <p className="text-slate-400 text-sm mb-6 relative z-10">{patient.age} Anos • {patient.gender}</p>

              <div className="flex gap-3 relative z-10">
                  <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-700/50">
                      <span className="block text-[10px] text-slate-500 uppercase font-bold">Peso</span>
                      <span className="text-white font-bold">{patient.weight}kg</span>
                  </div>
                  <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-700/50">
                      <span className="block text-[10px] text-slate-500 uppercase font-bold">Objetivo</span>
                      <span className="text-white font-bold capitalize truncate max-w-[100px]">
                        {patient.clinicalGoal === 'weight_loss' ? 'Emagrecer' : 
                         patient.clinicalGoal === 'performance' ? 'Performance' : 
                         patient.clinicalGoal}
                      </span>
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredPatients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-800/30 rounded-[3rem] border-2 border-slate-700/50 border-dashed">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-xl font-bold text-slate-300 mb-2">Nenhum paciente encontrado</p>
              <p className="text-sm max-w-xs text-center mb-8">Comece cadastrando um novo paciente ou carregue o elenco demo para testes.</p>
              
              {onLoadDemoData && (
                <button 
                  onClick={onLoadDemoData}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-brand-500 rounded-full font-bold transition-all flex items-center gap-2 border border-slate-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Carregar 34 Atletas (Botafogo-PB)
                </button>
              )}
          </div>
      )}

    </div>
  );
};

export default PatientSelectScreen;
