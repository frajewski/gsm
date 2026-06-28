// ============================================================
//  BookingListScreen.jsx – lista wniosków
//  Admin/pracownik: widzi wszystkie | Klient: widzi swoje
// ============================================================

import React, { useState } from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useStore     from '../store/useStore';
import Card         from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import FAB          from '../components/FAB';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { ROLES }    from '../constants/roles';
import { BOOKING_STATUS, BOOKING_STATUS_COLORS, BOOKING_STATUS_ICONS } from '../constants/bookingStatuses';
import { formatDateShort } from '../utils/formatDate';

const BookingListScreen = ({ navigation }) => {
  const currentUser       = useStore((s) => s.currentUser);
  const getVisibleBookings = useStore((s) => s.getVisibleBookings);
  const getUserById       = useStore((s) => s.getUserById);
  const isStaff = [ROLES.ADMIN, ROLES.WORKER].includes(currentUser?.role);

  const [filter, setFilter] = useState(null);

  const bookings = getVisibleBookings();
  const filtered = filter ? bookings.filter(b => b.status === filter) : bookings;
  const sorted   = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const pendingCount = bookings.filter(b => b.status === BOOKING_STATUS.PENDING).length;

  const FILTERS = [
    { label: 'Wszystkie', value: null },
    { label: '⏳ Oczekuje', value: BOOKING_STATUS.PENDING },
    { label: '✅ Przyjęte',  value: BOOKING_STATUS.ACCEPTED },
    { label: '📅 Nowy termin', value: BOOKING_STATUS.RESCHEDULED },
    { label: '❌ Odrzucone', value: BOOKING_STATUS.REJECTED },
  ];

  return (
    <View style={styles.container}>
      {/* Filtry */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(i) => String(i.value)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, filter === item.value && styles.chipActive]}
            onPress={() => setFilter(item.value)}
          >
            <Text style={[styles.chipText, filter === item.value && styles.chipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <SectionHeader
        title={isStaff ? 'Umówione naprawy' : 'Moje terminy'}
        count={sorted.length}
      />

      <FlatList
        data={sorted}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>
              {isStaff ? 'Brak umówionych napraw' : 'Nie masz jeszcze żadnego umówionego terminu'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const customer = isStaff ? getUserById(item.customerId) : null;
          const statusColor = BOOKING_STATUS_COLORS[item.status] || colors.textSecondary;
          const statusIcon  = BOOKING_STATUS_ICONS[item.status]  || '•';
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
            >
              <Card style={styles.card} padding={14}>
                {/* Górny wiersz */}
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.deviceName}>{item.brand} {item.model}</Text>
                    {customer && <Text style={styles.customerName}>👤 {customer.name}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusIcon} {item.status}
                    </Text>
                  </View>
                </View>

                {/* Opis */}
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>

                {/* Dolny wiersz */}
                <View style={styles.cardBottom}>
                  <Text style={styles.dateLabel}>
                    📅 Preferowany: <Text style={styles.dateValue}>{formatDateShort(item.preferredDate)}</Text>
                  </Text>
                  {item.estimatedPrice > 0 && (
                    <Text style={styles.price}>{item.estimatedPrice} zł</Text>
                  )}
                </View>

                {/* Odpowiedź admina */}
                {item.adminNote && (
                  <View style={styles.adminNote}>
                    <Text style={styles.adminNoteText}>💬 {item.adminNote}</Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB tylko dla klienta – składa nowy wniosek */}
      {!isStaff && (
        <FAB onPress={() => navigation.navigate('BookingRequest')} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  filterRow:      { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:       { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  list:           { paddingBottom: 100 },
  card:           { marginHorizontal: 16, marginVertical: 5 },
  cardTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft:       { flex: 1, marginRight: 10 },
  deviceName:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  customerName:   { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText:     { fontSize: 11, fontWeight: '700' },
  desc:           { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  cardBottom:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel:      { fontSize: 12, color: colors.textSecondary },
  dateValue:      { fontWeight: '600', color: colors.textPrimary },
  price:          { fontSize: 13, fontWeight: '700', color: colors.primary },
  adminNote:      { marginTop: 8, padding: 8, backgroundColor: colors.accent + '12', borderRadius: 6 },
  adminNoteText:  { fontSize: 12, color: colors.accent, fontWeight: '500' },
  empty:          { alignItems: 'center', paddingTop: 80 },
  emptyIcon:      { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 15, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },
});

export default BookingListScreen;
