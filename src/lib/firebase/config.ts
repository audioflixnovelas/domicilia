import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCDHRBsCdYRh8naxEClHC0sXLHl58SaYAY",
  authDomain: "domicilia-systematrix.firebaseapp.com",
  projectId: "domicilia-systematrix",
  storageBucket: "domicilia-systematrix.firebasestorage.app",
  messagingSenderId: "512465281481",
  appId: "1:512465281481:web:2362601972757a0fcf8818",
  measurementId: "G-QEH7LEY7ZL"
};

function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

let authInstance: any = null;
let dbInstance: any = null;

try {
  authInstance = getAuth(app);
} catch (e) {
  console.warn('Firebase Auth initialization warning:', e);
}

try {
  dbInstance = getFirestore(app);
} catch (e) {
  console.warn('Firebase Firestore initialization warning:', e);
}

export const auth = authInstance;
export const db = dbInstance;
export default app;
