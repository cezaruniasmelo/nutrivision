import React from 'react';
import { Gender, PatientData } from '../types';

interface ManualInputFormProps {
  data: PatientData;
  onChange: (data: PatientData) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const ManualInputForm: React.FC<ManualInputFormProps> = ({ data, onChange, onGenerate, isLoading }) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({
      ...data,
      [name]: name === 'weight' || name === 'age' || name === 'height' ? Number(value) : value,
    });
  };

  return (
    <div className="h-full flex flex-col p-6 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Dados Clínicos
        </h2>
        <p className="text-sm text-slate-400 mt-1">Ajustes manuais e especificidades do paciente</p>
      </div>

      <div className="space-y-5">
        {/* Gender Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
            Sexo Biológico
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[Gender.MALE, Gender.FEMALE].map((g) => (
              <button
                key={g}
                onClick={() => onChange({ ...data, gender: g })}
                className={`py-3 px-4 rounded-lg border transition-all duration-200 text-sm font-medium ${
                  data.gender === g
                    ? 'bg-brand-600 border-brand-500 text-white shadow-[0_0_15px_rgba(13,148,136,0.3)]'
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Height Input (Critical for calibration) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
            Altura (cm)
          </label>
          <div className="relative">
            <input
              type="number"
              name="height"
              value={data.height}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              placeholder="ex: 175"
            />
            <span className="absolute right-4 top-3.5 text-slate-500 text-sm">cm</span>
          </div>
          <p className="text-xs text-brand-500/80 mt-1 italic">
            *Necessário para calibração volumétrica 3D.
          </p>
        </div>

        {/* Weight Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
            Peso Atual
          </label>
          <div className="relative">
            <input
              type="number"
              name="weight"
              value={data.weight}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              placeholder="ex: 70.5"
            />
            <span className="absolute right-4 top-3.5 text-slate-500 text-sm">kg</span>
          </div>
        </div>

        {/* Age Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">
            Idade
          </label>
          <input
            type="number"
            name="age"
            value={data.age}
            onChange={handleChange}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            placeholder="ex: 30"
          />
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-700">
        <button 
          onClick={onGenerate}
          disabled={isLoading}
          className={`w-full font-bold py-3 px-4 rounded-lg shadow-lg transform transition flex items-center justify-center gap-2
            ${isLoading 
              ? 'bg-slate-600 cursor-not-allowed text-slate-300' 
              : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white hover:scale-[1.02] active:scale-[0.98]'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando IA...
            </>
          ) : (
            'Gerar Relatório Metabólico'
          )}
        </button>
        <p className="text-center text-xs text-slate-500 mt-3">
          Powered by Gemini 1.5 Pro & Vertex AI
        </p>
      </div>
    </div>
  );
};

export default ManualInputForm;