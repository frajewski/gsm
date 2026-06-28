// ============================================================
//  firebaseAuthService.js – logowanie/rejestracja przez Firebase
//  Email+hasło działa od razu. Google wymaga dodatkowej konfiguracji
//  (patrz firebaseGoogleAuth.js) – ten plik działa niezależnie.
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// Zaloguj przez email i hasło
export const firebaseLogin = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: mapFirebaseError(error.code) };
  }
};

// Zarejestruj nowe konto przez email i hasło
export const firebaseRegister = async (email, password, displayName) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    // Zapisz imię i nazwisko w profilu Firebase
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: mapFirebaseError(error.code) };
  }
};

// Wyloguj
export const firebaseLogout = () => signOut(auth);

// Nasłuchuj zmian stanu logowania (wywołaj raz, np. w App.js)
export const subscribeToAuthChanges = (callback) => onAuthStateChanged(auth, callback);

// Tłumaczenie błędów Firebase na zrozumiałe komunikaty PL
const mapFirebaseError = (code) => {
  const messages = {
    'auth/email-already-in-use': 'Ten adres email jest już zajęty.',
    'auth/invalid-email':        'Nieprawidłowy adres email.',
    'auth/weak-password':        'Hasło musi mieć minimum 6 znaków.',
    'auth/user-not-found':       'Nie znaleziono użytkownika z tym adresem email.',
    'auth/wrong-password':       'Nieprawidłowe hasło.',
    'auth/invalid-credential':   'Nieprawidłowy email lub hasło.',
    'auth/too-many-requests':    'Za dużo nieudanych prób. Spróbuj ponownie później.',
    'auth/network-request-failed': 'Brak połączenia z internetem.',
  };
  return messages[code] || 'Wystąpił błąd. Spróbuj ponownie.';
};
