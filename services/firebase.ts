import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB8dWtiV0ZJ_QThkaeRUQEYMMERZpB_UjE",
  authDomain: "nutrivisionai-11c30.firebaseapp.com",
  projectId: "nutrivisionai-11c30",
  storageBucket: "nutrivisionai-11c30.firebasestorage.app",
  messagingSenderId: "1046108228991",
  appId: "1:1046108228991:web:ab0b264f201f448d62de4a",
  measurementId: "G-RJFB6PLQPW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;