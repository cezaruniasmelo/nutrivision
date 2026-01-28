import React from 'react';
import { ScanSession, ReportData } from '../types';

interface ScanReviewProps {
    session: ScanSession;
    reportData: ReportData | null;
    onProceed: () => void;
    isProcessing: boolean;
}

const ScanReview: React.FC<ScanReviewProps> = ({ session, reportData, onProceed, isProcessing }) => {

    const images = [
        { label: 'Rosto & Pescoço', src: session.faceNeckImage, desc: 'Análise Facial' },
        { label: 'Frente: Superior', src: session.frontUpperImage, desc: 'Peitoral/Abs' },
        { label: 'Frente: Inferior', src: session.frontLowerImage, desc: 'Membros Inf.' },
        { label: 'Perfil: Superior', src: session.sideUpperImage, desc: 'Postura' },
        { label: 'Perfil: Inferior', src: session.sideLowerImage, desc: 'Alinhamento' },
        { label: 'Costas: Superior', src: session.backUpperImage, desc: 'Dorsais' },
        { label: 'Costas: Inferior', src: session.backLowerImage, desc: 'Lombar/Glúteo' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-900 animate-fadeIn text-white overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900 z-10 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-brand-500">📸</span> Revisão da Captura
                    </h2>
                    <p className="text-slate-400 text-sm">Valide as imagens antes da simulação</p>
                </div>
                <button
                    onClick={onProceed}
                    disabled={isProcessing}
                    className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 ${isProcessing
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-brand-600 hover:bg-brand-500 text-white hover:scale-105'
                        }`}
                >
                    {isProcessing ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Processando IA...
                        </>
                    ) : (
                        <>
                            Gerar Simulação
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </>
                    )}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

                    {/* Left: Identificação Inteligente (AI Highlights) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
                            <h3 className="text-sm font-bold text-brand-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Destaques da Visão
                            </h3>

                            {reportData ? (
                                <div className="space-y-4">
                                    {/* Physiologic Analysis Summary */}
                                    <div className="bg-slate-750 p-4 rounded-xl border border-slate-600/50">
                                        <p className="text-sm text-slate-300 leading-relaxed italic">
                                            "{reportData.analise_fisiologica?.substring(0, 180)}..."
                                        </p>
                                    </div>

                                    {/* Risks / Findings */}
                                    <div>
                                        <h4 className="text-xs font-bold text-white mb-2">Pontos de Atenção Detectados:</h4>
                                        <ul className="space-y-2">
                                            {reportData.riscos_identificados?.slice(0, 4).map((risk, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                                    <span className="text-yellow-500 mt-1">•</span>
                                                    {risk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="pt-4 border-t border-slate-700">
                                        <div className="flex items-center gap-2 text-xs text-brand-500 font-bold bg-brand-500/10 p-2 rounded justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Biometria Facial Processada
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                    <div className="w-8 h-8 border-2 border-slate-600 border-t-brand-500 rounded-full animate-spin mb-3"></div>
                                    <p className="text-xs uppercase font-bold">Analisando Imagens...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Photo Grid */}
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Face gets prominence */}
                            <div className="col-span-2 md:col-span-2 aspect-video bg-black rounded-2xl overflow-hidden relative group border border-slate-700 shadow-lg">
                                {session.faceNeckImage ? (
                                    <img src={session.faceNeckImage} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="Face" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-600 bg-slate-800">Sem Imagem</div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur p-2">
                                    <p className="text-white text-xs font-bold uppercase">Rosto & Pescoço</p>
                                </div>
                                <div className="absolute top-2 right-2 bg-brand-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded">Biomarcadores</div>
                            </div>

                            {/* Body Parts */}
                            {images.slice(1).map((img, idx) => (
                                <div key={idx} className="aspect-[3/4] bg-black rounded-xl overflow-hidden relative group border border-slate-700 shadow-md hover:border-brand-500/50 transition-all">
                                    {img.src ? (
                                        <img src={img.src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={img.label} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-700 bg-slate-800 text-xs">...</div>
                                    )}
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
                                        <p className="text-white text-[10px] font-bold uppercase leading-tight">{img.label}</p>
                                        <p className="text-slate-400 text-[9px]">{img.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanReview;
