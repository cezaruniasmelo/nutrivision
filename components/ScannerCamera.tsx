import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ScanSession } from '../types';

// Manually define connections
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5],
  [5, 6], [6, 8], [9, 10], [11, 12], [11, 13],
  [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
  [18, 20], [11, 23], [12, 24], [23, 24], [23, 25],
  [24, 26], [25, 27], [26, 28], [27, 29], [28, 30],
  [27, 31], [28, 32], [29, 31], [30, 32]
];

// New Segmented Steps
type ScanPhase = 'front_upper' | 'front_lower' | 'side_upper' | 'side_lower' | 'back_upper' | 'back_lower' | 'complete';

interface PoseInstruction {
  message: string;
  subMessage?: string;
  type: 'success' | 'warning' | 'error' | 'neutral';
  progress: number; // 0 to 100 for current step lock-on
}

interface ScannerCameraProps {
  onScanComplete: (session: ScanSession) => void;
}

const ScannerCamera: React.FC<ScannerCameraProps> = ({ onScanComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMounted = useRef<boolean>(true); 
  
  // Scan State Machine
  const [currentPhase, setCurrentPhase] = useState<ScanPhase>('front_upper');
  const [sessionData, setSessionData] = useState<ScanSession>({
    frontLandmarks: null,
    frontLegsLandmarks: null,
    sideLandmarks: null,
    sideLegsLandmarks: null,
    backLandmarks: null,
    backLegsLandmarks: null,
    timestamp: Date.now()
  });

  // UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  // Logic State
  const lastLandmarksRef = useRef<any[] | null>(null);
  const progressRef = useRef<number>(0); 
  const poseRef = useRef<any>(null); 
  const requestRef = useRef<number>(0);

  const [instruction, setInstruction] = useState<PoseInstruction>({
    message: 'Prepare-se...',
    type: 'neutral',
    progress: 0
  });

  // Load available cameras
  useEffect(() => {
    isMounted.current = true;
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        if (isMounted.current) {
            setDevices(videoDevices);
            if (videoDevices.length > 0) setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (e) {
        console.error("Error listing devices", e);
      }
    };
    getDevices();

    return () => { isMounted.current = false; };
  }, []);

  // --- NEW SEGMENTED ANALYSIS LOGIC ---
  const analyzePoseForStep = (landmarks: any[], phase: ScanPhase): PoseInstruction => {
    if (!landmarks || landmarks.length === 0) {
      return { message: 'Corpo não detectado', type: 'error', progress: 0 };
    }

    // Key Landmarks
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    const MIN_CONFIDENCE = 0.6;
    const isVisible = (point: any) => point.visibility > MIN_CONFIDENCE;

    // --- PHASE 1: UPPER BODY (TORSO) ---
    if (phase.includes('upper')) {
        if (!isVisible(nose) || !isVisible(leftShoulder) || !isVisible(rightShoulder)) {
            return { message: 'Enquadre Cabeça e Ombros', type: 'warning', progress: 0 };
        }
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
        const isFrontOrBack = phase.includes('front') || phase.includes('back');
        const isSide = phase.includes('side');

        if (isFrontOrBack && shoulderWidth < 0.15) {
            return { message: 'Gire de FRENTE para a câmera', type: 'warning', progress: 0 };
        }
        if (isSide && shoulderWidth > 0.25) {
            return { message: 'Gire de PERFIL (Lado)', type: 'warning', progress: 0 };
        }
        if (nose.y < 0.05) return { message: 'Baixe um pouco a câmera', type: 'warning', progress: 0 };
        if (leftShoulder.y > 0.8) return { message: 'Suba a câmera', type: 'warning', progress: 0 };

        return { message: 'Perfeito! Mantendo Foco...', type: 'success', progress: 0 };
    }

    // --- PHASE 2: LOWER BODY (LEGS) ---
    if (phase.includes('lower')) {
        if (!isVisible(leftKnee) && !isVisible(rightKnee)) {
            return { message: 'Aponte para as PERNAS', type: 'warning', progress: 0 };
        }
        if (!isVisible(leftAnkle) && !isVisible(rightAnkle)) {
             return { message: 'Enquadre os PÉS', type: 'warning', progress: 0 };
        }
        return { message: 'Escaneando Pernas...', type: 'success', progress: 0 };
    }

    return { message: 'Aguarde...', type: 'neutral', progress: 0 };
  };

  const capturePhase = (phase: ScanPhase, landmarks: any[]) => {
    const newSession = { ...sessionData };
    if (phase === 'front_upper') newSession.frontLandmarks = landmarks;
    if (phase === 'front_lower') newSession.frontLegsLandmarks = landmarks;
    if (phase === 'side_upper') newSession.sideLandmarks = landmarks;
    if (phase === 'side_lower') newSession.sideLegsLandmarks = landmarks;
    if (phase === 'back_upper') newSession.backLandmarks = landmarks;
    if (phase === 'back_lower') newSession.backLegsLandmarks = landmarks;

    setSessionData(newSession);
    progressRef.current = 0; 
    
    if (phase === 'front_upper') setCurrentPhase('front_lower');
    else if (phase === 'front_lower') setCurrentPhase('side_upper');
    else if (phase === 'side_upper') setCurrentPhase('side_lower');
    else if (phase === 'side_lower') setCurrentPhase('back_upper');
    else if (phase === 'back_upper') setCurrentPhase('back_lower');
    else if (phase === 'back_lower') {
        setCurrentPhase('complete');
        onScanComplete(newSession);
    }
  };

  const manualCapture = () => {
      if (lastLandmarksRef.current && currentPhase !== 'complete') {
          capturePhase(currentPhase, lastLandmarksRef.current);
      }
  };

  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || currentPhase === 'complete' || !isMounted.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
      lastLandmarksRef.current = results.poseLandmarks;
      const result = analyzePoseForStep(results.poseLandmarks, currentPhase);
      
      const STEP_INCREMENT = 2.5; 
      const STEP_DECAY = 2.0;
      
      if (result.type === 'success') {
          progressRef.current = Math.min(progressRef.current + STEP_INCREMENT, 100);
      } else {
          progressRef.current = Math.max(progressRef.current - STEP_DECAY, 0);
      }

      if (progressRef.current >= 100) {
           capturePhase(currentPhase, results.poseLandmarks);
      }
      
      setInstruction({ ...result, progress: progressRef.current });

      const globalDrawConnectors = (window as any).drawConnectors;
      if (globalDrawConnectors) {
        globalDrawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: result.type === 'success' ? '#14b8a6' : 'rgba(255,255,255,0.2)', 
          lineWidth: 4,
        });
      }
    } else {
        progressRef.current = 0;
    }
    ctx.restore();
  }, [currentPhase, sessionData]);

  // Initialization
  useEffect(() => {
    isMounted.current = true;
    const initPipe = async () => {
      if (poseRef.current) return; 

      try {
        if (isMounted.current) setLoading(true);
        let attempts = 0;
        // Wait for Pose to be attached to window
        while (!(window as any).Pose && attempts < 50) {
          if (!isMounted.current) return;
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }

        if (!(window as any).Pose) throw new Error("MediaPipe Pose library not loaded.");
        
        const pose = new (window as any).Pose({
          locateFile: (file: string) => {
             // Explicitly handle asset paths to avoid 'undefined' property access errors in loader
             if (file.endsWith('.data') || file.endsWith('.tflite') || file.endsWith('.wasm')) {
                 return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
             }
             return file;
          },
        });
        
        poseRef.current = pose;
        pose.setOptions({ 
            modelComplexity: 1, 
            smoothLandmarks: true, 
            minDetectionConfidence: 0.5, 
            minTrackingConfidence: 0.5 
        });
        pose.onResults(onResults);

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: 'environment', width: 1280, height: 720 } 
        });

        if (videoRef.current && isMounted.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.muted = true;
            videoRef.current.onloadedmetadata = () => {
                if (videoRef.current) {
                  videoRef.current.play().catch(e => console.error("Video play error:", e));
                  if (isMounted.current) setLoading(false);
                  predictWebcam();
                }
            };
        }
      } catch (e) {
        console.error("Camera Init Error:", e);
        if (isMounted.current) {
            setError("Erro ao iniciar câmera. Verifique permissões.");
            setLoading(false);
        }
      }
    };

    const predictWebcam = async () => {
        if (videoRef.current && poseRef.current && isMounted.current) {
            try { await poseRef.current.send({ image: videoRef.current }); } catch(e) {}
        }
        if (isMounted.current) requestRef.current = requestAnimationFrame(predictWebcam);
    };

    initPipe();
    return () => {
        isMounted.current = false;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        // Do not nullify poseRef immediately if it causes async issues, but we should clean up
        if (poseRef.current) {
            try { poseRef.current.close(); } catch(e){}
            poseRef.current = null;
        }
    };
  }, [onResults, selectedDeviceId]);

  const getPhaseLabel = (phase: ScanPhase) => {
      switch(phase) {
          case 'front_upper': return 'Frente: Tronco';
          case 'front_lower': return 'Frente: Pernas';
          case 'side_upper': return 'Perfil: Tronco';
          case 'side_lower': return 'Perfil: Pernas';
          case 'back_upper': return 'Costas: Tronco';
          case 'back_lower': return 'Costas: Pernas';
          default: return 'Finalizando';
      }
  };

  const getPhaseIcon = (phase: ScanPhase) => {
      const isUpper = phase.includes('upper');
      return (
          <div className="flex flex-col items-center">
             <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-colors ${isUpper ? 'bg-brand-500 border-white text-white' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                 </svg>
             </div>
             <span className="text-[10px] uppercase font-bold text-slate-400">Superior</span>
             
             <div className={`w-1 h-4 my-1 ${phase.includes('lower') ? 'bg-brand-500' : 'bg-slate-700'}`}></div>

             <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mt-2 transition-colors ${!isUpper ? 'bg-brand-500 border-white text-white' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                 </svg>
             </div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Inferior</span>
          </div>
      );
  };

  return (
    <div className="relative h-full w-full bg-black rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Progress Bar Top */}
        <div className="absolute top-0 inset-x-0 h-2 flex z-30 bg-slate-900">
            {['front', 'side', 'back'].map((angle) => (
                <div key={angle} className="flex-1 flex">
                    <div className={`h-full w-1/2 border-r border-black transition-all duration-500 ${
                        (sessionData as any)[`${angle}Landmarks`] ? 'bg-brand-500' : 'bg-slate-800'
                    }`}></div>
                    <div className={`h-full w-1/2 border-r border-black transition-all duration-500 ${
                         (sessionData as any)[`${angle}LegsLandmarks`] ? 'bg-brand-500' : 'bg-slate-800'
                    }`}></div>
                </div>
            ))}
        </div>

        {/* Camera Selector */}
        <div className="absolute top-4 right-4 z-40">
             <select 
                className="bg-black/50 backdrop-blur text-white text-xs rounded px-2 py-1 border border-white/20 outline-none hover:bg-black/70 transition-colors"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
                {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Câmera'}</option>)}
            </select>
        </div>

        {/* Main Video Area */}
        <div className="relative flex-1 group bg-black">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
            
            {loading && <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-brand-500 font-bold animate-pulse">Ativando Sensores...</div>}
            
            <div className={`absolute left-0 right-0 h-1 bg-brand-400 shadow-[0_0_15px_#2dd4bf] opacity-50 pointer-events-none animate-pulse ${
                currentPhase.includes('upper') ? 'top-1/3' : 'bottom-1/3'
            }`}></div>

            {instruction.type === 'success' && instruction.progress > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <svg className="w-64 h-64 transform -rotate-90 filter drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]">
                        <circle cx="50%" cy="50%" r="48%" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                        <circle 
                            cx="50%" cy="50%" r="48%" 
                            stroke="#14b8a6" strokeWidth="8" fill="none" 
                            strokeDasharray="301" strokeDashoffset={301 - (301 * instruction.progress) / 100}
                            className="transition-all duration-100 ease-linear"
                        />
                    </svg>
                    <div className="absolute font-bold text-4xl text-white drop-shadow-md">
                        {Math.floor(instruction.progress)}%
                    </div>
                </div>
            )}
            
            <button 
                onClick={manualCapture}
                className="absolute top-4 left-4 z-40 bg-white/10 hover:bg-brand-500/80 backdrop-blur border border-white/20 text-white text-xs font-bold py-2 px-4 rounded-full transition-all active:scale-95 opacity-50 hover:opacity-100"
            >
                Capturar (Manual)
            </button>
        </div>

        {/* Side HUD */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30 bg-black/40 backdrop-blur p-2 rounded-2xl border border-white/10">
            {getPhaseIcon(currentPhase)}
        </div>

        {/* Bottom HUD */}
        <div className="absolute bottom-0 inset-x-0 pb-12 pt-24 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent flex flex-col items-center z-20">
            <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-2 opacity-80">{getPhaseLabel(currentPhase)}</h3>
            <div className={`
                px-8 py-4 rounded-2xl backdrop-blur-md border shadow-xl transition-all duration-300 transform
                ${instruction.type === 'success' ? 'bg-brand-500/20 border-brand-500 text-brand-100 scale-105' : 
                  instruction.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-100' : 
                  'bg-slate-800/80 border-slate-600 text-white'}
            `}>
                <p className="text-xl font-bold flex items-center gap-3">
                    {instruction.type === 'success' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                    )}
                    {instruction.message}
                </p>
            </div>
            <p className="text-slate-500 text-xs mt-3">Mantenha o aparelho estável e siga as instruções</p>
        </div>
    </div>
  );
};

export default ScannerCamera;