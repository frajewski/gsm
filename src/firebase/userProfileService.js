// ============================================================
//  userProfileService.js – profil użytkownika (rola, telefon) w Firestore
//  Firebase Auth przechowuje TYLKO: email, hasło, displayName, UID.
//  Rola (admin/worker/customer) i telefon żyją w Firestore (users/{uid}),
//  identycznie jak wcześniej żyły w mockDb.js – tylko teraz trwale.
//
//  WAŻNE: przyznawanie roli "pierwszy = admin" NIE dzieje się tutaj transakcyjnie
//  z klienta – Firestore nie gwarantuje atomowości dla zapytań where() wewnątrz
//  runTransaction (tylko dla pojedynczych dokumentów odczytanych przez tx.get()).
//  Właściwe, bezpieczne miejsce na tę logikę to Cloud Function
//  (functions/index.js: assignInitialRole), wywoływana z useStore.js przy
//  rejestracji. Funkcje tutaj obsługują tylko PROFIL, nie decyzję o roli.
// ============================================================

import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { getUserById, findWalkInByEmail, mergeWalkInIntoFirebaseAccount } from './firestoreDb';

export const getProfileByUid = async (uid) => getUserById(uid);

// Utwórz lokalny profil z JUŻ ZDECYDOWANĄ rolą (przekazaną z wywołującego –
// w praktyce z wyniku Cloud Function assignInitialRole, patrz useStore.js).
// Jeśli istnieje konto walk-in z tym samym emailem – scala je zamiast tworzyć nowy wpis.
export const createLocalProfile = async ({ uid, name, email, phone = '', role }) => {
  const existing = await getProfileByUid(uid);
  if (existing) return existing;

  const walkInMatch = await findWalkInByEmail(email);
  if (walkInMatch) {
    return mergeWalkInIntoFirebaseAccount(walkInMatch, uid, role);
  }

  const newProfile = {
    role,
    name,
    email,
    emailLower: (email || '').trim().toLowerCase(),
    phone,
    password: null,
    approved: true,
  };
  await setDoc(doc(db, 'users', uid), newProfile);
  return { id: uid, ...newProfile };
};

export const updateLocalProfile = async (uid, changes) => {
  await updateDoc(doc(db, 'users', uid), changes);
  return getProfileByUid(uid);
};
