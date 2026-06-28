// ============================================================
//  googleAuthService.js – logowanie przez Google (Firebase Auth)
//  Używa expo-auth-session do otwarcia ekranu logowania Google,
//  potem przekazuje token do Firebase Auth.
// ============================================================

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebaseConfig';

// Wymagane, żeby okno logowania poprawnie się zamykało po sukcesie (Android/iOS)
WebBrowser.maybeCompleteAuthSession();

// Web Client ID z google-services.json (client_type: 3 = Web client)
// Ten sam ID działa też jako "webClientId" w hooku poniżej
export const GOOGLE_WEB_CLIENT_ID =
  '870825632751-fnvctvggqkvecr1m7viidpjsu551921b.apps.googleusercontent.com';

// Hook do użycia w komponencie LoginScreen:
//   const [request, response, promptAsync] = useGoogleAuth();
//   <Button onPress={() => promptAsync()} />
export const useGoogleAuth = () => {
  return Google.useAuthRequest({
    webClientId:     GOOGLE_WEB_CLIENT_ID,
    iosClientId:     GOOGLE_WEB_CLIENT_ID, // tymczasowo ten sam ID – działa w Expo Go na iOS
    androidClientId: GOOGLE_WEB_CLIENT_ID, // tymczasowo ten sam ID – działa w Expo Go na Androidzie
  });
};

// Po otrzymaniu odpowiedzi z Google – zaloguj do Firebase
export const signInWithGoogleResponse = async (response) => {
  if (response?.type !== 'success') {
    return { success: false, error: 'Logowanie Google zostało przerwane.' };
  }
  try {
    const { id_token } = response.params;
    const credential = GoogleAuthProvider.credential(id_token);
    const result = await signInWithCredential(auth, credential);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: 'Nie udało się zalogować przez Google. Spróbuj ponownie.' };
  }
};
