// ============================================================
//  firebaseConfig.js – inicjalizacja Firebase
//  Dane projektu testowego (gsmserviceapp-ff8f6) – ten projekt Firebase
//  jest tymczasowy, przeznaczony tylko do tego prototypu/oceny i zostanie
//  usunięty po jego zakończeniu, więc dane konfiguracyjne nie są tu chronione
//  jako tajemnica – w finalnej, produkcyjnej wersji aplikacji (po wdrożeniu
//  w realnym serwisie) warto przenieść je do zmiennych środowiskowych (.env).
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            "AIzaSyDtDMY65scKHqjWDHXa_FbcgTT55nmXOFA",
  authDomain:        "gsmserviceapp-ff8f6.firebaseapp.com",
  projectId:         "gsmserviceapp-ff8f6",
  storageBucket:     "gsmserviceapp-ff8f6.firebasestorage.app",
  messagingSenderId: "870825632751",
  appId:             "1:870825632751:android:6438990ae94e9511498c1a",
};

// Inicjalizuj Firebase tylko raz (zabezpieczenie przed hot-reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth z trwałą sesją – użytkownik zostaje zalogowany po zamknięciu apki
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore – trwała baza danych (zlecenia, telefony, rezerwacje, profile)
const db = getFirestore(app);

export { app, auth, db };
