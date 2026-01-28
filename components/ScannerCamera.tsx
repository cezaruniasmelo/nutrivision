import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ScanSession } from '../types';

// Standard Pose Connections (MediaPipe default)
const POSE_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5],
    [5, 6], [6, 8], [9, 10], [11, 12], [11, 13],
    [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
    [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
    [18, 20], [11, 23], [12, 24], [23, 24], [23, 25],
    [24, 26], [25, 27], [26, 28], [27, 29], [28, 30],
    [27, 31], [28, 32], [29, 31], [30, 32]
];

// Expanded Scan Phases (7 Steps)
type ScanPhase = 'face_neck' | 'front_upper' | 'front_lower' | 'side_upper' | 'side_lower' | 'back_upper' | 'back_lower' | 'complete';

interface PoseInstruction {
    message: string;
    subMessage?: string;
    type: 'success' | 'warning' | 'error' | 'neutral';
    progress: number; // 0 to 100
}

interface ScannerCameraProps {
    onScanComplete: (session: ScanSession) => void;
}

const ScannerCamera: React.FC<ScannerCameraProps> = ({ onScanComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isMounted = useRef<boolean>(true);

    // State
    const [currentPhase, setCurrentPhase] = useState<ScanPhase>('face_neck');
    const [sessionData, setSessionData] = useState<ScanSession>({
        frontLandmarks: null,
        frontLegsLandmarks: null,
        sideLandmarks: null,
        sideLegsLandmarks: null,
        backLandmarks: null,
        backLegsLandmarks: null,
        timestamp: Date.now()
    });

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

    // Logic Refs
    const lastLandmarksRef = useRef<any[] | null>(null);
    const progressRef = useRef<number>(0);
    const poseRef = useRef<any>(null);
    const requestRef = useRef<number>(0);

    const [instruction, setInstruction] = useState<PoseInstruction>({
        message: 'Inicializando Câmera...',
        type: 'neutral',
        progress: 0
    });

    // 1. Device Listing
    useEffect(() => {
        isMounted.current = true;
        const getDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission first
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
                if (isMounted.current) {
                    setDevices(videoDevices);
                    if (videoDevices.length > 0) {
                        // Try to find back camera on mobile
                        const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('traseira'));
                        setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
                    }
                }
            } catch (e) {
                console.error("Error listing devices", e);
                if (isMounted.current) setError("Permissão de câmera negada ou erro ao listar dispositivos.");
            }
        };
        getDevices();
        return () => { isMounted.current = false; };
    }, []);

    // 2. Pose Analysis Logic
    const analyzePoseForStep = (landmarks: any[], phase: ScanPhase): PoseInstruction => {
        if (!landmarks || landmarks.length === 0) {
            return { message: 'Corpo não detectado', type: 'error', progress: 0 };
        }

        const nose = landmarks[0];
        const leftEye = landmarks[2];
        const rightEye = landmarks[5];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftKnee = landmarks[25];
        const rightKnee = landmarks[26];

        const isVisible = (point: any) => point && point.visibility > 0.6;

        // --- PHASE 0: FACE & NECK ---
        if (phase === 'face_neck') {
            if (!isVisible(nose) || !isVisible(leftEye) || !isVisible(rightEye)) {
                return { message: 'Aproxime o ROSTO da câmera', type: 'warning', progress: 0 };
            }
            // Check if too far (shoulders should be visible but face dominant)
            if (!isVisible(leftShoulder) && !isVisible(rightShoulder)) {
                return { message: 'Afaste um pouco para mostrar o PESCOÇO', type: 'warning', progress: 0 };
            }
            // Center check
            if (nose.x < 0.3 || nose.x > 0.7 || nose.y < 0.2 || nose.y > 0.8) {
                return { message: 'Centralize o Rosto', type: 'warning', progress: 0 };
            }
            return { message: 'Perfeito! Não se mexa...', type: 'success', progress: 0 };
        }

        // --- PHASE 1, 3, 5: UPPER BODY (TORSO) ---
        if (phase.includes('upper')) {
            if (!isVisible(nose) || !isVisible(leftShoulder) || !isVisible(rightShoulder)) {
                return { message: 'Enquadre Cabeça e Ombros', type: 'warning', progress: 0 };
            }

            const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

            // Side check
            if (phase.includes('side')) {
                if (shoulderWidth > 0.25) return { message: 'Vire de PERFIL', type: 'warning', progress: 0 };
            } else {
                // Front/Back
                if (shoulderWidth < 0.1) return { message: 'Aproxime-se', type: 'warning', progress: 0 };
            }

            return { message: 'Mantenha a Posição...', type: 'success', progress: 0 };
        }

        // --- PHASE 2, 4, 6: LOWER BODY (LEGS) ---
        if (phase.includes('lower')) {
            if (!isVisible(leftKnee) && !isVisible(rightKnee)) {
                return { message: 'Enquadre as PERNAS', type: 'warning', progress: 0 };
            }
            return { message: 'Escaneando Pernas...', type: 'success', progress: 0 };
        }

        return { message: 'Aguarde...', type: 'neutral', progress: 0 };
    };

    // Helper: Resize Image
    const resizeImage = (dataUrl: string, maxWidth: number): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(1, maxWidth / img.width, maxWidth / img.height); // Scale based on max of width or height
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
                } else {
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(dataUrl);
        });
    };

    // 3. Capture Phase
    const capturePhase = async (phase: ScanPhase, landmarks: any[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Capture Image (Snapshot)
        const rawImageData = canvas.toDataURL('image/jpeg', 0.85);
        const compressedImage = await resizeImage(rawImageData, 800); // Max 800px

        const newSession = { ...sessionData };

        switch (phase) {
            case 'face_neck':
                newSession.faceNeckImage = compressedImage;
                setCurrentPhase('front_upper');
                break;
            case 'front_upper':
                newSession.frontLandmarks = landmarks;
                newSession.frontUpperImage = compressedImage;
                setCurrentPhase('front_lower');
                break;
            case 'front_lower':
                newSession.frontLegsLandmarks = landmarks;
                newSession.frontLowerImage = compressedImage;
                setCurrentPhase('side_upper');
                break;
            case 'side_upper':
                newSession.sideLandmarks = landmarks;
                newSession.sideUpperImage = compressedImage;
                setCurrentPhase('side_lower');
                break;
            case 'side_lower':
                newSession.sideLegsLandmarks = landmarks;
                newSession.sideLowerImage = compressedImage;
                setCurrentPhase('back_upper');
                break;
            case 'back_upper':
                newSession.backLandmarks = landmarks;
                newSession.backUpperImage = compressedImage;
                setCurrentPhase('back_lower');
                break;
            case 'back_lower':
                newSession.backLegsLandmarks = landmarks;
                newSession.backLowerImage = compressedImage;
                setCurrentPhase('complete');
                onScanComplete(newSession);
                break;
        }

        setSessionData(newSession);
        progressRef.current = 0;
    };

    const manualCapture = () => {
        const landmarks = lastLandmarksRef.current || [];
        capturePhase(currentPhase, landmarks);
    };

    // 4. Drawing Utilities (Anthropometry Guides)
    const drawAnthropometryGuides = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
        // Helper to draw point
        const drawPoint = (idx: number, color: string = '#00ff00') => {
            const pt = landmarks[idx];
            if (pt && pt.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(pt.x * ctx.canvas.width, pt.y * ctx.canvas.height, 6, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        };

        // Helper to draw line
        const drawLine = (idx1: number, idx2: number, color: string = 'rgba(255, 255, 255, 0.5)') => {
            const p1 = landmarks[idx1];
            const p2 = landmarks[idx2];
            if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
                ctx.beginPath();
                ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
                ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        };

        // Draw Key Anthropometric Points based on phase
        if (currentPhase === 'face_neck') {
            // Draw Face Landmarks
            drawPoint(0, '#ff4081'); // Nose
            drawPoint(2, '#03a9f4'); // Left Eye
            drawPoint(5, '#03a9f4'); // Right Eye
            drawLine(11, 12, 'rgba(255, 235, 59, 0.5)'); // Shoulders (neck base)
        } else {
            // Body landmarks
            drawPoint(11, '#ffeb3b'); // Shoulders
            drawPoint(12, '#ffeb3b');
            drawPoint(23, '#ff9800'); // Hips
            drawPoint(24, '#ff9800');
            drawPoint(25, '#03a9f4'); // Knees
            drawPoint(26, '#03a9f4');
        }
    };

    // 5. MediaPipe Loop
    const onResults = useCallback((results: any) => {
        const canvas = canvasRef.current;
        if (!canvas || currentPhase === 'complete' || !isMounted.current) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure canvas matches video size
        if (results.image.width !== canvas.width || results.image.height !== canvas.height) {
            canvas.width = results.image.width;
            canvas.height = results.image.height;
        }

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Camera Feed
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.poseLandmarks) {
            lastLandmarksRef.current = results.poseLandmarks;
            const result = analyzePoseForStep(results.poseLandmarks, currentPhase);

            const STEP_INCREMENT = 2.0;
            const STEP_DECAY = 3.0;

            if (result.type === 'success') {
                progressRef.current = Math.min(progressRef.current + STEP_INCREMENT, 100);
            } else {
                progressRef.current = Math.max(progressRef.current - STEP_DECAY, 0);
            }

            if (progressRef.current >= 100) {
                capturePhase(currentPhase, results.poseLandmarks);
            }

            setInstruction({ ...result, progress: progressRef.current });

            // Visuals
            const globalDrawConnectors = (window as any).drawConnectors;
            if (globalDrawConnectors && currentPhase !== 'face_neck') {
                globalDrawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
                    color: result.type === 'success' ? '#14b8a6' : 'rgba(255,255,255,0.2)',
                    lineWidth: 2,
                });
            }
            // Add Anthropometric Guides overlay
            drawAnthropometryGuides(ctx, results.poseLandmarks);

        } else {
            progressRef.current = 0;
        }
        ctx.restore();
    }, [currentPhase, sessionData]);


    // 6. Initialization
    useEffect(() => {
        isMounted.current = true;

        const initPipe = async () => {
            if (poseRef.current) return;

            setLoading(true);
            try {
                // Wait for Global Pose
                let attempts = 0;
                while (!(window as any).Pose && attempts < 100) { // Increased timeout
                    if (!isMounted.current) return;
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (!(window as any).Pose) {
                    throw new Error("Biblioteca de Visão Computacional não carregou.");
                }

                const pose = new (window as any).Pose({
                    locateFile: (file: string) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
                    }
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                poseRef.current = pose;
                pose.onResults(onResults);

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: 'environment', width: 1280, height: 720 }
                });

                if (videoRef.current && isMounted.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        setLoading(false);
                        predictWebcam();
                    };
                }

            } catch (err: any) {
                console.error(err);
                if (isMounted.current) {
                    setError(err.message || "Erro ao iniciar câmera");
                    setLoading(false);
                }
            }
        };

        const predictWebcam = async () => {
            if (videoRef.current && poseRef.current && isMounted.current) {
                // Check if video is ready
                if (videoRef.current.readyState >= 2) {
                    await poseRef.current.send({ image: videoRef.current });
                }
            }
            if (isMounted.current) requestRef.current = requestAnimationFrame(predictWebcam);
        };

        initPipe();

        return () => {
            isMounted.current = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (poseRef.current) {
                poseRef.current.close().catch(() => { });
                poseRef.current = null;
            }
            // Stop Tracks
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [selectedDeviceId, onResults]);

    // UI Helpers
    const getPhaseLabel = (phase: ScanPhase) => {
        switch (phase) {
            case 'face_neck': return 'Rosto & Pescoço (Biomarcadores)';
            case 'front_upper': return 'Frente: Tronco (Peito/Abdomen)';
            case 'front_lower': return 'Frente: Pernas';
            case 'side_upper': return 'Perfil: Tronco';
            case 'side_lower': return 'Perfil: Pernas';
            case 'back_upper': return 'Costas: Tronco';
            case 'back_lower': return 'Costas: Pernas';
            default: return 'Processando...';
        }
    };

    const currentStepIndex = ['face_neck', 'front_upper', 'front_lower', 'side_upper', 'side_lower', 'back_upper', 'back_lower'].indexOf(currentPhase);

    return (
        <div className="relative h-full w-full bg-black rounded-xl overflow-hidden shadow-2xl flex flex-col">
            {/* Error State */}
            {error && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-white text-xl font-bold mb-2">Erro no Scanner</p>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-brand-500 text-slate-900 rounded-full font-bold hover:bg-brand-400">
                        Recarregar Página
                    </button>
                </div>
            )}

            {/* Progress Bar Top */}
            <div className="absolute top-0 inset-x-0 h-2 flex z-30 bg-slate-900">
                {Array.from({ length: 7 }).map((_, idx) => (
                    <div key={idx} className={`flex-1 border-r border-black transition-all duration-300 ${idx < currentStepIndex ? 'bg-brand-500' : idx === currentStepIndex ? 'bg-brand-500/50 animate-pulse' : 'bg-slate-800'}`}></div>
                ))}
            </div>

            {/* Camera Selector */}
            <div className="absolute top-4 right-4 z-40">
                <select
                    className="bg-black/50 backdrop-blur text-white text-xs rounded-full px-4 py-2 border border-white/20 outline-none hover:bg-black/70 transition-colors cursor-pointer"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                    {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Câmera ${devices.indexOf(d) + 1}`}</option>)}
                </select>
            </div>

            {/* Camera Feed */}
            <div className="relative flex-1 group bg-black">
                {/* Hidden Video element for processing */}
                <video ref={videoRef} className="hidden" playsInline muted autoPlay />
                {/* Canvas for display */}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

                {loading && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-20">
                        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-brand-500 font-bold animate-pulse">Iniciando Sensores 3D...</p>
                    </div>
                )}

                {/* Manual Capture Button */}
                <button
                    onClick={manualCapture}
                    className="absolute bottom-32 right-8 z-40 flex flex-col items-center group active:scale-95 transition-transform"
                >
                    <div className="w-14 h-14 rounded-full border-4 border-white group-hover:border-brand-500 transition-all flex items-center justify-center bg-white/10 backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full bg-white group-hover:bg-brand-500 transition-colors"></div>
                    </div>
                    <span className="text-white text-[10px] font-bold mt-2 opacity-80 shadow-black drop-shadow-md">Manual</span>
                </button>

                {/* Scan Line Animation */}
                <div className={`absolute left-0 right-0 h-1 bg-brand-400 shadow-[0_0_15px_#2dd4bf] opacity-50 pointer-events-none animate-scan ${currentPhase.includes('upper') || currentPhase === 'face_neck' ? 'top-1/4' : 'top-3/4'
                    }`}></div>
            </div>

            {/* Bottom Instructions HUD */}
            <div className="absolute bottom-0 inset-x-0 pb-8 pt-24 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent flex flex-col items-center z-30 pointer-events-none">
                <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-4 opacity-80 drop-shadow-md text-center">{getPhaseLabel(currentPhase)}</h3>

                <div className={`
                px-6 py-3 rounded-xl backdrop-blur-md border shadow-2xl transition-all duration-300 transform
                ${instruction.type === 'success' ? 'bg-brand-500/90 border-brand-400 text-slate-900 scale-105' :
                        instruction.type === 'warning' ? 'bg-yellow-500/80 border-yellow-400 text-white' :
                            'bg-slate-800/80 border-slate-600 text-white'}
            `}>
                    <p className="text-lg font-bold flex items-center gap-3">
                        {instruction.message}
                    </p>
                </div>

                {/* Simple Step Indicator */}
                <div className="mt-4 text-[10px] text-slate-500 font-mono">
                    Passo {currentStepIndex + 1} de 7
                </div>
            </div>
        </div>
    );
};

export default ScannerCamera;