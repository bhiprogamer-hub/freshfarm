import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBXJyW-CYh3D6zT7EXpMLsP3NPNtqH6Bxk",
  authDomain: "fresh-vegetable-shop-ea5be.firebaseapp.com",
  projectId: "fresh-vegetable-shop-ea5be",
  storageBucket: "fresh-vegetable-shop-ea5be.firebasestorage.app",
  messagingSenderId: "508582549354",
  appId: "1:508582549354:web:96caf71181465b80933713",
  measurementId: "G-RD8SLKVPZ4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
