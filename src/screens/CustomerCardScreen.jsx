// ============================================================
//  CustomerCardScreen.jsx – karta klienta (tylko serwisant)
//  Wyświetla historię wszystkich napraw wybranego klienta
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import useStore       from '../store/useStore';
import Card           from '../components/Card';
import StatusBadge    from '../components/StatusBadge';
import RepairListItem from '../components/RepairListItem';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { formatDateShort } from '../utils/formatDate';
import { calcProfit, calcRevenue } from '../utils/calcProfit';
import STATUS         from '../constants/statuses';

const CustomerCardScreen = ({ route, navigation }) => {
  const { customerId } = route.params;

  const getUserById        = useStore((state) => state.getUserById);
  const getRepairsByCustomer = useStore((state) => state.getRepairsByCustomer);

  const customer = getUserById(customerId);
  const repairs  = getRepairsByCustomer(customerId);

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Nie znaleziono klienta.</Text>
      </View>
    );
  }

  const completed  = repairs.filter(r => r.status === STATUS.DELIVERED);
  const active     = repairs.filter(r => !['Odebrane','Anulowane'].includes(r.status));
  const totalValue = calcRevenue(completed);  // suma przychodów z tego klienta

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* --- AVATAR I DANE KLIENTA --- */}
      <Card style={styles.headerCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerPhone}>{customer.phone || 'Brak nr telefonu'}</Text>
            <Text style={styles.customerEmail}>{customer.email}</Text>
          </View>
        </View>
      </Card>

      {/* --- STATYSTYKI KLIENTA --- */}
      <View style={styles.statsRow}>
        <StatBox label="Łącznie" value={repairs.length} color={colors.primary} />
        <StatBox label="Aktywne" value={active.length} color={colors.accent} />
        <StatBox label="Zakończone" value={completed.length} color={colors.success} />
        <StatBox label="Wartość" value={`${totalValue} zł`} color={colors.warning} />
      </View>

      {/* --- LISTA NAPRAW KLIENTA --- */}
      <Text style={styles.sectionTitle}>Historia napraw ({repairs.length})</Text>

      {repairs.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>Ten klient nie ma jeszcze żadnych zleceń.</Text>
        </Card>
      ) : (
        [...repairs]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((repair) => (
            <RepairListItem
              key={repair.id}
              repair={repair}
              onPress={() => navigation.navigate('RepairDetails', { repairId: repair.id })}
            />
          ))
      )}
    </ScrollView>
  );
};

// Mała karta statystyki
const StatBox = ({ label, value, color }) => (
  <View style={[statStyles.box, { borderTopColor: color }]}>
    <Text style={[statStyles.value, { color }]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const statStyles = StyleSheet.create({
  box:   { flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderTopWidth: 3, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 16, paddingBottom: 40 },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:    { fontSize: 16, color: colors.danger },
  headerCard:   { marginBottom: 8 },
  avatarRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar:       { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 24, color: '#fff', fontWeight: '700' },
  headerInfo:   { flex: 1 },
  customerName: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  customerPhone:{ fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  customerEmail:{ fontSize: 13, color: colors.textSecondary },
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  emptyText:    { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 8 },
});

export default CustomerCardScreen;
