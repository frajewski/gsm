// ============================================================
//  BookingDetailScreen.jsx – szczegóły wniosku
//  Admin: akceptuje / proponuje inny termin / podaje cenę / odrzuca
//  Klient: widzi status i odpowiedź admina
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import useStore    from '../store/useStore';
import Button      from '../components/Button';
import Card        from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { ROLES }   from '../constants/roles';
import { BOOKING_STATUS, BOOKING_STATUS_COLORS, BOOKING_STATUS_ICONS } from '../constants/bookingStatuses';
import { formatDate, formatDateShort } from '../utils/formatDate';

const DAY_NAMES   = ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'];
const MONTH_NAMES = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];

// Mini kalendarz do propozycji nowego terminu
const generateDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 21; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0) days.push(d);
  }
  return days;
};

const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const getBookingById       = useStore((s) => s.getBookingById);
  const getUserById          = useStore((s) => s.getUserById);
  const getWorkers           = useStore((s) => s.getWorkers);
  const updateBooking        = useStore((s) => s.updateBooking);
  const convertBookingToRepair = useStore((s) => s.convertBookingToRepair);
  const currentUser          = useStore((s) => s.currentUser);

  const booking  = getBookingById(bookingId);
  const customer = booking ? getUserById(booking.customerId) : null;
  const workers  = getWorkers();
  const isAdmin  = [ROLES.ADMIN, ROLES.WORKER].includes(currentUser?.role);

  const [adminNote,       setAdminNote]       = useState(booking?.adminNote      || '');
  const [estimatedPrice,  setEstimatedPrice]  = useState(String(booking?.estimatedPrice || ''));
  const [proposedDate,    setProposedDate]    = useState(null);
  const [assignedWorker,  setAssignedWorker]  = useState(booking?.assignedWorkerId || '');
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [showDatePicker,   setShowDatePicker]   = useState(false);
  const [action,           setAction]           = useState(null); // 'accept'|'reschedule'|'reject'

  if (!booking) return (
    <View style={styles.centered}><Text style={styles.error}>Nie znaleziono terminu.</Text></View>
  );

  const statusColor = BOOKING_STATUS_COLORS[booking.status] || colors.textSecondary;
  const statusIcon  = BOOKING_STATUS_ICONS[booking.status]  || '•';
  const days        = generateDays();
  const assignedWorkerName = workers.find(w => w.id === assignedWorker)?.name || 'Nieprzypisany';

  // ADMIN: akceptuje termin klienta
  const handleAccept = () => {
    if (!adminNote.trim()) { Alert.alert('Błąd', 'Dodaj krótką informację dla klienta.'); return; }
    updateBooking(bookingId, {
      status: BOOKING_STATUS.ACCEPTED,
      adminNote: adminNote.trim(),
      estimatedPrice: parseFloat(estimatedPrice) || 0,
      assignedWorkerId: assignedWorker || null,
    });
    Alert.alert('✅ Zaakceptowano', 'Klient zostanie powiadomiony.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  // ADMIN: proponuje inny termin
  const handleReschedule = () => {
    if (!proposedDate) { Alert.alert('Błąd', 'Wybierz nowy proponowany termin.'); return; }
    if (!adminNote.trim()) { Alert.alert('Błąd', 'Dodaj wyjaśnienie dla klienta.'); return; }
    updateBooking(bookingId, {
      status: BOOKING_STATUS.RESCHEDULED,
      adminNote: adminNote.trim(),
      proposedDate: proposedDate.toISOString(),
      estimatedPrice: parseFloat(estimatedPrice) || 0,
      assignedWorkerId: assignedWorker || null,
    });
    Alert.alert('📅 Wysłano propozycję', 'Klient zobaczy nowy termin.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  // ADMIN: odrzuca wniosek
  const handleReject = () => {
    if (!adminNote.trim()) { Alert.alert('Błąd', 'Podaj powód odrzucenia.'); return; }
    Alert.alert('Odwołanie terminu', 'Na pewno odwołać ten termin?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Odrzuć',
        style: 'destructive',
        onPress: () => {
          updateBooking(bookingId, { status: BOOKING_STATUS.REJECTED, adminNote: adminNote.trim() });
          navigation.goBack();
        },
      },
    ]);
  };

  // ADMIN: konwertuje zaakceptowany wniosek → zlecenie naprawy
  const handleConvert = () => {
    Alert.alert('Utwórz zlecenie', 'Przekształcić ten termin w zlecenie naprawy?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Utwórz',
        onPress: async () => {
          try {
            const repair = await convertBookingToRepair(bookingId);
            Alert.alert('🔧 Zlecenie utworzone!', `Nr zlecenia: #${repair.displayNumber || repair.id}`, [
              { text: 'Przejdź do zlecenia', onPress: () => navigation.replace('RepairDetails', { repairId: repair.id }) },
            ]);
          } catch (error) {
            Alert.alert('Błąd', 'Nie udało się utworzyć zlecenia: ' + error.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* STATUS */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.deviceName}>{booking.brand} {booking.model}</Text>
            {customer && <Text style={styles.customerName}>👤 {customer.name} · {customer.phone}</Text>}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusIcon]}>{statusIcon}</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>{booking.status}</Text>
          </View>
        </View>
        <Text style={styles.createdAt}>Złożono: {formatDate(booking.createdAt)}</Text>
      </Card>

      {/* SZCZEGÓŁY WNIOSKU */}
      <Card>
        <Text style={styles.sectionTitle}>Szczegóły terminu</Text>
        <Row label="Opis usterki"       value={booking.description} wrap />
        <Row label="Preferowany termin" value={formatDateShort(booking.preferredDate)} />
        {booking.proposedDate && (
          <Row label="Proponowany termin" value={formatDateShort(booking.proposedDate)} highlight />
        )}
        {booking.estimatedPrice > 0 && (
          <Row label="Wycena serwisu" value={`${booking.estimatedPrice} zł`} bold />
        )}
        {booking.adminNote && (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>💬 Odpowiedź serwisu:</Text>
            <Text style={styles.noteText}>{booking.adminNote}</Text>
          </View>
        )}
        {booking.linkedRepairId && (
          <Button
            label={`🔧 Przejdź do zlecenia #${booking.linkedRepairId}`}
            variant="ghost"
            onPress={() => navigation.navigate('RepairDetails', { repairId: booking.linkedRepairId })}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* PANEL ADMINA */}
      {isAdmin && booking.status === BOOKING_STATUS.PENDING && (
        <Card>
          <Text style={styles.sectionTitle}>Odpowiedź serwisu</Text>

          {/* Cena */}
          <Text style={styles.label}>Wycena (zł)</Text>
          <TextInput style={styles.input} value={estimatedPrice} onChangeText={setEstimatedPrice}
            placeholder="np. 150" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />

          {/* Wiadomość dla klienta */}
          <Text style={styles.label}>Wiadomość dla klienta *</Text>
          <TextInput style={[styles.input, styles.textarea]} value={adminNote} onChangeText={setAdminNote}
            placeholder="np. Termin potwierdzony, wymiana baterii zajmie ok. 30 minut." 
            placeholderTextColor={colors.textSecondary} multiline numberOfLines={3} textAlignVertical="top" />

          {/* Przypisz pracownika */}
          <Text style={styles.label}>Przypisz pracownika</Text>
          <TouchableOpacity style={styles.pickerRow} onPress={() => setShowWorkerPicker(!showWorkerPicker)}>
            <Text style={styles.pickerText}>🔧 {assignedWorkerName}</Text>
            <Text style={styles.chevron}>{showWorkerPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showWorkerPicker && (
            <View style={styles.dropdown}>
              <TouchableOpacity style={styles.dropItem} onPress={() => { setAssignedWorker(''); setShowWorkerPicker(false); }}>
                <Text style={styles.dropText}>— Bez przypisania</Text>
              </TouchableOpacity>
              {workers.map(w => (
                <TouchableOpacity key={w.id} style={styles.dropItem}
                  onPress={() => { setAssignedWorker(w.id); setShowWorkerPicker(false); }}>
                  <Text style={styles.dropText}>{w.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* PRZYCISKI AKCJI */}
          <View style={styles.actionRow}>
            <Button label="✅ Akceptuj termin" variant="success"
              onPress={handleAccept} style={styles.actionBtn} />
            <Button label="📅 Inny termin" variant="ghost"
              onPress={() => setShowDatePicker(!showDatePicker)} style={styles.actionBtn} />
          </View>

          {/* Mini kalendarz do wyboru nowego terminu */}
          {showDatePicker && (
            <View style={styles.calendarWrap}>
              <Text style={styles.calendarHint}>Wybierz nowy termin:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {days.map((day, i) => {
                  const isSel = proposedDate?.toDateString() === day.toDateString();
                  return (
                    <TouchableOpacity key={i}
                      style={[styles.dayBox, isSel && styles.dayBoxSelected]}
                      onPress={() => setProposedDate(day)}>
                      <Text style={[styles.dayName, isSel && styles.dayTextSel]}>{DAY_NAMES[day.getDay()]}</Text>
                      <Text style={[styles.dayNum,  isSel && styles.dayTextSel]}>{day.getDate()}</Text>
                      <Text style={[styles.dayMon,  isSel && styles.dayTextSel]}>{MONTH_NAMES[day.getMonth()]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {proposedDate && (
                <Button label="📅 Wyślij propozycję nowego terminu"
                  onPress={handleReschedule} style={{ marginTop: 12 }} />
              )}
            </View>
          )}

          <Button label="❌ Odwołaj termin" variant="danger"
            onPress={handleReject} style={{ marginTop: 8 }} />
        </Card>
      )}

      {/* Konwertuj → zlecenie (gdy zaakceptowany) */}
      {isAdmin && booking.status === BOOKING_STATUS.ACCEPTED && !booking.linkedRepairId && (
        <Card>
          <Text style={styles.sectionTitle}>Kolejny krok</Text>
          <Button label="🔧 Utwórz zlecenie naprawy" onPress={handleConvert} />
        </Card>
      )}

    </ScrollView>
  );
};

const Row = ({ label, value, wrap, bold, highlight }) => (
  <View style={[rowS.row, highlight && rowS.highlight]}>
    <Text style={rowS.label}>{label}</Text>
    <Text style={[rowS.value, bold && rowS.bold, wrap && rowS.wrap]} numberOfLines={wrap ? 4 : 1}>
      {value || '—'}
    </Text>
  </View>
);

const rowS = StyleSheet.create({
  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  highlight: { backgroundColor: colors.accent + '10', marginHorizontal: -4, paddingHorizontal: 4, borderRadius: 6 },
  label:     { fontSize: 13, color: colors.textSecondary, flex: 1 },
  value:     { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },
  bold:      { fontWeight: '800', color: colors.primary, fontSize: 15 },
  wrap:      { textAlign: 'left', flex: 2 },
});

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 16, paddingBottom: 40 },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error:          { color: colors.danger, fontSize: 16 },
  headerCard:     {},
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft:     { flex: 1, marginRight: 12 },
  deviceName:     { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  customerName:   { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  statusBadge:    { alignItems: 'center', padding: 10, borderRadius: 12, minWidth: 80 },
  statusIcon:     { fontSize: 22 },
  statusText:     { fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  createdAt:      { fontSize: 12, color: colors.textSecondary, marginTop: 10 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  noteBox:        { marginTop: 10, padding: 12, backgroundColor: colors.accent + '12', borderRadius: 8 },
  noteLabel:      { fontSize: 12, fontWeight: '700', color: colors.accent, marginBottom: 4 },
  noteText:       { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
  label:          { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input:          { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.textPrimary },
  textarea:       { height: 80 },
  pickerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, marginTop: 4 },
  pickerText:     { fontSize: 14, color: colors.textPrimary },
  chevron:        { fontSize: 12, color: colors.textSecondary },
  dropdown:       { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginTop: 4 },
  dropItem:       { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  dropText:       { fontSize: 14, color: colors.textPrimary },
  actionRow:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn:      { flex: 1 },
  calendarWrap:   { marginTop: 12, padding: 12, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  calendarHint:   { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  dayBox:         { alignItems: 'center', padding: 8, marginRight: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, minWidth: 48 },
  dayBoxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayName:        { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  dayNum:         { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginVertical: 2 },
  dayMon:         { fontSize: 10, color: colors.textSecondary },
  dayTextSel:     { color: '#fff' },
});

export default BookingDetailScreen;
