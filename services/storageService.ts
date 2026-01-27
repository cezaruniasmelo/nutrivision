import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Faz upload da foto de perfil do Profissional.
 * Caminho: users/{userId}/profile_pic
 */
export const uploadProfessionalPhoto = async (userId: string, file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, `users/${userId}/profile_pic`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Erro ao fazer upload da foto do profissional:", error);
    throw error;
  }
};

/**
 * Faz upload da foto do Paciente.
 * Caminho: users/{userId}/patients/{patientId}/profile_pic
 */
export const uploadPatientPhoto = async (userId: string, patientId: string, file: File): Promise<string> => {
  try {
    // Adiciona timestamp para evitar cache agressivo se a foto mudar
    const storageRef = ref(storage, `users/${userId}/patients/${patientId}/profile_pic_${Date.now()}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Erro ao fazer upload da foto do paciente:", error);
    throw error;
  }
};
