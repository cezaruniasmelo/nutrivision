
import React, { useState, useCallback, useRef } from 'react';
import { Gender, PatientData, ClinicalGoal } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { extractClinicalData } from '../services/aiService';

const pdfjs = (pdfjsLib as any).default || pdfjsLib;

try {
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
} catch (e) {
    console.warn("Failed to set PDF worker source", e);
}

interface SmartIntakeProps {
  initialData: PatientData;
  onComplete: (data: PatientData, photoFile?: File) => void;
}

interface UploadedFile {
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
}

const SmartIntake: React.FC<SmartIntakeProps> = ({ initialData, onComplete }) => {
  const [formData, setFormData] = useState<PatientData>(initialData);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  
  const [patientPhoto, setPatientPhoto] = useState<File | null>(null);
  const [patientPhotoPreview, setPatientPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'age' || name === 'weight' || name === 'height' || name === 'glucose' || name === 'cholesterol' || name === 'bioimpedanceBF') 
        ? Number(value) 
        : value,
    }));
    
    if (aiFilledFields.has(name)) {
      setAiFilledFields(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const handlePatientPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setPatientPhoto(file);
          setPatientPhotoPreview(URL.createObjectURL(file));
      }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjs.getDocument({ data: data });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        return fullText;
    } catch (e) {
        console.error("PDF Parsing Error:", e);
        throw e;
    }
  };

  const updateFormDataWithAI = (aiData: Partial<PatientData>) => {
    setFormData(prev => {
      const newData = { ...prev };
      const fieldsUpdated = new Set(aiFilledFields);
      (Object.keys(aiData) as Array<keyof PatientData>).forEach(key => {
        if (aiData[key] !== undefined && aiData[key] !== null && aiData[key] !== 0) {
          // @ts-ignore
          newData[key] = aiData[key];
          fieldsUpdated.add(key);
        }
      });
      setAiFilledFields(fieldsUpdated);
      return newData;
    });
  };

  const processFiles = async (files: File[]) => {
    setIsProcessingFiles(true);
    const newFiles = Array.from(files).map(f => ({ name: f.name, status: 'processing' as const }));
    setUploadedFiles(prev => [...prev, ...newFiles]);

    for (const file of files) {
      try {
        let aiResult: Partial<PatientData> = {};

        if (file.type === 'application/pdf') {
          const extractedText = await extractTextFromPDF(file);
          aiResult = await extractClinicalData({ text: extractedText });
        } else if (file.type.startsWith('image/')) {
          const base64 = await fileToBase64(file);
          aiResult = await extractClinicalData({ imageBase64: base64, mimeType: file.type });
        } else if (file.type.startsWith('text/')) {
          const text = await file.text();
          aiResult = await extractClinicalData({ text });
        }

        updateFormDataWithAI(aiResult);
        setUploadedFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'success' } : f));
      } catch (error) {
        console.error("Erro ao processar arquivo:", file.name, error);
        setUploadedFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f));
      }
    }
    setIsProcessingFiles(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [aiFilledFields]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const getInputClass = (fieldName: string) => `
    w-full bg-slate-900 border rounded-2xl px-5 py-3 text-white outline-none transition-all duration-300 font-medium
    ${aiFilledFields.has(fieldName) 
      ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-[0_0_15px_rgba(161,234,147,0.1)]' 
      : 'border-slate-700 focus:border-brand-500 focus:bg-slate-900'}
  `;

  const renderAiBadge = (fieldName: string) => {
    if (aiFilledFields.has(fieldName)) {
      return (
        <span className="text-brand-500 text-[10px] ml-2 font-bold animate-pulse flex items-center gap-1 bg-brand-500/10 px-2 py-0.5 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          IA AUTO
        </span>
      );
    }
    return null;
  };

  const isValid = formData.name && formData.weight && formData.height && formData.age;

  return (
    <div className="h-full flex flex-col md:flex-row gap-8 p-8 max-w-[1400px] mx-auto w-full animate-fadeIn font-sans">
      
      {/* COLUNA ESQUERDA: Upload Inteligente */}
      <div className="w-full md:w-1/3 flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Cadastro Inteligente</h2>
          <p className="text-slate-400">Arraste fotos de exames ou PDFs para preenchimento via IA Vision.</p>
        </div>

        {/* Card Foto do Paciente */}
        <div className="bg-slate-800 rounded-[2.5rem] border border-slate-700 p-6 flex flex-col items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Foto do Perfil</h3>
            <div 
                className="relative group cursor-pointer"
                onClick={() => photoInputRef.current?.click()}
            >
                 <div className="w-32 h-32 rounded-full border-4 border-slate-700 overflow-hidden bg-slate-900 flex items-center justify-center group-hover:border-brand-500 transition-colors">
                     {patientPhotoPreview ? (
                         <img src={patientPhotoPreview} className="w-full h-full object-cover" alt="Preview" />
                     ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                         </svg>
                     )}
                 </div>
                 <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-white text-xs font-bold">Upload</span>
                 </div>
            </div>
            <input 
                type="file" 
                ref={photoInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handlePatientPhotoSelect}
            />
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
          className={`
            min-h-[220px] rounded-[2.5rem] border-2 border-dashed transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center p-8 text-center cursor-pointer group shadow-inner flex-1
            ${isDragging ? 'border-brand-500 bg-brand-500/10 scale-[1.02]' : 'border-slate-700 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800'}
          `}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input type="file" id="fileInput" multiple accept=".pdf,.txt,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileSelect} />
          
          {isProcessingFiles ? (
            <div className="flex flex-col items-center">
               <svg className="animate-spin h-10 w-10 text-brand-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
               <p className="text-brand-500 font-bold text-base">Extraindo Dados...</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-500 group-hover:text-slate-900 transition-all text-slate-300 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              <p className="text-base font-bold text-white">Importar Exames ou Fotos</p>
              <p className="text-xs text-slate-500 mt-2 font-medium">PDF, JPG, PNG, WEBP</p>
            </>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="bg-slate-800 rounded-3xl p-6 max-h-48 overflow-y-auto border border-slate-700">
             <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Arquivos Processados</h4>
             <ul className="space-y-3">
               {uploadedFiles.map((file, idx) => (
                 <li key={idx} className="flex items-center justify-between text-sm bg-slate-900 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-slate-300 font-medium truncate max-w-[180px]">{file.name}</span>
                    {file.status === 'success' && <span className="text-brand-500 text-xs font-bold bg-brand-500/10 px-2 py-1 rounded">ANALISADO</span>}
                    {file.status === 'error' && <span className="text-red-400 text-xs font-bold">ERRO</span>}
                 </li>
               ))}
             </ul>
          </div>
        )}
      </div>

      {/* COLUNA DIREITA: Formulário Unificado */}
      <div className="w-full md:w-2/3 bg-slate-800 rounded-[2.5rem] border border-slate-700 p-8 md:p-10 flex flex-col overflow-y-auto shadow-2xl">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Identificação</h3>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
                Nome Completo {renderAiBadge('name')}
              </label>
              <input name="name" value={formData.name} onChange={handleChange} className={getInputClass('name')} placeholder="Nome do paciente" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
                    Idade {renderAiBadge('age')}
                </label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} className={getInputClass('age')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
                    Sexo {renderAiBadge('gender')}
                </label>
                <select name="gender" value={formData.gender} onChange={handleChange} className={getInputClass('gender')}>
                  {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Métricas</h3>
             <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
                    Peso (kg) {renderAiBadge('weight')}
                </label>
                <input type="number" name="weight" value={formData.weight} onChange={handleChange} className={getInputClass('weight')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center">
                    Altura (cm) {renderAiBadge('height')}
                </label>
                <input type="number" name="height" value={formData.height} onChange={handleChange} className={getInputClass('height')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between items-center">
                  Glicemia {renderAiBadge('glucose')}
                </label>
                <input type="number" name="glucose" value={formData.glucose || ''} onChange={handleChange} className={getInputClass('glucose')} placeholder="--" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between items-center">
                  % Gordura {renderAiBadge('bioimpedanceBF')}
                </label>
                <input type="number" name="bioimpedanceBF" value={formData.bioimpedanceBF || ''} onChange={handleChange} className={getInputClass('bioimpedanceBF')} placeholder="--" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 p-6 bg-slate-900 rounded-3xl border border-slate-700/50">
           <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Objetivos Clínicos</h3>
           
           <div className="mb-6">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
               {[
                 { id: 'weight_loss', label: 'Emagrecer' }, 
                 { id: 'hypertrophy', label: 'Hipertrofia' },
                 { id: 'longevity', label: 'Saúde' },
                 { id: 'performance', label: 'Performance' }
               ].map((goal) => (
                 <button
                    key={goal.id}
                    onClick={() => setFormData(prev => ({...prev, clinicalGoal: goal.id as any}))}
                    className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                      formData.clinicalGoal === goal.id 
                      ? 'bg-brand-500 border-brand-500 text-slate-900' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                 >
                   {goal.label}
                 </button>
               ))}
             </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Observações Adicionais</label>
              <textarea 
                name="patientSentiment" 
                value={formData.patientSentiment || ''} 
                onChange={handleChange as any} 
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3 text-white focus:border-brand-500 outline-none placeholder-slate-600 transition-colors h-24 resize-none" 
                placeholder="Ex: Histórico familiar, alergias, motivação..."
              />
           </div>
        </div>

        <div className="mt-auto flex justify-end">
          <button
            onClick={() => isValid && onComplete(formData, patientPhoto || undefined)}
            disabled={!isValid}
            className={`
              px-10 py-4 rounded-full font-bold text-base transition-all transform flex items-center gap-3
              ${isValid 
                ? 'bg-brand-500 hover:bg-brand-400 text-slate-900 shadow-lg cursor-pointer' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
            `}
          >
            Salvar Paciente
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
};

export default SmartIntake;
