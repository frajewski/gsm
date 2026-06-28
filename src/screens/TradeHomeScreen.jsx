// ============================================================
//  TradeHomeScreen.jsx – lista telefonów w skupie
//  Tylko dla serwisanta. Wyszukiwarka + filtry statusu + FAB
// ============================================================

import React, { useState } from 'react';
import {
  View, FlatList, Text, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import useStore          from '../store/useStore';
import Card              from '../components/Card';
import FAB               from '../components/FAB';
import SectionHeader     from '../components/SectionHeader';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { TRADE_STATUS, tradeStatusColors, tradeStatusIcons, tradeStatusList } from '../constants/tradeStatuses';
import { gradeEmojis, gradeColors }  from '../constants/grades';
import { formatDateShort }           from '../utils/formatDate';
import { calcPhoneProfit }           from '../utils/calcTrade';

const TradeHomeScreen = ({ navigation }) => {
  const phones      = useStore((state) => state.phones);
  const currentUser = useStore((state) => state.currentUser);
  // Tylko admin widzi ceny zakupu/sprzedaży i zysk na liście. Pracownik widzi
  // tylko status i podstawowe dane urządzenia – jego rola to przyjęcie/wydanie.
  const isAdmin = currentUser?.role === 'admin';
  const [search,         setSearch]         = useState('');
  const [selectedStatus, setSelectedStatus] = useState(null);

  // Filtrowanie
  const filtered = phones.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.brand?.toLowerCase().includes(q) ||
      p.model?.toLowerCase().includes(q) ||
      p.imei?.includes(q) ||
      p.color?.toLowerCase().includes(q);
    const matchStatus = !selectedStatus || p.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  // Najnowsze pierwsze
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.boughtAt) - new Date(a.boughtAt)
  );

  // Szybkie podsumowanie u góry
  const totalCount  = phones.length;
  const soldCount   = phones.filter(p => p.status === TRADE_STATUS.SOLD).length;
  const stockCount  = totalCount - soldCount;

  return (
    <View style={styles.container}>

      {/* Szybkie podsumowanie */}
      <View style={styles.summary}>
        <SummaryChip label="W magazynie" value={stockCount} color={colors.accent} />
        <SummaryChip label="Sprzedane"   value={soldCount}  color={colors.success} />
        <SummaryChip label="Łącznie"     value={totalCount} color={colors.primary} />
      </View>

      {/* Wyszukiwarka */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Szukaj: marka, model, IMEI…"
          placeholderTextColor={colors.textSecondary}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filtry statusów */}
      <FlatList
        horizontal
        data={[{ label: 'Wszystkie', value: null }, ...tradeStatusList.map(s => ({ label: s, value: s }))]}
        keyExtractor={(item) => String(item.value)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, selectedStatus === item.value && styles.chipActive]}
            onPress={() => setSelectedStatus(item.value)}
          >
            <Text style={[styles.chipText, selectedStatus === item.value && styles.chipTextActive]}>
              {item.value ? tradeStatusIcons[item.value] + ' ' : ''}{item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <SectionHeader
        title="Telefony"
        count={sorted.length}
        actionLabel={isAdmin ? "📊 Raport" : undefined}
        onAction={isAdmin ? () => navigation.navigate('TradeStats') : undefined}
      />

      {/* Lista telefonów */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyText}>
              {search ? 'Brak wyników' : 'Brak telefonów w skupie'}
            </Text>
            {!search && (
              <Text style={styles.emptySub}>Naciśnij „+" aby dodać pierwszy telefon</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PhoneListItem
            phone={item}
            isAdmin={isAdmin}
            onPress={() => navigation.navigate('TradeDetail', { phoneId: item.id })}
          />
        )}
      />

      <FAB onPress={() => navigation.navigate('TradeAdd')} />
    </View>
  );
};

// Karta telefonu na liście
const PhoneListItem = ({ phone, isAdmin, onPress }) => {
  const profit      = calcPhoneProfit(phone);
  const statusColor = tradeStatusColors[phone.status] || colors.textSecondary;
  const gradeEmoji  = gradeEmojis[phone.grade] || '•';
  const gradeColor  = gradeColors[phone.grade]  || colors.textSecondary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card style={styles.card} padding={14}>
        <View style={styles.cardTop}>
          {/* Lewa strona: marka + model */}
          <View style={styles.cardLeft}>
            <Text style={styles.deviceName}>{phone.brand} {phone.model}</Text>
            <Text style={styles.deviceSub}>
              {gradeEmoji} Grade {phone.grade}
              {'  '}
              <Text style={{ color: colors.textSecondary }}>{phone.color}</Text>
              {phone.storage ? `  •  ${phone.storage}` : ''}
            </Text>
            {phone.imei && (
              <Text style={styles.imei}>IMEI: {phone.imei}</Text>
            )}
          </View>
          {/* Prawa strona: status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {tradeStatusIcons[phone.status]} {phone.status}
            </Text>
          </View>
        </View>

        {/* Dolny wiersz: ceny + zysk – TYLKO admin. Pracownik widzi tylko datę. */}
        <View style={styles.cardBottom}>
          {isAdmin && (
            <>
              <PriceChip label="Kupno" value={phone.buyPrice} color={colors.danger} />
              {phone.status === TRADE_STATUS.SOLD && (
                <>
                  <PriceChip label="Sprzedaż" value={phone.sellPrice} color={colors.success} />
                  <PriceChip
                    label="Zysk"
                    value={profit}
                    color={profit >= 0 ? colors.success : colors.danger}
                    bold
                  />
                </>
              )}
            </>
          )}
          <Text style={styles.cardDate}>{formatDateShort(phone.boughtAt)}</Text>
        </View>

        {/* Ostrzeżenia o blokadach */}
        {(phone.hasIcloudLock || phone.hasCarrierLock || phone.isReported) && (
          <View style={styles.lockRow}>
            {phone.hasIcloudLock  && <Text style={styles.lockTag}>🔒 iCloud</Text>}
            {phone.hasCarrierLock && <Text style={styles.lockTag}>📡 Simlock</Text>}
            {phone.isReported     && <Text style={[styles.lockTag, { backgroundColor: colors.danger + '20', color: colors.danger }]}>⚠️ Zastrzeżony</Text>}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
};

const PriceChip = ({ label, value, color, bold }) => (
  <View style={priceStyles.wrap}>
    <Text style={priceStyles.label}>{label}</Text>
    <Text style={[priceStyles.value, { color }, bold && { fontWeight: '800' }]}>
      {value} zł
    </Text>
  </View>
);

const SummaryChip = ({ label, value, color }) => (
  <View style={[sumStyles.chip, { borderTopColor: color }]}>
    <Text style={[sumStyles.value, { color }]}>{value}</Text>
    <Text style={sumStyles.label}>{label}</Text>
  </View>
);

const priceStyles = StyleSheet.create({
  wrap:  { marginRight: 12 },
  label: { fontSize: 10, color: colors.textSecondary },
  value: { fontSize: 13, fontWeight: '600' },
});

const sumStyles = StyleSheet.create({
  chip:  { flex: 1, backgroundColor: colors.surface, borderRadius: 8, borderTopWidth: 3, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  summary:     { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: colors.textPrimary },
  filterRow:   { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive:  { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:    { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  list:        { paddingBottom: 100 },
  card:        { marginHorizontal: 16, marginVertical: 5 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft:    { flex: 1, marginRight: 10 },
  deviceName:  { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  deviceSub:   { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  imei:        { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  statusText:  { fontSize: 11, fontWeight: '600' },
  cardBottom:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardDate:    { marginLeft: 'auto', fontSize: 12, color: colors.textSecondary },
  lockRow:     { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  lockTag:     { fontSize: 11, fontWeight: '600', backgroundColor: colors.warning + '20', color: colors.warning, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  empty:       { alignItems: 'center', paddingTop: 80 },
  emptyIcon:   { fontSize: 48, marginBottom: 12 },
  emptyText:   { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
  emptySub:    { fontSize: 13, color: colors.textSecondary, marginTop: 6 },
});

export default TradeHomeScreen;
