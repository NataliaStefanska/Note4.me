import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  initializeFirestore, persistentLocalCache, doc, setDoc, getDoc, deleteDoc,
  collection, getDocs, writeBatch,
} from "firebase/firestore";

// Firebase config — env vars override defaults (web API keys are public by design;
// security is enforced by Firestore rules, not by hiding the key)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDTekf1c-2NqtNyyuIpmHVK6OvLAl6536Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "note4-me.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "note4-me",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "note4-me.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "721213164255",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:721213164255:web:61d90785d4569ae98a776a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-SXC6RXJYVG",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Fix deprecated API: use initializeFirestore with persistentLocalCache instead of enableIndexedDbPersistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

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

// ─── Subcollection-based data model (v2) ────────────────────────────────────
// users/{uid}                  → { lang, activeSpace, schemaVersion: 2 }
// users/{uid}/spaces/{spaceId} → { name, emoji, color, order }
// users/{uid}/notes/{noteId}   → { title, content, tags, linkedNotes, tasks, intent, updatedAt, lastOpened, archived, spaceId }
// users/{uid}/tasks/{taskId}   → { text, done, intent, createdAt, dueDate, spaceId }

const SCHEMA_VERSION = 2;

// ─── Load all data (with auto-migration from v1) ───────────────────────────

export async function loadAllData(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  // Check if migration needed (old schema — no schemaVersion field)
  if (userData && !userData.schemaVersion) {
    return await migrateToSubcollections(uid, userData);
  }

  if (!userData) {
    return null; // New user
  }

  // Load from subcollections (partial failure safe)
  const results = await Promise.allSettled([
    getDocs(collection(db, "users", uid, "spaces")),
    getDocs(collection(db, "users", uid, "notes")),
    getDocs(collection(db, "users", uid, "tasks")),
  ]);
  const spacesSnap = results[0].status === "fulfilled" ? results[0].value : null;
  const notesSnap = results[1].status === "fulfilled" ? results[1].value : null;
  const tasksSnap = results[2].status === "fulfilled" ? results[2].value : null;
  results.forEach((r, i) => { if (r.status === "rejected") console.warn(`Failed to load ${["spaces","notes","tasks"][i]}:`, r.reason); });

  const spaces = [];
  if (spacesSnap) spacesSnap.forEach(d => spaces.push({ id: d.id, ...d.data() }));
  spaces.sort((a, b) => (a.order || 0) - (b.order || 0));

  const allNotes = {};
  if (notesSnap) notesSnap.forEach(d => {
    const note = { id: d.id, ...d.data() };
    const sid = note.spaceId || "s1";
    delete note.spaceId;
    if (!allNotes[sid]) allNotes[sid] = [];
    allNotes[sid].push(note);
  });

  const standaloneTasks = {};
  if (tasksSnap) tasksSnap.forEach(d => {
    const task = { id: d.id, ...d.data() };
    const sid = task.spaceId || "s1";
    delete task.spaceId;
    if (!standaloneTasks[sid]) standaloneTasks[sid] = [];
    standaloneTasks[sid].push(task);
  });

  return {
    lang: userData.lang || "pl",
    activeSpace: userData.activeSpace || "s1",
    spaces: spaces.length > 0 ? spaces : null,
    allNotes: Object.keys(allNotes).length > 0 ? allNotes : null,
    standaloneTasks: Object.keys(standaloneTasks).length > 0 ? standaloneTasks : null,
  };
}

// ─── Migration from v1 single-doc to v2 subcollections ─────────────────────

async function migrateToSubcollections(uid, oldData) {
  const batch = writeBatch(db);

  // User preferences
  batch.set(doc(db, "users", uid), {
    lang: oldData.lang || "pl",
    activeSpace: oldData.activeSpace || "s1",
    schemaVersion: SCHEMA_VERSION,
  });

  // Spaces
  if (oldData.spaces) {
    oldData.spaces.forEach((sp, i) => {
      batch.set(doc(db, "users", uid, "spaces", sp.id), {
        name: sp.name, emoji: sp.emoji, color: sp.color, order: i,
      });
    });
  }

  // Notes (grouped by space)
  const allNotes = oldData.allNotes || {};
  for (const [spaceId, notes] of Object.entries(allNotes)) {
    if (!Array.isArray(notes)) continue;
    for (const note of notes) {
      batch.set(doc(db, "users", uid, "notes", note.id), {
        title: note.title || "", content: note.content || "",
        tags: note.tags || [], linkedNotes: note.linkedNotes || [],
        tasks: note.tasks || [], intent: note.intent || "",
        updatedAt: note.updatedAt || "", lastOpened: note.lastOpened || "",
        archived: note.archived || false, spaceId,
      });
    }
  }

  // Standalone tasks (grouped by space)
  const standaloneTasks = oldData.standaloneTasks || {};
  for (const [spaceId, tasks] of Object.entries(standaloneTasks)) {
    if (!Array.isArray(tasks)) continue;
    for (const task of tasks) {
      batch.set(doc(db, "users", uid, "tasks", task.id), {
        text: task.text || "", done: task.done || false,
        intent: task.intent || "", createdAt: task.createdAt || "",
        dueDate: task.dueDate || "", spaceId,
      });
    }
  }

  await batch.commit();

  return {
    lang: oldData.lang,
    activeSpace: oldData.activeSpace,
    spaces: oldData.spaces,
    allNotes,
    standaloneTasks,
  };
}

// ─── Incremental save functions ─────────────────────────────────────────────

export async function saveUserPrefs(uid, prefs) {
  await setDoc(doc(db, "users", uid), { ...prefs, schemaVersion: SCHEMA_VERSION }, { merge: true });
}

export async function saveSpace(uid, space) {
  const { id, ...data } = space;
  await setDoc(doc(db, "users", uid, "spaces", id), data, { merge: true });
}

export async function deleteSpaceFirestore(uid, spaceId) {
  await deleteDoc(doc(db, "users", uid, "spaces", spaceId));
}

export async function saveNoteFirestore(uid, note, spaceId) {
  const { id, ...data } = note;
  await setDoc(doc(db, "users", uid, "notes", id), { ...data, spaceId }, { merge: true });
}

export async function deleteNoteFirestore(uid, noteId) {
  await deleteDoc(doc(db, "users", uid, "notes", noteId));
}

export async function saveTaskFirestore(uid, task, spaceId) {
  const { id, ...data } = task;
  await setDoc(doc(db, "users", uid, "tasks", id), { ...data, spaceId }, { merge: true });
}

export async function deleteTaskFirestore(uid, taskId) {
  await deleteDoc(doc(db, "users", uid, "tasks", taskId));
}

// ─── Batch saves (for reordering, bulk ops) ─────────────────────────────────

export async function saveAllSpaces(uid, spaces) {
  const batch = writeBatch(db);
  spaces.forEach((space, i) => {
    const { id, ...data } = space;
    batch.set(doc(db, "users", uid, "spaces", id), { ...data, order: i });
  });
  await batch.commit();
}

export async function saveAllNotes(uid, notes, spaceId) {
  const batch = writeBatch(db);
  notes.forEach(note => {
    const { id, ...data } = note;
    batch.set(doc(db, "users", uid, "notes", id), { ...data, spaceId }, { merge: true });
  });
  await batch.commit();
}

export async function saveAllTasks(uid, tasks, spaceId) {
  const batch = writeBatch(db);
  tasks.forEach(task => {
    const { id, ...data } = task;
    batch.set(doc(db, "users", uid, "tasks", id), { ...data, spaceId }, { merge: true });
  });
  await batch.commit();
}
