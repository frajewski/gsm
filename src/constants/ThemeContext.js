// ============================================================
//  ThemeContext.js – zarządzanie jasnym/ciemnym motywem
//
//  UŻYCIE W KOMPONENTACH:
//    const colors = useColors();         ← tylko kolory (najczęstszy przypadek)
//    const { isDark, toggle } = useTheme(); ← do przełącznika w Settings
//
//  KONFIGURACJA:
//    Owiń <App /> w <ThemeProvider> w App.js (już zrobione).
//    Domyślnie: 'system' – podąża za ustawieniem telefonu.
//    Ręczne przełączenie w SettingsScreen zapisuje się przez AsyncStorage.
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';

const ThemeContext = createContext(null);
const STORAGE_KEY = '@theme_preference';

export const ThemeProvider = ({ children }) => {
  // 'system' | 'light' | 'dark'
  const [preference, setPreference] = useState('system');
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  // Załaduj zapisane ustawienie przy starcie
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => { if (val) setPreference(val); })
      .catch(() => {}); // cicho ignoruj błędy odczytu
  }, []);

  // Ustal czy aktualnie jest ciemny motyw
  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  const setTheme = async (newPref) => {
    setPreference(newPref);
    try { await AsyncStorage.setItem(STORAGE_KEY, newPref); } catch (_) {}
  };

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ colors, isDark, preference, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook do użycia w komponentach
export const useColors = () => {
  const ctx = useContext(ThemeContext);
  // Fallback jeśli ThemeProvider nie jest dostępny (np. Storybook, testy)
  return ctx?.colors ?? lightColors;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  return {
    isDark:     ctx?.isDark ?? false,
    preference: ctx?.preference ?? 'system',
    setTheme:   ctx?.setTheme ?? (() => {}),
    toggle:     ctx?.toggle ?? (() => {}),
  };
};
