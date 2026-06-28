// ============================================================
//  StatsScreen.jsx – statystyki finansowe i operacyjne serwisu
//  Tylko dla serwisanta. Używa calcProfit.js do obliczeń.
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import useStore from '../store/useStore';
import Card     from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import {
  getStatsByPeriod,
  getTopBrands,
  getMonthlyData,
} from '../utils/calcProfit';

// Zakładki: dzisiaj / ten miesiąc / ten rok
const TABS = [
  { key: 'today',     label: 'Dziś' },
  { key: 'thisMonth', label: 'Miesiąc' },
  { key: 'thisYear',  label: 'Rok' },
];

const StatsScreen = () => {
  const repairs = useStore((state) => state.repairs);
  const [activeTab, setActiveTab] = useState('thisMonth');

  // Oblicz statystyki dla wszystkich okresów
  const periodStats = getStatsByPeriod(repairs);
  const stats       = periodStats[activeTab];
  const topBrands   = getTopBrands(repairs).slice(0, 5); // top 5 marek
  const monthly     = getMonthlyData(repairs);

  // Kolor zysku – czerwony jeśli ujemny
  const profitColor = stats.profit >= 0 ? colors.success : colors.danger;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* --- ZAKŁADKI OKRESU --- */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- KARTY GŁÓWNYCH METRYK --- */}
      <View style={styles.metricsGrid}>
        <MetricCard label="Zlecenia" value={stats.total}     color={colors.primary} icon="📋" />
        <MetricCard label="Aktywne"  value={stats.active}    color={colors.accent}  icon="🔧" />
        <MetricCard label="Gotowe"   value={stats.completed} color={colors.success} icon="✅" />
        <MetricCard label="Anulowane" value={stats.cancelled} color={colors.danger}  icon="❌" />
      </View>

      {/* --- FINANSE --- */}
      <Card style={styles.financeCard}>
        <Text style={styles.sectionTitle}>Finanse</Text>
        <FinanceRow label="Przychód (usługi)" value={`${stats.revenue} zł`} />
        <FinanceRow label="Koszty (części)"   value={`${stats.partsCost} zł`} negative />
        <View style={styles.divider} />
        <View style={styles.profitRow}>
          <Text style={styles.profitLabel}>Zysk netto</Text>
          <Text style={[styles.profitValue, { color: profitColor }]}>
            {stats.profit >= 0 ? '+' : ''}{stats.profit} zł
          </Text>
        </View>
      </Card>

      {/* --- TOP MARKI --- */}
      <Card>
        <Text style={styles.sectionTitle}>Najpopularniejsze marki</Text>
        {topBrands.length === 0 ? (
          <Text style={styles.emptyText}>Brak danych</Text>
        ) : (
          topBrands.map((item, index) => (
            <View key={item.name} style={styles.rankRow}>
              <Text style={styles.rankPos}>#{index + 1}</Text>
              <Text style={styles.rankName}>{item.name}</Text>
              {/* Pasek postępu jako wizualizacja bez biblioteki wykresów */}
              <View style={styles.barWrap}>
                <View style={[
                  styles.bar,
                  { width: `${(item.count / topBrands[0].count) * 100}%` }
                ]} />
              </View>
              <Text style={styles.rankCount}>{item.count}</Text>
            </View>
          ))
        )}
      </Card>

      {/* --- DANE MIESIĘCZNE (bieżący rok) --- */}
      <Card>
        <Text style={styles.sectionTitle}>Zysk miesięczny – {new Date().getFullYear()}</Text>
        {monthly.filter(m => m.count > 0).length === 0 ? (
          <Text style={styles.emptyText}>Brak zleceń w bieżącym roku</Text>
        ) : (
          monthly.map((m) => (
            m.count > 0 && (
              <View key={m.month} style={styles.monthRow}>
                <Text style={styles.monthName}>{m.month}</Text>
                <Text style={styles.monthCount}>{m.count} zleceń</Text>
                <Text style={[styles.monthProfit, { color: m.profit >= 0 ? colors.success : colors.danger }]}>
                  {m.profit >= 0 ? '+' : ''}{m.profit} zł
                </Text>
              </View>
            )
          ))
        )}
      </Card>

    </ScrollView>
  );
};

// Karta metryki (zlecenia, aktywne itp.)
const MetricCard = ({ label, value, color, icon }) => (
  <View style={[metricStyles.card, { borderTopColor: color }]}>
    <Text style={metricStyles.icon}>{icon}</Text>
    <Text style={[metricStyles.value, { color }]}>{value}</Text>
    <Text style={metricStyles.label}>{label}</Text>
  </View>
);

// Wiersz finansowy
const FinanceRow = ({ label, value, negative = false }) => (
  <View style={finStyles.row}>
    <Text style={finStyles.label}>{label}</Text>
    <Text style={[finStyles.value, negative && { color: colors.danger }]}>{value}</Text>
  </View>
);

const metricStyles = StyleSheet.create({
  card:  { flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderTopWidth: 3, padding: 12, alignItems: 'center', margin: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  icon:  { fontSize: 20, marginBottom: 4 },
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
});

const finStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { fontSize: 14, color: colors.textSecondary },
  value: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
});

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 16, paddingBottom: 40 },
  tabRow:       { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 4, marginBottom: 16, gap: 4 },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive:    { backgroundColor: colors.primary },
  tabText:      { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive:{ color: '#fff', fontWeight: '700' },
  metricsGrid:  { flexDirection: 'row', flexWrap: 'wrap', margin: -4, marginBottom: 8 },
  financeCard:  { marginBottom: 0 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  divider:      { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  profitRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  profitLabel:  { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  profitValue:  { fontSize: 22, fontWeight: '800' },
  rankRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  rankPos:      { width: 24, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  rankName:     { width: 80, fontSize: 14, color: colors.textPrimary },
  barWrap:      { flex: 1, height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  bar:          { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  rankCount:    { width: 24, fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'right' },
  monthRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  monthName:    { fontSize: 14, color: colors.textPrimary, flex: 1 },
  monthCount:   { fontSize: 13, color: colors.textSecondary, marginHorizontal: 8 },
  monthProfit:  { fontSize: 14, fontWeight: '700' },
  emptyText:    { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 8 },
});

export default StatsScreen;
