import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDTekf1c-2NqtNyyuIpmHVK6OvLAl6536Q",
  authDomain: "note4-me.firebaseapp.com",
  projectId: "note4-me",
  storageBucket: "note4-me.firebasestorage.app",
  messagingSenderId: "721213164255",
  appId: "1:721213164255:web:61d90785d4569ae98a776a",
  measurementId: "G-SXC6RXJYVG",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── Firestore helpers ──────────────────────────────────────────────────────

export async function saveUserData(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

export async function loadUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
