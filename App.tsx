
import React, { useState, useEffect } from 'react';
import ScannerCamera from './components/ScannerCamera';
import ScanReview from './components/ScanReview';
import SmartIntake from './components/SmartIntake';
import PatientDashboard from './components/PatientDashboard';
import PredictiveSimulator from './components/PredictiveSimulator';
import LoginScreen from './components/LoginScreen';
import PatientSelectScreen from './components/PatientSelectScreen';
import UserProfileModal from './components/UserProfileModal';
import { generateMetabolicReport } from './services/aiService';
import { auth, db } from './services/firebase';
import { fetchPatientsFromFirestore, createPatientInFirestore, addAssessmentToHistory } from './services/patientService';
import { DEMO_ATHLETES } from './constants';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Gender, PatientData, AppView, ReportData, ScanSession } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentView, setCurrentView] = useState<AppView>('patient_select');
  const [patientData, setPatientData] = useState<PatientData | null>(null);

  const [patientsList, setPatientsList] = useState<PatientData[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        loadPatients(currentUser.uid);
      } else {
        setPatientData(null);
        setPatientsList([]);
        setCurrentView('patient_select');
      }
    });
    return () => unsubscribe();
  }, []);

  const loadPatients = async (userId: string) => {
    setIsLoadingPatients(true);
    const data = await fetchPatientsFromFirestore(userId);
    setPatientsList(data);
    setIsLoadingPatients(false);
  };

  const handleLoadDemoData = async () => {
    if (!user) return;
    setIsLoadingPatients(true);
    try {
      // Carrega os 34 atletas um a um para o Firestore
      for (const athlete of DEMO_ATHLETES) {
        await createPatientInFirestore(user.uid, athlete);
      }
      await loadPatients(user.uid);
    } catch (e) {
      console.error("Erro ao carregar dados demo", e);
      alert("Falha ao carregar elenco demo.");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handleSelectPatient = (patient: PatientData) => {
    setPatientData(patient);
    setCurrentView('dashboard');
  };

  const handleNewPatientClick = () => {
    setPatientData({
      name: '',
      age: 0,
      weight: 0,
      gender: Gender.MALE,
      height: 0,
      clinicalGoal: 'weight_loss'
    });
    setCurrentView('register');
  };

  const handleRegistrationComplete = async (data: PatientData, photoFile?: File) => {
    if (!user) return;

    try {
      setIsGenerating(true);
      const newId = await createPatientInFirestore(user.uid, data, photoFile);
      const newPatientWithId = { ...data, id: newId, lastVisit: new Date().toLocaleDateString('pt-BR') };
      setPatientData(newPatientWithId);
      await loadPatients(user.uid);
      setIsGenerating(false);
      setCurrentView('dashboard');
    } catch (e: any) {
      console.error("Erro ao salvar paciente", e);
      setIsGenerating(false);
      alert("Erro ao salvar dados.");
    }
  };

  const handleStartScan = () => { setCurrentView('scan'); };

  const handleScanComplete = async (session: ScanSession) => {
    if (!patientData || !user) return;
    const updatedPatientData = { ...patientData, scanSession: session };
    setPatientData(updatedPatientData);
    setIsGenerating(true);
    try {
      if (patientData.id) {
        await addAssessmentToHistory(user.uid, patientData.id, updatedPatientData);
      }
      const report = await generateMetabolicReport(updatedPatientData);
      setReportData(report);
      setReportData(report);
      setCurrentView('review');
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar relatório.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => { setReportData(null); setCurrentView('dashboard'); };

  const handleChangePatient = () => {
    setPatientData(null);
    setReportData(null);
    setCurrentView('patient_select');
  };

  const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error("Logout Error", error); } };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">Carregando...</p>
      </div>
    );
  }

  if (!user) { return <LoginScreen />; }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans overflow-hidden">
      <header className="h-20 bg-slate-900 flex items-center px-8 justify-between shrink-0 z-30 border-b border-slate-800">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => patientData ? setCurrentView('dashboard') : setCurrentView('patient_select')}>
          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-slate-900 shadow-[0_0_15px_rgba(161,234,147,0.3)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white hidden md:block">
            NutriVision <span className="text-brand-500">AI</span>
          </h1>
        </div>

        {currentView !== 'patient_select' && currentView !== 'dashboard' && (
          <div className="hidden md:flex items-center bg-slate-800 rounded-full p-1 border border-slate-700">
            <div className={`h-2 rounded-full transition-all duration-500 ${currentView === 'register' ? 'bg-brand-500 w-16' : 'bg-transparent w-4'}`}></div>
            <div className={`h-2 rounded-full transition-all duration-500 ${currentView === 'scan' ? 'bg-brand-500 w-16' : 'bg-slate-700 w-4 mx-1'}`}></div>
            <div className={`h-2 rounded-full transition-all duration-500 ${currentView === 'simulation' ? 'bg-brand-500 w-16' : 'bg-slate-700 w-4'}`}></div>
          </div>
        )}

        <div className="flex items-center gap-6">
          <div
            className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIsProfileModalOpen(true)}
          >
            <p className="text-base font-bold text-white leading-none">{user.displayName || 'Profissional'}</p>
            <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mt-1">Configurar Perfil</p>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden hover:border-brand-500 transition-all flex items-center justify-center"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-500 font-bold">{user.displayName ? user.displayName.charAt(0) : 'P'}</span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-slate-700"
            title="Sair"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {currentView === 'patient_select' && (
          <PatientSelectScreen
            patients={patientsList}
            isLoading={isLoadingPatients}
            onSelectPatient={handleSelectPatient}
            onNewPatient={handleNewPatientClick}
            onLoadDemoData={handleLoadDemoData}
            userName={user.displayName || 'Profissional'}
          />
        )}
        {currentView === 'register' && patientData && (
          <div className="h-full relative">
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur z-50 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-white font-bold">Salvando Paciente & Foto...</p>
              </div>
            )}
            <SmartIntake initialData={patientData} onComplete={handleRegistrationComplete} />
          </div>
        )}
        {currentView === 'dashboard' && patientData && (
          <PatientDashboard
            onNewScan={handleStartScan}
            professionalName={user.displayName || 'Profissional'}
            patientData={patientData}
            onChangePatient={handleChangePatient}
          />
        )}
        {currentView === 'scan' && (
          <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-900">
            {isGenerating ? (
              <div className="flex flex-col items-center animate-fadeIn">
                <div className="w-20 h-20 border-8 border-brand-500 border-t-transparent rounded-full animate-spin mb-8"></div>
                <h2 className="text-3xl font-bold text-white mb-2">Processando 360º & Dados</h2>
                <p className="text-slate-400">O Gemini está correlacionando Exames + Volumetria...</p>
              </div>
            ) : (
              <div className="w-full max-w-5xl h-[85vh] relative rounded-[2.5rem] overflow-hidden border-4 border-slate-800 shadow-2xl">
                <ScannerCamera onScanComplete={handleScanComplete} />
              </div>
            )}
          </div>
        )}
        {currentView === 'review' && patientData && patientData.scanSession && (
          <ScanReview
            session={patientData.scanSession}
            reportData={reportData}
            onProceed={() => setCurrentView('simulation')}
            isProcessing={isGenerating}
          />
        )}
        {currentView === 'simulation' && reportData && (
          <PredictiveSimulator reportData={reportData} onReset={handleReset} />
        )}
      </main>

      <UserProfileModal
        user={user}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={async () => {
          if (auth.currentUser) {
            await auth.currentUser.reload();
            setUser({ ...auth.currentUser } as User);
          }
        }}
      />
    </div>
  );
};

export default App;
