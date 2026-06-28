// ============================================================
//  ProfileScreen.jsx – dane użytkownika + wylogowanie
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import useStore from '../store/useStore';
import Button   from '../components/Button';
import Card     from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';

const ProfileScreen = ({ navigation }) => {
  const currentUser = useStore((state) => state.currentUser);
  const logout      = useStore((state) => state.logout);
  const repairs     = useStore((state) => state.repairs);

  // Statystyki konta
  const myRepairs   = repairs.filter((r) => r.customerId === currentUser?.id);
  const isTechnician = ['admin', 'worker'].includes(currentUser?.role);

  const handleLogout = () => {
    Alert.alert(
      'Wylogowanie',
      'Czy na pewno chcesz się wylogować?',
      [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Wyloguj', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  if (!currentUser) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Avatar i nazwa */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {currentUser.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{currentUser.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {isTechnician ? '🔧 Serwisant' : '👤 Klient'}
          </Text>
        </View>
      </View>

      {/* Dane kontaktowe */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Dane kontaktowe</Text>
        <InfoRow label="Email"   value={currentUser.email} />
        <InfoRow label="Telefon" value={currentUser.phone || 'Nie podano'} />
        <InfoRow label="ID konta" value={currentUser.id} mono />
      </Card>

      {/* Statystyki (widoczne dla klienta) */}
      {!isTechnician && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Moje zlecenia</Text>
          <InfoRow label="Łącznie" value={`${myRepairs.length}`} />
          <InfoRow label="Aktywnych" value={`${myRepairs.filter(r => !['Odebrane','Anulowane'].includes(r.status)).length}`} />
          <InfoRow label="Zakończonych" value={`${myRepairs.filter(r => r.status === 'Odebrane').length}`} />
        </Card>
      )}

      {/* Szybkie akcje dla serwisanta */}
      {isTechnician && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Szybkie akcje</Text>
          <Button
            label="📊 Statystyki serwisu"
            variant="ghost"
            onPress={() => navigation.navigate('Stats')}
            style={styles.actionBtn}
          />
          <Button
            label="⚙️ Ustawienia serwisu"
            variant="ghost"
            onPress={() => navigation.navigate('Settings')}
            style={styles.actionBtn}
          />
        </Card>
      )}

      {/* Wylogowanie */}
      <Button
        label="Wyloguj się"
        variant="danger"
        onPress={handleLogout}
        style={styles.logoutBtn}
      />

      <Text style={styles.version}>GSM Service App v1.0.0 • Mock DB</Text>
    </ScrollView>
  );
};

// Wiersz z etykietą i wartością
const InfoRow = ({ label, value, mono = false }) => (
  <View style={rowStyles.row}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={[rowStyles.value, mono && rowStyles.mono]}>{value}</Text>
  </View>
);

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { fontSize: 14, color: colors.textSecondary },
  value: { fontSize: 14, color: colors.textPrimary, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  mono:  { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
});

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 16 },
  avatarSection:  { alignItems: 'center', paddingVertical: 28 },
  avatar:         { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:     { fontSize: 32, color: '#fff', fontWeight: '700' },
  name:           { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  roleBadge:      { marginTop: 6, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: colors.accent + '20', borderRadius: 16 },
  roleText:       { fontSize: 13, color: colors.accent, fontWeight: '600' },
  card:           { marginBottom: 8 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  actionBtn:      { marginTop: 4 },
  logoutBtn:      { marginTop: 16 },
  version:        { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: 24, marginBottom: 16 },
});

export default ProfileScreen;
