// ============================================================
//  HomeScreen.jsx – główny ekran: lista zleceń + FAB
//  Serwisant widzi wszystkie, klient – tylko swoje.
//  Filtry (status + zakres dat) schowane w dolnym panelu (bottom sheet),
//  nad listą widać tylko wyszukiwarkę + mały przycisk "Filtry" z licznikiem.
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View, FlatList, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, Pressable,
} from 'react-native';
import useStore        from '../store/useStore';
import RepairListItem  from '../components/RepairListItem';
import FAB             from '../components/FAB';
import { statusList }  from '../constants/statuses';
import { useColors }   from '../constants/ThemeContext';

const DATE_RANGES = [
  { label: 'Wszystkie', value: 'all' },
  { label: 'Ostatnie 7 dni', value: '7d'  },
  { label: 'Ostatni miesiąc', value: '30d' },
];

const isInRange = (dateStr, range) => {
  if (range === 'all') return true;
  const days = range === '7d' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(dateStr) >= cutoff;
};

const HomeScreen = ({ navigation }) => {
  const colors = useColors();
  const s      = makeStyles(colors);

  const currentUser       = useStore((state) => state.currentUser);
  const getVisibleRepairs = useStore((state) => state.getVisibleRepairs);
  const getUserById       = useStore((state) => state.getUserById);

  const isTech = ['admin', 'worker'].includes(currentUser?.role);

  const [search,        setSearch]        = useState('');
  const [status,        setStatus]        = useState(null);
  const [dateRange,     setDateRange]     = useState('all');
  const [showFilters,   setShowFilters]   = useState(false);

  // Stan tymczasowy w panelu – zatwierdzany dopiero po "Zastosuj",
  // żeby lista nie "skakała" przy każdym dotknięciu wewnątrz panelu
  const [draftStatus,    setDraftStatus]    = useState(null);
  const [draftDateRange, setDraftDateRange] = useState('all');

  const allRepairs = getVisibleRepairs();

  const sorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...allRepairs]
      .filter((r) => {
        const matchSearch = !q
          || r.brand?.toLowerCase().includes(q)
          || r.model?.toLowerCase().includes(q)
          || r.imei?.includes(q)
          || r.description?.toLowerCase().includes(q)
          || (r.displayNumber || '').includes(q)
          || getUserById(r.customerId)?.name?.toLowerCase().includes(q);
        const matchStatus = !status || r.status === status;
        const matchDate   = isInRange(r.createdAt, dateRange);
        return matchSearch && matchStatus && matchDate;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allRepairs, search, status, dateRange]);

  const activeFilterCount = (status ? 1 : 0) + (dateRange !== 'all' ? 1 : 0);
  const hasFilters = search || activeFilterCount > 0;

  const openFilters = () => {
    setDraftStatus(status);
    setDraftDateRange(dateRange);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setStatus(draftStatus);
    setDateRange(draftDateRange);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraftStatus(null);
    setDraftDateRange('all');
  };

  return (
    <View style={s.container}>

      {/* Pasek wyszukiwania + przycisk filtrów */}
      <View style={s.topRow}>
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Szukaj: marka, model, IMEI, klient…"
            placeholderTextColor={colors.textSecondary}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
              <Text style={s.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
          onPress={openFilters}
          activeOpacity={0.75}
        >
          <Text style={s.filterBtnIcon}>⚙️</Text>
          {activeFilterCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Licznik wyników + reset, widoczny tylko gdy są aktywne filtry */}
      {hasFilters && (
        <View style={s.countRow}>
          <Text style={s.countText}>
            {sorted.length} {sorted.length === 1 ? 'zlecenie' : sorted.length < 5 ? 'zlecenia' : 'zleceń'}
          </Text>
          <TouchableOpacity onPress={() => { setSearch(''); setStatus(null); setDateRange('all'); }}>
            <Text style={s.resetText}>✕ Wyczyść wszystkie filtry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista napraw */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>{hasFilters ? '🔎' : '📋'}</Text>
            <Text style={s.emptyTitle}>
              {hasFilters ? 'Brak wyników' : 'Brak zleceń'}
            </Text>
            <Text style={s.emptySub}>
              {hasFilters
                ? 'Spróbuj innego zapytania lub wyczyść filtry'
                : isTech ? 'Naciśnij „+" aby dodać pierwsze zlecenie' : 'Twoje zlecenia pojawią się tutaj'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RepairListItem
            repair={item}
            customerName={isTech ? getUserById(item.customerId)?.name : null}
            onPress={() => navigation.navigate('RepairDetails', { repairId: item.id })}
          />
        )}
      />

      {isTech && <FAB onPress={() => navigation.navigate('AddRepair')} />}

      {/* ===== PANEL FILTRÓW (bottom sheet) ===== */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setShowFilters(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Filtry</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={s.sheetClear}>Wyczyść</Text>
            </TouchableOpacity>
          </View>

          {/* Zakres dat */}
          <Text style={s.sheetLabel}>Okres</Text>
          <View style={s.optionsGrid}>
            {DATE_RANGES.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[s.option, draftDateRange === d.value && s.optionActive]}
                onPress={() => setDraftDateRange(d.value)}
                activeOpacity={0.75}
              >
                <Text style={[s.optionText, draftDateRange === d.value && s.optionTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status */}
          <Text style={s.sheetLabel}>Status zlecenia</Text>
          <View style={s.optionsGrid}>
            <TouchableOpacity
              style={[s.option, draftStatus === null && s.optionActive]}
              onPress={() => setDraftStatus(null)}
              activeOpacity={0.75}
            >
              <Text style={[s.optionText, draftStatus === null && s.optionTextActive]}>
                Wszystkie
              </Text>
            </TouchableOpacity>
            {statusList.map((st) => (
              <TouchableOpacity
                key={st}
                style={[s.option, draftStatus === st && s.optionActive]}
                onPress={() => setDraftStatus(st)}
                activeOpacity={0.75}
              >
                <Text style={[s.optionText, draftStatus === st && s.optionTextActive]} numberOfLines={1}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.applyBtn} onPress={applyFilters} activeOpacity={0.85}>
            <Text style={s.applyBtnText}>Zastosuj filtry</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },

  // Górny wiersz: wyszukiwarka + przycisk filtrów
  topRow:     { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 6, gap: 10 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput:{ flex: 1, height: 46, fontSize: 15, color: colors.textPrimary },
  clearBtn:   { padding: 6 },
  clearBtnText:{ fontSize: 14, color: colors.textSecondary },

  filterBtn:       { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  filterBtnActive: { backgroundColor: colors.accent + '18', borderWidth: 1.5, borderColor: colors.accent },
  filterBtnIcon:   { fontSize: 18 },
  filterBadge:     { position: 'absolute', top: -4, right: -4, backgroundColor: colors.accent, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Licznik aktywnych filtrów
  countRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  countText:  { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  resetText:  { fontSize: 13, color: colors.accent, fontWeight: '600' },

  // Lista
  list:       { paddingBottom: 100 },

  // Pusty stan
  empty:      { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // ===== Bottom sheet =====
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:         { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32, maxHeight: '75%' },
  sheetHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:    { fontSize: 19, fontWeight: '800', color: colors.textPrimary },
  sheetClear:    { fontSize: 14, color: colors.danger, fontWeight: '600' },
  sheetLabel:    { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 10 },
  optionsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option:        { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
  optionActive:  { backgroundColor: colors.accent, borderColor: colors.accent },
  optionText:    { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  applyBtn:      { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  applyBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default HomeScreen;
