// ============================================================
//  firestoreDb.js – Firestore jako trwała baza danych
//  Zamiennik mockDb.js – te same nazwy eksportowanych funkcji,
//  ale operacje na danych są teraz ASYNC (Firestore = sieć, nie RAM).
//
//  Real-time: subscribeToRepairs/subscribeToPhones/subscribeToBookings
//  używają onSnapshot – wywołują callback przy KAŻDEJ zmianie danych,
//  niezależnie skąd ta zmiana pochodzi (apka mobilna, panel webowy,
//  konsola Firebase). To zastępuje ręczne odświeżanie ekranów.
// ============================================================

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { STATUS } from '../constants/statuses';
import { BOOKING_STATUS } from '../constants/bookingStatuses';

// ---------- USERS ----------

export const getUserById = async (id) => {
  const snap = await getDoc(doc(db, 'users', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const findWalkInByEmail = async (email) => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const snap = await getDocs(
    query(collection(db, 'users'), where('emailLower', '==', normalized), where('isWalkIn', '==', true))
  );
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// Czy istnieje już jakikolwiek użytkownik z rolą Admin? Patrz funkcje.js (Cloud Function)
// dla wersji używanej przy rejestracji – ta wersja "z klienta" istnieje tylko dla
// kompatybilności wstecznej / odczytu informacyjnego (np. ekran ustawień).
export const adminAlreadyExists = async () => {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
  return !snap.empty;
};

export const addUser = async (userData) => {
  const docRef = await addDoc(collection(db, 'users'), {
    ...userData,
    emailLower: (userData.email || '').toLowerCase(),
  });
  return { id: docRef.id, ...userData };
};

export const getCustomers = async () => {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'customer')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getWorkers = async () => {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'worker')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Real-time: callback(usersArray) wywoływany przy starcie i przy każdej zmianie
// w kolekcji users (nowy klient, zmiana roli, scalenie konta walk-in, itd.).
// Lista użytkowników nie zmienia się tak często jak repairs, ale jest potrzebna
// synchronicznie w wielu ekranach (imię klienta przy zleceniu) – stąd listener,
// zamiast wymuszania async-await w dziewięciu różnych miejscach w apce.
export const subscribeToUsers = (callback) => {
  return onSnapshot(collection(db, 'users'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const updateUserRole = async (userId, newRole) => {
  await updateDoc(doc(db, 'users', userId), { role: newRole });
  return getUserById(userId);
};

export const addWalkInCustomer = async ({ name, phone, email }) => {
  const data = {
    role: 'customer',
    name,
    phone: phone || '',
    email: email || '',
    emailLower: (email || '').trim().toLowerCase(),
    password: null,
    approved: true,
    isWalkIn: true,
  };
  const docRef = await addDoc(collection(db, 'users'), data);
  return { id: docRef.id, ...data };
};

// Scalanie konta walk-in z prawdziwym kontem Firebase Auth – identyczna logika
// co w mockDb.js, ale operacje na trzech kolekcjach robione jako Promise.all
export const mergeWalkInIntoFirebaseAccount = async (walkInProfile, firebaseUid, intendedRole = null) => {
  const oldId = walkInProfile.id;

  const fixCollection = async (colName) => {
    const snap = await getDocs(query(collection(db, colName), where('customerId', '==', oldId)));
    await Promise.all(snap.docs.map((d) => updateDoc(doc(db, colName, d.id), { customerId: firebaseUid })));
  };

  await Promise.all([fixCollection('repairs'), fixCollection('bookingRequests'), fixCollection('phones')]);
  await deleteDoc(doc(db, 'users', oldId));

  const mergedProfile = {
    ...walkInProfile,
    id: firebaseUid,
    role: intendedRole || walkInProfile.role,
    isWalkIn: false,
    password: null,
  };
  // setDoc (nie addDoc!) bo chcemy konkretne ID = firebaseUid
  const { setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', firebaseUid), mergedProfile);

  return mergedProfile;
};

// ---------- REPAIRS ----------

export const getRepairById = async (id) => {
  const snap = await getDoc(doc(db, 'repairs', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getRepairsByCustomer = async (customerId) => {
  const snap = await getDocs(
    query(collection(db, 'repairs'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Generuje "N/ROK" atomowo przez transakcję – wyklucza duplikaty numerów
// nawet jeśli dwa zlecenia są tworzone w tym samym momencie
const nextDisplayNumber = async () => {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'counters', String(year));
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const next = (snap.exists() ? snap.data().count : 0) + 1;
    tx.set(counterRef, { count: next }, { merge: true });
    return `${next}/${year}`;
  });
};

export const addRepair = async (repairData) => {
  const displayNumber = await nextDisplayNumber();
  const nowIso = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'repairs'), {
    ...repairData,
    displayNumber,
    createdAt: nowIso,
    createdAtServer: serverTimestamp(), // do sortowania niezależnie od zegara klienta
    history: [{ date: nowIso, status: repairData.status || STATUS.ACCEPTED }],
  });
  return { id: docRef.id, ...repairData, displayNumber, createdAt: nowIso };
};

export const updateRepair = async (id, changes) => {
  const current = await getRepairById(id);
  if (!current) return null;

  const finalChanges = { ...changes };
  if (changes.status && changes.status !== current.status) {
    finalChanges.history = [
      ...(current.history || []),
      { date: new Date().toISOString(), status: changes.status },
    ];
  }
  await updateDoc(doc(db, 'repairs', id), finalChanges);
  return { ...current, ...finalChanges };
};

// Real-time: callback(repairsArray) wywoływany przy starcie i przy każdej zmianie.
// Zwraca funkcję unsubscribe – WAŻNE wywołać ją w cleanup useEffect, inaczej
// listener zostanie aktywny nawet po zamknięciu ekranu (memory leak + niepotrzebne odczyty)
export const subscribeToRepairs = (currentUser, callback) => {
  if (!currentUser) { callback([]); return () => {}; }

  const isStaff = currentUser.role === 'admin' || currentUser.role === 'worker';
  const q = isStaff
    ? query(collection(db, 'repairs'), orderBy('createdAt', 'desc'))
    : query(collection(db, 'repairs'), where('customerId', '==', currentUser.id), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// ---------- PHONES (skup) ----------

export const getPhoneById = async (id) => {
  const snap = await getDoc(doc(db, 'phones', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addPhone = async (data) => {
  const nowIso = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'phones'), {
    ...data,
    boughtAt: nowIso,
    soldAt: null,
    sellPrice: data.sellPrice || 0,
    linkedRepairId: data.linkedRepairId || null,
  });
  return { id: docRef.id, ...data, boughtAt: nowIso };
};

export const updatePhone = async (id, changes) => {
  const finalChanges = { ...changes };
  if (changes.status === 'Sprzedany') {
    const current = await getPhoneById(id);
    if (current && !current.soldAt) finalChanges.soldAt = new Date().toISOString();
  }
  await updateDoc(doc(db, 'phones', id), finalChanges);
  return getPhoneById(id);
};

export const deletePhone = async (id) => {
  await deleteDoc(doc(db, 'phones', id));
  return true;
};

export const subscribeToPhones = (callback) => {
  const q = query(collection(db, 'phones'), orderBy('boughtAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

// ---------- BOOKING REQUESTS ----------

export const getBookingById = async (id) => {
  const snap = await getDoc(doc(db, 'bookingRequests', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getBookingsByCustomer = async (customerId) => {
  const snap = await getDocs(
    query(collection(db, 'bookingRequests'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addBookingRequest = async (data) => {
  const nowIso = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'bookingRequests'), {
    ...data,
    status: BOOKING_STATUS.PENDING,
    adminNote: null,
    proposedDate: null,
    estimatedPrice: 0,
    assignedWorkerId: null,
    linkedRepairId: null,
    createdAt: nowIso,
  });
  return { id: docRef.id, ...data, createdAt: nowIso };
};

export const updateBookingRequest = async (id, changes) => {
  await updateDoc(doc(db, 'bookingRequests', id), changes);
  return getBookingById(id);
};

export const subscribeToBookings = (currentUser, callback) => {
  if (!currentUser) { callback([]); return () => {}; }

  const isStaff = currentUser.role === 'admin' || currentUser.role === 'worker';
  const q = isStaff
    ? query(collection(db, 'bookingRequests'), orderBy('createdAt', 'desc'))
    : query(collection(db, 'bookingRequests'), where('customerId', '==', currentUser.id), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};
