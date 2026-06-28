// ============================================================
//  useSettings.js – ustawienia serwisu (Zustand)
//  Przechowuje dane potrzebne do wydruku potwierdzenia
// ============================================================

import { create } from 'zustand';

const useSettings = create((set) => ({
  // Dane serwisu
  shopName:    'GSM Serwis',
  shopAddress: 'ul. Przykładowa 1, Płońsk',
  shopPhone:   '+48 500 100 200',

  // Ustawienia wydruku potwierdzenia
  showCompletionDate: true,   // 1) data realizacji zlecenia
  showScreenLockPattern: true, // 2) wzór blokady ekranu

  // 4) Kod QR na potwierdzeniu
  qrContent: '',               // treść do zakodowania (puste = brak QR)
  qrLabel:   '',               // dodatkowy opis nad QR

  updateSettings: (changes) => set((state) => ({ ...state, ...changes })),
}));

export default useSettings;
