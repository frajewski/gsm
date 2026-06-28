// ============================================================
//  LoginScreen.jsx – ekran logowania
//  Email+hasło (Firebase) lub logowanie przez Google
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useStore  from '../store/useStore';
import Button    from '../components/Button';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { useGoogleAuth, signInWithGoogleResponse } from '../firebase/googleAuthService';
import { getProfileByUid, createLocalProfile } from '../firebase/userProfileService';
import { ROLES } from '../constants/roles';

const LoginScreen = ({ navigation }) => {
  const login = useStore((state) => state.login);
  const restoreSession = useStore((state) => state.restoreSession);

  // Stan formularza
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Hook logowania Google – request/response/promptAsync z expo-auth-session
  const [request, response, promptAsync] = useGoogleAuth();

  // Gdy Google zwróci odpowiedź – zaloguj do Firebase i utwórz/dociągnij profil
  useEffect(() => {
    if (response?.type === 'success') {
      setGoogleLoading(true);
      signInWithGoogleResponse(response).then((result) => {
        setGoogleLoading(false);
        if (!result.success) {
          Alert.alert('Błąd logowania', result.error);
          return;
        }
        // Dociągnij lokalny profil (rola/telefon) albo stwórz nowy przy pierwszym logowaniu
        const profile = getProfileByUid(result.user.uid) || createLocalProfile({
          uid:   result.user.uid,
          name:  result.user.displayName || result.user.email.split('@')[0],
          email: result.user.email,
          role:  ROLES.CUSTOMER,
        });
        restoreSession(result.user);
        // restoreSession już ustawia currentUser, ale upewniamy się że profil istnieje
      });
    } else if (response?.type === 'error') {
      Alert.alert('Błąd logowania', 'Logowanie przez Google nie powiodło się.');
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Błąd', 'Podaj email i hasło.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Błąd logowania', result.error);
    }
    // Jeśli success → RootNavigator automatycznie przełącza na Dashboard
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Logo i tytuł */}
        <View style={styles.header}>
          <LinearGradient colors={['#7C6FFF', '#5A4FE0']} style={styles.logoBadge}>
            <Text style={styles.logo}>🔧</Text>
          </LinearGradient>
          <Text style={styles.title}>GSM Serwis</Text>
          <Text style={styles.subtitle}>Panel zarządzania naprawami</Text>
        </View>

        {/* Formularz */}
        <View style={styles.form}>
          <Text style={styles.label}>Adres email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="twoj@email.pl"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="oneTimeCode"
            importantForAutofill="no"
          />

          <Text style={styles.label}>Hasło</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoComplete="off"
            textContentType="oneTimeCode"
            importantForAutofill="no"
          />

          <Button
            label="Zaloguj się"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />

          {/* Separator "lub" */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>lub</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Logowanie Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => promptAsync()}
            disabled={!request || googleLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>
              {googleLoading ? 'Logowanie…' : 'Zaloguj się przez Google'}
            </Text>
          </TouchableOpacity>

          {/* Przejście do rejestracji */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              Nie masz konta?{' '}
              <Text style={styles.registerHighlight}>Zarejestruj się</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info o kontach Firebase */}
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>🔥 Logowanie przez Firebase</Text>
          <Text style={styles.demoText}>
            Konta nie są już z mockDb – zarejestruj się przez przycisk poniżej lub zaloguj Google. Pierwsze konto stworzone przez Ciebie ręcznie w Firebase Console (Authentication → Users → Add user) automatycznie dostanie rolę „Klient" – rolę zmienisz potem w panelu Admina.
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: colors.background },
  container:  { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:     { alignItems: 'center', marginBottom: 36 },
  logoBadge:  { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#5A4FE0', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  logo:       { fontSize: 40 },
  title:      { fontSize: 28, fontWeight: '800', color: colors.primary },
  subtitle:   { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  form:       { gap: 4 },
  label:      { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  switchRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 4 },
  switchLabel:    { fontSize: 14, color: colors.textPrimary },
  loginBtn:       { marginTop: 20 },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine:    { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText:    { fontSize: 12, color: colors.textSecondary, marginHorizontal: 12 },
  googleBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 13, gap: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  googleIcon:     { fontSize: 16, fontWeight: '800', color: '#4285F4', backgroundColor: '#fff', width: 22, height: 22, textAlign: 'center', borderRadius: 11, lineHeight: 22 },
  googleText:     { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  registerLink:   { alignItems: 'center', marginTop: 16 },
  registerText:   { fontSize: 14, color: colors.textSecondary },
  registerHighlight: { color: colors.accent, fontWeight: '600' },
  demoBox:        { marginTop: 32, padding: 14, backgroundColor: colors.surface, borderRadius: 14, borderLeftWidth: 3, borderLeftColor: colors.accent },
  demoTitle:      { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  demoText:       { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
});

export default LoginScreen;
