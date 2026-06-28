// ============================================================
//  TradeStatsScreen.jsx – raporty skupu/sprzedaży
//  Zakładki: Ten miesiąc / Ten rok / Wszystko
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import useStore  from '../store/useStore';
import Card      from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import {
  getTradeStatsByPeriod,
  getTopTradeBrands,
  getMonthlyTradeData,
} from '../utils/calcTrade';

const TABS = [
  { key: 'thisMonth', label: 'Miesiąc' },
  { key: 'thisYear',  label: 'Rok' },
  { key: 'allTime',   label: 'Całość' },
];

const TradeStatsScreen = () => {
  const phones    = useStore((s) => s.phones);
  const [tab, setTab] = useState('thisMonth');

  const periodStats = getTradeStatsByPeriod(phones);
  const stats       = periodStats[tab];
  const topBrands   = getTopTradeBrands(phones);
  const monthly     = getMonthlyTradeData(phones);

  const profitColor = stats.totalProfit >= 0 ? colors.success : colors.danger;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ZAKŁADKI */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KARTY OPERACYJNE */}
      <View style={styles.grid}>
        <MetricCard icon="📱" label="Skupiono"    value={stats.total}    color={colors.primary} />
        <MetricCard icon="💰" label="Sprzedano"   value={stats.sold}     color={colors.success} />
        <MetricCard icon="📦" label="W magazynie" value={stats.inStock}  color={colors.accent}  />
        <MetricCard icon="🔧" label="W naprawie"  value={stats.inRepair} color={colors.warning} />
      </View>

      {/* FINANSE */}
      <Card>
        <Text style={styles.sectionTitle}>Finanse</Text>
        <FinRow label="Wydano na zakupy"  value={`${stats.totalBought} zł`}  />
        <FinRow label="Przychód ze sprzedaży" value={`${stats.totalSold} zł`} positive />
        <FinRow label="Wartość magazynu"  value={`${stats.stockValue} zł`}   />
        <View style={styles.profitBox}>
          <Text style={styles.profitLabel}>Zysk netto</Text>
          <Text style={[styles.profitValue, { color: profitColor }]}>
            {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit} zł
          </Text>
        </View>
      </Card>

      {/* TOP MARKI */}
      {topBrands.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Najpopularniejsze marki</Text>
          {topBrands.map((item, i) => (
            <View key={item.name} style={styles.rankRow}>
              <Text style={styles.rankPos}>#{i + 1}</Text>
              <Text style={styles.rankName}>{item.name}</Text>
              <View style={styles.barWrap}>
                <View style={[styles.bar, { width: `${(item.count / topBrands[0].count) * 100}%` }]} />
              </View>
              <Text style={styles.rankCount}>{item.count}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* RAPORT MIESIĘCZNY */}
      <Card>
        <Text style={styles.sectionTitle}>Raport miesięczny — {new Date().getFullYear()}</Text>
        {monthly.filter(m => m.bought > 0).length === 0 ? (
          <Text style={styles.emptyText}>Brak danych w tym roku</Text>
        ) : (
          <>
            {/* Nagłówek tabeli */}
            <View style={[styles.monthRow, styles.monthHeader]}>
              <Text style={[styles.monthCell, styles.monthHeaderText, { flex: 2 }]}>Miesiąc</Text>
              <Text style={[styles.monthCell, styles.monthHeaderText]}>Skupiono</Text>
              <Text style={[styles.monthCell, styles.monthHeaderText]}>Sprzed.</Text>
              <Text style={[styles.monthCell, styles.monthHeaderText]}>Zysk</Text>
            </View>
            {monthly.map((m) => m.bought > 0 && (
              <View key={m.month} style={styles.monthRow}>
                <Text style={[styles.monthCell, { flex: 2, fontWeight: '600', color: colors.textPrimary }]}>{m.month}</Text>
                <Text style={[styles.monthCell, { color: colors.textSecondary }]}>{m.bought}</Text>
                <Text style={[styles.monthCell, { color: colors.textSecondary }]}>{m.sold}</Text>
                <Text style={[styles.monthCell, { color: m.profit >= 0 ? colors.success : colors.danger, fontWeight: '700' }]}>
                  {m.profit >= 0 ? '+' : ''}{m.profit} zł
                </Text>
              </View>
            ))}
          </>
        )}
      </Card>

    </ScrollView>
  );
};

const MetricCard = ({ icon, label, value, color }) => (
  <View style={[metS.card, { borderTopColor: color }]}>
    <Text style={metS.icon}>{icon}</Text>
    <Text style={[metS.value, { color }]}>{value}</Text>
    <Text style={metS.label}>{label}</Text>
  </View>
);

const FinRow = ({ label, value, positive = false }) => (
  <View style={finS.row}>
    <Text style={finS.label}>{label}</Text>
    <Text style={[finS.value, positive && { color: colors.success }]}>{value}</Text>
  </View>
);

const metS = StyleSheet.create({
  card:  { flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderTopWidth: 3, padding: 10, alignItems: 'center', margin: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  icon:  { fontSize: 20, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
});

const finS = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { fontSize: 14, color: colors.textSecondary },
  value: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
});

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 16, paddingBottom: 40 },
  tabRow:         { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 },
  tab:            { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive:      { backgroundColor: colors.primary },
  tabText:        { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive:  { color: '#fff', fontWeight: '700' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', margin: -4, marginBottom: 8 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  profitBox:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: colors.primary },
  profitLabel:    { fontSize: 16, fontWeight: '700', color: colors.primary },
  profitValue:    { fontSize: 24, fontWeight: '800' },
  rankRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  rankPos:        { width: 24, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  rankName:       { width: 80, fontSize: 14, color: colors.textPrimary },
  barWrap:        { flex: 1, height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  bar:            { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  rankCount:      { width: 24, fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'right' },
  monthRow:       { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  monthHeader:    { borderBottomWidth: 2, borderBottomColor: colors.border },
  monthHeaderText:{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  monthCell:      { flex: 1, fontSize: 13, textAlign: 'right' },
  emptyText:      { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 },
});

export default TradeStatsScreen;
