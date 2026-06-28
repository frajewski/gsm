// ============================================================
//  metro.config.js – konfiguracja bundlera Metro
//
//  Wyłącza nową funkcję Metro "package.json exports" (unstable_enablePackageExports),
//  która w nowszych wersjach Expo/React Native koliduje ze strukturą paczek Firebase
//  JS SDK i powoduje błąd:
//    "ERROR [runtime not ready]: Error: Component auth has not been registered yet"
//  Znany, udokumentowany problem zgodności – nie błąd w kodzie aplikacji.
// ============================================================

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Naprawka zgodności Firebase – wymuszamy starszy sposób rozwiązywania modułów
config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push('cjs');

module.exports = config;
