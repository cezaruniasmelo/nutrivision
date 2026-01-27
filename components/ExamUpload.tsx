import React, { useState, useCallback } from 'react';
import { PatientData } from '../types';

interface ExamUploadProps {
  onComplete: (extractedData: Partial<PatientData>) => void;
  onSkip: () => void;
}

const ExamUpload: React.FC<ExamUploadProps> = ({ onComplete, onSkip }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('processing');

    // Simulação de processamento de OCR/Vision API
    // Em produção, aqui enviaríamos para uma Cloud Function com Document AI
    setTimeout(() => {
      setUploadStatus('success');
      setTimeout(() => {
        // Dados "extraídos" do PDF mockado
        onComplete({
            glucose: 105,
            cholesterol: 210,
            weight: 71.2
        });
      }, 1000);
    }, 2500);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [onComplete]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-2xl mx-auto w-full animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Ingestão de Dados Clínicos</h2>
        <p className="text-slate-400">
          Faça upload de PDFs de exames ou fotos de laudos antigos.
          A IA extrairá os biomarcadores automaticamente.
        </p>
      </div>

      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          w-full aspect-video rounded-2xl border-2 border-dashed transition-all duration-300
          flex flex-col items-center justify-center relative overflow-hidden bg-slate-800/50
          ${isDragging 
            ? 'border-brand-500 bg-brand-500/10 scale-[1.02]' 
            : 'border-slate-600 hover:border-slate-500'
          }
        `}
      >
        {uploadStatus === 'idle' && (
          <>
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-slate-200">Arraste e solte seus arquivos aqui</p>
            <p className="text-sm text-slate-500 mt-2">PDF, JPG ou PNG</p>
            <label className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-colors text-sm font-semibold">
              Selecionar Arquivo
              <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={handleFileInput} />
            </label>
          </>
        )}

        {uploadStatus === 'processing' && (
          <div className="flex flex-col items-center animate-pulse">
             <svg className="animate-spin h-10 w-10 text-brand-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
             <p className="text-brand-400 font-mono">Processando com Vision AI...</p>
             <p className="text-xs text-slate-500 mt-2">Extraindo: Glicemia, Colesterol, TSH</p>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="flex flex-col items-center">
             <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
             <p className="text-green-400 font-bold text-lg">Dados Extraídos com Sucesso!</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4 w-full max-w-md">
        <button 
          onClick={onSkip}
          className="flex-1 py-3 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          Pular esta etapa
        </button>
      </div>
    </div>
  );
};

export default ExamUpload;