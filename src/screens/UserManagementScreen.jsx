// ============================================================
//  UserManagementScreen.jsx – zarządzanie użytkownikami
//  Tylko dla admina. Zmiana ról, podgląd kont.
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import useStore from '../store/useStore';
import Card     from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { ROLES, ROLE_LABELS, ROLE_COLORS } from '../constants/roles';

const UserManagementScreen = () => {
  const getAllUsers     = useStore((s) => s.getAllUsers);
  const updateUserRole = useStore((s) => s.updateUserRole);
  const currentUser    = useStore((s) => s.currentUser);
  const getRepairsByCustomer = useStore((s) => s.getRepairsByCustomer);

  const [filter, setFilter] = useState(null);

  const allUsers = getAllUsers().filter(u => u.id !== currentUser?.id); // wyklucz siebie
  const filtered = filter ? allUsers.filter(u => u.role === filter) : allUsers;

  const handleRoleChange = (user, newRole) => {
    if (newRole === user.role) return;
    Alert.alert(
      'Zmiana roli',
      `Zmienić rolę ${user.name} na ${ROLE_LABELS[newRole]}?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zmień',
          onPress: () => {
            updateUserRole(user.id, newRole);
            Alert.alert('✅ Zaktualizowano', `Rola ${user.name} została zmieniona.`);
          },
        },
      ]
    );
  };

  const ROLE_FILTERS = [
    { label: 'Wszyscy',     value: null },
    { label: '🔧 Pracownicy', value: ROLES.WORKER },
    { label: '👤 Klienci',  value: ROLES.CUSTOMER },
  ];

  return (
    <FlatList
      style={styles.container}
      data={filtered}
      keyExtractor={(u) => u.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          {/* Filtry */}
          <View style={styles.filterRow}>
            {ROLE_FILTERS.map(f => (
              <TouchableOpacity
                key={String(f.value)}
                style={[styles.chip, filter === f.value && styles.chipActive]}
                onPress={() => setFilter(f.value)}
              >
                <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.countText}>{filtered.length} użytkowników</Text>
        </>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>Brak użytkowników</Text>
        </View>
      }
      renderItem={({ item: user }) => {
        const repairCount = getRepairsByCustomer(user.id).length;
        const roleColor   = ROLE_COLORS[user.role] || colors.textSecondary;
        return (
          <Card style={styles.card} padding={16}>
            {/* Nagłówek karty */}
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
              </View>
              {/* Badge roli */}
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {ROLE_LABELS[user.role]}
                </Text>
              </View>
            </View>

            {/* Statystyki */}
            {user.role === ROLES.CUSTOMER && (
              <Text style={styles.statText}>📋 Zlecenia: {repairCount}</Text>
            )}

            {/* Zmiana roli */}
            <Text style={styles.changeRoleLabel}>Zmień rolę:</Text>
            <View style={styles.roleButtons}>
              {Object.values(ROLES)
                .filter(r => r !== ROLES.ADMIN) // admin nie może nadawać roli admin przez UI
                .map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleBtn,
                      user.role === role && { backgroundColor: ROLE_COLORS[role], borderColor: ROLE_COLORS[role] },
                    ]}
                    onPress={() => handleRoleChange(user, role)}
                  >
                    <Text style={[
                      styles.roleBtnText,
                      user.role === role && { color: '#fff' },
                    ]}>
                      {ROLE_LABELS[role]}
                    </Text>
                  </TouchableOpacity>
                ))
              }
            </View>
          </Card>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 16, paddingBottom: 40 },
  filterRow:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:       { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  countText:      { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  card:           { marginBottom: 10 },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatar:         { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:     { fontSize: 18, color: '#fff', fontWeight: '700' },
  userInfo:       { flex: 1 },
  userName:       { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  userEmail:      { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  userPhone:      { fontSize: 12, color: colors.textSecondary },
  roleBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  roleText:       { fontSize: 11, fontWeight: '700' },
  statText:       { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  changeRoleLabel:{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  roleButtons:    { flexDirection: 'row', gap: 8 },
  roleBtn:        { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  roleBtnText:    { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  empty:          { alignItems: 'center', paddingTop: 60 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 15, color: colors.textSecondary },
});

export default UserManagementScreen;
