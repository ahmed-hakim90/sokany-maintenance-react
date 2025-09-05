import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA8THKyWr50bcGWOd7MHFpPqlBE4gvp6Hk",
  authDomain: "main-maintenance.firebaseapp.com",
  projectId: "main-maintenance",
  storageBucket: "main-maintenance.appspot.com",
  messagingSenderId: "806089947936",
  appId: "1:806089947936:web:90af1597a0a8a558fe3545"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
