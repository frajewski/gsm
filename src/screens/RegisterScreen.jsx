// ============================================================
//  RegisterScreen.jsx – rejestracja nowego konta klienta
//  Każde konto z tego formularza dostaje WYŁĄCZNIE rolę "customer".
//  Rolę "pracownik" może nadać tylko Admin przez UserManagementScreen –
//  nikt nie może samodzielnie dać sobie dostępu do zleceń innych klientów.
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import useStore  from '../store/useStore';
import Button    from '../components/Button';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { validateEmail, validatePhone } from '../services/authService';
import { ROLES } from '../constants/roles';

const RegisterScreen = ({ navigation }) => {
  const register = useStore((state) => state.register);

  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async () => {
    // Podstawowa walidacja
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Błąd', 'Podaj prawidłowy adres email.');
      return;
    }
    if (phone && !validatePhone(phone)) {
      Alert.alert('Błąd', 'Podaj prawidłowy numer telefonu (9 cyfr).');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Błąd', 'Hasło musi mieć minimum 6 znaków.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Błąd', 'Hasła nie są zgodne.');
      return;
    }

    setLoading(true);
    const result = await register({
      name:     name.trim(),
      phone:    phone.trim(),
      email:    email.trim(),
      password,
      // Ta wartość jest tylko placeholderem – store.register() i tak sam decyduje
      // o faktycznej roli (pierwsza osoba w świeżej instalacji = Admin, każda
      // kolejna = Customer), niezależnie od tego co tu wpiszemy.
      role:     ROLES.CUSTOMER,
    });
    setLoading(false);
    if (!result.success) {
      Alert.alert('Błąd rejestracji', result.error);
    } else if (result.becameAdmin) {
      Alert.alert(
        '👑 Witaj, Administratorze!',
        'Jesteś pierwszą osobą rejestrującą się w tej aplikacji, więc automatycznie otrzymujesz pełne uprawnienia administratora tego serwisu.'
      );
    }
    // Sukces → RootNavigator automatycznie przełącza na Dashboard
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Nowe konto</Text>
        <Text style={styles.subtitle}>Wypełnij dane aby założyć konto klienta</Text>

        {/* Imię i nazwisko */}
        <Text style={styles.label}>Imię i nazwisko *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="Jan Kowalski" placeholderTextColor={colors.textSecondary} />

        {/* Telefon */}
        <Text style={styles.label}>Numer telefonu</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone}
          placeholder="+48 600 000 000" placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad" />

        {/* Email */}
        <Text style={styles.label}>Email *</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail}
          placeholder="jan@example.com" placeholderTextColor={colors.textSecondary}
          keyboardType="email-address" autoCapitalize="none"
          autoComplete="off" textContentType="oneTimeCode" importantForAutofill="no" />

        {/* Hasło */}
        <Text style={styles.label}>Hasło * (min. 6 znaków)</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword}
          placeholder="••••••••" placeholderTextColor={colors.textSecondary} secureTextEntry
          autoComplete="off" textContentType="oneTimeCode" importantForAutofill="no" />

        {/* Potwierdzenie hasła */}
        <Text style={styles.label}>Powtórz hasło *</Text>
        <TextInput style={styles.input} value={confirm} onChangeText={setConfirm}
          placeholder="••••••••" placeholderTextColor={colors.textSecondary} secureTextEntry
          autoComplete="off" textContentType="oneTimeCode" importantForAutofill="no" />

        {/* Info o roli – żadnego wyboru, tylko wyjaśnienie */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Konto utworzone tutaj otrzymuje rolę „Klient" – widzisz tylko własne zlecenia.
            Jeśli pracujesz w serwisie, poproś administratora o nadanie roli pracownika
            po zarejestrowaniu się.
          </Text>
        </View>

        <Button label="Zarejestruj się" onPress={handleRegister} loading={loading} style={styles.btn} />
        <Button label="Mam już konto" variant="ghost" onPress={() => navigation.goBack()} style={styles.btn} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: colors.background },
  container:  { padding: 24, paddingTop: 16 },
  title:      { fontSize: 24, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  subtitle:   { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  label:      { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 14 },
  input: {
    backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1,
    borderColor: colors.border, padding: 14, fontSize: 15, color: colors.textPrimary,
  },
  infoBox:    { marginTop: 20, padding: 14, backgroundColor: colors.accent + '12', borderRadius: 10 },
  infoText:   { fontSize: 12, color: colors.textPrimary, lineHeight: 18 },
  btn:        { marginTop: 12 },
});

export default RegisterScreen;
