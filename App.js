// ============================================================
//  App.js – punkt wejścia aplikacji GSM Service App
//  Nasłuchuje sesji Firebase przy starcie – jeśli użytkownik był
//  zalogowany, zostaje zalogowany automatycznie bez ponownego logowania.
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import useStore from './src/store/useStore';
import { subscribeToAuthChanges } from './src/firebase/firebaseAuthService';
import { ThemeProvider, useColors } from './src/constants/ThemeContext';

// Ekran ładowania wewnątrz ThemeProvider, żeby mieć dostęp do useColors()
const LoadingScreen = () => {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
};

const AppContent = () => {
  const restoreSession    = useStore((s) => s.restoreSession);
  const [checking, setChecking] = useState(true);
  const colors = useColors();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      restoreSession(firebaseUser);
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  if (checking) return <LoadingScreen />;

  return (
    <>
      <StatusBar style={colors.background === '#0F1117' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
