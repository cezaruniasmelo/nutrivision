import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { PatientData } from '../types';
import { uploadPatientPhoto } from './storageService';

export const fetchPatientsFromFirestore = async (userId: string): Promise<PatientData[]> => {
  if (!userId) {
    console.warn("fetchPatientsFromFirestore called without userId");
    return [];
  }
  
  try {
    const patientsRef = collection(db, 'users', userId, 'patients');
    
    // Attempt with orderBy first
    try {
        const q = query(patientsRef, orderBy('lastVisit', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientData[];
    } catch (orderError: any) {
        console.warn("Query with orderBy failed (possible missing index), trying simple query.", orderError);
        const simpleSnapshot = await getDocs(patientsRef);
        return simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientData[];
    }

  } catch (error: any) {
    console.error("Error fetching patients:", error);
    if (error.code !== 'permission-denied') {
        // handle other errors
    }
    return [];
  }
};

export const createPatientInFirestore = async (userId: string, data: PatientData, photoFile?: File): Promise<string> => {
  if (!userId) throw new Error("User ID required for Firestore operations");

  try {
    // 1. Cria o documento básico do paciente primeiro para obter o ID
    const patientPayload = {
      name: data.name,
      age: data.age,
      gender: data.gender,
      height: data.height,
      weight: data.weight,
      clinicalGoal: data.clinicalGoal,
      photoURL: null, // Será atualizado depois se houver foto
      lastVisit: new Date().toLocaleDateString('pt-BR'),
      createdAt: serverTimestamp()
    };

    const patientsRef = collection(db, 'users', userId, 'patients');
    const patientRef = await addDoc(patientsRef, patientPayload);
    const patientId = patientRef.id;

    let finalPhotoURL = "";

    // 2. Se houver arquivo de foto, faz upload e atualiza o documento
    if (photoFile) {
        try {
            finalPhotoURL = await uploadPatientPhoto(userId, patientId, photoFile);
            await updateDoc(doc(db, 'users', userId, 'patients', patientId), {
                photoURL: finalPhotoURL
            });
        } catch (uploadError) {
            console.error("Falha ao salvar foto do paciente, mas paciente foi criado.", uploadError);
        }
    }

    // 3. Adiciona histórico inicial
    const patientDataWithPhoto = { ...data, photoURL: finalPhotoURL };
    await addAssessmentToHistory(userId, patientId, patientDataWithPhoto);

    return patientId;
  } catch (error: any) {
    console.error("Error creating patient:", error);
    if (error.code === 'permission-denied') {
      throw new Error("Permissão negada (Firestore). Verifique se você está logado e se as regras de segurança permitem escrita.");
    }
    throw error;
  }
};

export const addAssessmentToHistory = async (userId: string, patientId: string, data: PatientData) => {
  if (!userId || !patientId) throw new Error("Invalid User or Patient ID");

  try {
    const assessmentPayload = {
      date: Timestamp.now(),
      formattedDate: new Date().toLocaleDateString('pt-BR'),
      weight: data.weight,
      bioimpedanceBF: data.bioimpedanceBF || null,
      glucose: data.glucose || null,
      cholesterol: data.cholesterol || null,
      patientSentiment: data.patientSentiment || null,
      scanSession: data.scanSession || null,
      type: 'intake'
    };

    const assessmentsRef = collection(db, 'users', userId, 'patients', patientId, 'assessments');
    await addDoc(assessmentsRef, assessmentPayload);

    const patientDocRef = doc(db, 'users', userId, 'patients', patientId);
    
    // Atualiza dados 'flat' no documento pai também
    const updatePayload: any = {
      weight: data.weight,
      lastVisit: new Date().toLocaleDateString('pt-BR')
    };
    if (data.photoURL) updatePayload.photoURL = data.photoURL;

    await updateDoc(patientDocRef, updatePayload);

  } catch (error: any) {
    console.error("Error adding assessment:", error);
  }
};