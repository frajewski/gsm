// ============================================================
//  SettingsScreen.jsx – ustawienia serwisu i wydruku
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Switch, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import useSettings from '../store/useSettings';
import Button      from '../components/Button';
import Card        from '../components/Card';
import { useColors, useTheme } from '../constants/ThemeContext';

const SettingsScreen = () => {
  const colors         = useColors();
  const styles         = makeStyles(colors);
  const { isDark, preference, setTheme } = useTheme();
  const settings       = useSettings();
  const updateSettings = useSettings((s) => s.updateSettings);

  // Lokalne kopie do edycji
  const [shopName,    setShopName]    = useState(settings.shopName);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [shopPhone,   setShopPhone]   = useState(settings.shopPhone);
  const [qrContent,   setQrContent]   = useState(settings.qrContent);
  const [qrLabel,     setQrLabel]     = useState(settings.qrLabel);

  const handleSave = () => {
    updateSettings({ shopName, shopAddress, shopPhone, qrContent, qrLabel });
    Alert.alert('✅ Zapisano', 'Ustawienia zostały zaktualizowane.');
  };

  const ToggleRow = ({ label, sub, value, onChange }) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sub && <Text style={styles.toggleSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={value ? colors.primary : '#f4f3f4'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

      {/* MOTYW APLIKACJI */}
      <Text style={styles.section}>Motyw aplikacji</Text>
      <Card>
        <View style={styles.themeRow}>
          {[
            { value: 'system', label: '🌓 Systemowy', sub: 'Podąża za ustawieniem telefonu' },
            { value: 'light',  label: '☀️ Jasny',     sub: 'Zawsze jasny motyw' },
            { value: 'dark',   label: '🌙 Ciemny',    sub: 'Zawsze ciemny motyw' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.themeOption, preference === opt.value && styles.themeOptionActive]}
              onPress={() => setTheme(opt.value)}
              activeOpacity={0.75}
            >
              <Text style={styles.themeEmoji}>{opt.label.split(' ')[0]}</Text>
              <Text style={[styles.themeLabel, preference === opt.value && styles.themeLabelActive]}>
                {opt.label.split(' ').slice(1).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* DANE SERWISU */}
      <Text style={styles.section}>Dane serwisu</Text>
      <Card>
        <Text style={styles.label}>Nazwa serwisu</Text>
        <TextInput style={styles.input} value={shopName} onChangeText={setShopName}
          placeholder="GSM Serwis" placeholderTextColor={colors.textSecondary} />
        <Text style={styles.label}>Adres</Text>
        <TextInput style={styles.input} value={shopAddress} onChangeText={setShopAddress}
          placeholder="ul. Przykładowa 1, Miasto" placeholderTextColor={colors.textSecondary} />
        <Text style={styles.label}>Telefon kontaktowy</Text>
        <TextInput style={styles.input} value={shopPhone} onChangeText={setShopPhone}
          placeholder="+48 500 000 000" placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad" />
      </Card>

      {/* USTAWIENIA WYDRUKU */}
      <Text style={styles.section}>Ustawienia wydruku potwierdzenia</Text>
      <Card>
        <ToggleRow
          label="Data realizacji zlecenia"
          sub="Wyświetlana pod nazwiskiem osoby przyjmującej"
          value={settings.showCompletionDate}
          onChange={(v) => updateSettings({ showCompletionDate: v })}
        />
        <ToggleRow
          label="Wzór blokady ekranu"
          sub="Pole na wzór PIN/hasła klienta – prawa strona, pod numerem seryjnym"
          value={settings.showScreenLockPattern}
          onChange={(v) => updateSettings({ showScreenLockPattern: v })}
        />
      </Card>

      {/* KOD QR */}
      <Text style={styles.section}>Kod QR na potwierdzeniu</Text>
      <Card>
        <Text style={styles.info}>
          Jeśli pole poniżej jest puste, kod QR nie pojawi się na wydruku.
        </Text>
        <Text style={styles.label}>Treść do zakodowania</Text>
        <TextInput style={styles.input} value={qrContent} onChangeText={setQrContent}
          placeholder="np. https://g.page/r/twoj-link-google-opinie"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none" autoCorrect={false} />
        <Text style={styles.label}>Opis nad kodem QR (opcjonalnie)</Text>
        <TextInput style={styles.input} value={qrLabel} onChangeText={setQrLabel}
          placeholder="np. Oceń nas w Google!" placeholderTextColor={colors.textSecondary} />
        {qrContent ? (
          <View style={styles.qrPreview}>
            <Text style={styles.qrPreviewText}>✅ QR będzie drukowany na potwierdzeniu</Text>
            <Text style={styles.qrPreviewSub}>{qrContent}</Text>
          </View>
        ) : (
          <View style={[styles.qrPreview, { backgroundColor: colors.border + '40' }]}>
            <Text style={styles.qrPreviewText}>— QR nie będzie drukowany</Text>
          </View>
        )}
      </Card>

      <Button label="💾 Zapisz ustawienia" onPress={handleSave} style={{ marginTop: 16, marginBottom: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  content:          { padding: 16 },
  section:          { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  label:            { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input:            { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.textPrimary },
  toggleRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  toggleInfo:       { flex: 1, marginRight: 12 },
  toggleLabel:      { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  toggleSub:        { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  info:             { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  qrPreview:        { marginTop: 12, padding: 12, backgroundColor: colors.success + '15', borderRadius: 8 },
  qrPreviewText:    { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  qrPreviewSub:     { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  // Przełącznik motywu
  themeRow:         { flexDirection: 'row', gap: 10 },
  themeOption:      { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  themeOptionActive:{ backgroundColor: colors.accent + '18', borderColor: colors.accent },
  themeEmoji:       { fontSize: 22, marginBottom: 4 },
  themeLabel:       { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  themeLabelActive: { color: colors.accent },
});

export default SettingsScreen;
