// ============================================================
//  TradeDetailScreen.jsx – szczegóły telefonu w skupie
//  Zmiana statusu, edycja ceny sprzedaży, blokady, powiązana naprawa
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Image,
} from 'react-native';
import useStore         from '../store/useStore';
import Button           from '../components/Button';
import Card             from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { TRADE_STATUS, tradeStatusColors, tradeStatusIcons, tradeStatusList } from '../constants/tradeStatuses';
import { gradeColors, gradeEmojis } from '../constants/grades';
import tradeSources     from '../constants/tradeSources';
import { formatDate, formatDateShort } from '../utils/formatDate';
import { calcPhoneProfit } from '../utils/calcTrade';

const TradeDetailScreen = ({ route, navigation }) => {
  const { phoneId } = route.params;
  const getPhoneById  = useStore((s) => s.getPhoneById);
  const getRepairById = useStore((s) => s.getRepairById);
  const updatePhone   = useStore((s) => s.updatePhone);
  const deletePhone   = useStore((s) => s.deletePhone);
  const currentUser   = useStore((s) => s.currentUser);
  // Tylko admin widzi cenę sprzedaży i zysk – pracownik tylko obsługuje skup/wydanie,
  // marża to wiedza wyłącznie admina, identycznie jak w module naprawy.
  const isAdmin = currentUser?.role === 'admin';

  const phone  = getPhoneById(phoneId);
  const repair = phone?.linkedRepairId ? getRepairById(phone.linkedRepairId) : null;

  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [editSellPrice,    setEditSellPrice]    = useState(false);
  const [newSellPrice,     setNewSellPrice]     = useState(String(phone?.sellPrice || ''));

  if (!phone) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Nie znaleziono telefonu.</Text>
      </View>
    );
  }

  const profit      = calcPhoneProfit(phone);
  const statusColor = tradeStatusColors[phone.status] || colors.textSecondary;
  const gradeColor  = gradeColors[phone.grade]  || colors.textSecondary;
  const gradeEmoji  = gradeEmojis[phone.grade]  || '•';
  const sourceLabel = tradeSources.find(s => s.value === phone.source)?.label || phone.source;

  const handleStatusChange = (newStatus) => {
    Alert.alert('Zmień status', `Zmienić na: „${newStatus}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Zmień', onPress: () => { updatePhone(phoneId, { status: newStatus }); setShowStatusPicker(false); } },
    ]);
  };

  const handleSaveSellPrice = () => {
    const val = parseFloat(newSellPrice) || 0;
    updatePhone(phoneId, { sellPrice: val });
    setEditSellPrice(false);
  };

  const handleDelete = () => {
    Alert.alert('Usuń telefon', 'Na pewno usunąć ten telefon z bazy skupu?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => { deletePhone(phoneId); navigation.goBack(); } },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* NAGŁÓWEK */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.deviceName}>{phone.brand} {phone.model}</Text>
            <Text style={styles.deviceSub}>
              <Text style={{ color: gradeColor }}>{gradeEmoji} Grade {phone.grade}</Text>
              {'  '}{phone.color}
              {phone.storage ? `  •  ${phone.storage}` : ''}
            </Text>
            {phone.imei && <Text style={styles.imei}>IMEI: {phone.imei}</Text>}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {tradeStatusIcons[phone.status]}{'\n'}{phone.status}
            </Text>
          </View>
        </View>
        <Text style={styles.dateLine}>Skupiono: {formatDate(phone.boughtAt)}</Text>
        {phone.soldAt && <Text style={styles.dateLine}>Sprzedano: {formatDate(phone.soldAt)}</Text>}
      </Card>

      {/* CENY I ZYSK */}
      <Card>
        <Text style={styles.sectionTitle}>Finanse</Text>
        <Row label="Cena zakupu" value={`${phone.buyPrice} zł`} />

        {/* Cena sprzedaży i zysk – TYLKO admin. Pracownik widzi tylko prosty status. */}
        {isAdmin ? (
          phone.status === TRADE_STATUS.SOLD ? (
            <>
              <View style={styles.sellRow}>
                <Text style={styles.rowLabel}>Cena sprzedaży</Text>
                {editSellPrice ? (
                  <View style={styles.sellEdit}>
                    <TextInput style={styles.sellInput} value={newSellPrice}
                      onChangeText={setNewSellPrice} keyboardType="decimal-pad" autoFocus />
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSellPrice}>
                      <Text style={styles.saveBtnText}>✓</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setEditSellPrice(true)} style={styles.sellValueRow}>
                    <Text style={styles.rowValue}>
                      {phone.sellPrice > 0 ? `${phone.sellPrice} zł` : 'Wpisz cenę'}
                    </Text>
                    <Text style={styles.editIcon}>  ✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.profitBox}>
                <Text style={styles.profitLabel}>Zysk netto</Text>
                <Text style={[styles.profitValue, { color: profit >= 0 ? colors.success : colors.danger }]}>
                  {profit >= 0 ? '+' : ''}{profit} zł
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.sellHint}>
              <Text style={styles.sellHintText}>
                💡 Cena sprzedaży pojawi się po zmianie statusu na „Sprzedany"
              </Text>
            </View>
          )
        ) : (
          phone.status === TRADE_STATUS.SOLD && (
            <View style={styles.sellHint}>
              <Text style={styles.sellHintText}>✅ Telefon sprzedany</Text>
            </View>
          )
        )}
      </Card>

      {/* SZCZEGÓŁY */}
      <Card>
        <Text style={styles.sectionTitle}>Szczegóły</Text>
        {phone.storage   && <Row label="Pamięć"        value={phone.storage} />}
        <Row label="Źródło"   value={sourceLabel} />
        {phone.sourceNote && <Row label="Notatka źródła" value={phone.sourceNote} />}
        {phone.notes      && <Row label="Notatki"        value={phone.notes} />}
        {/* Umowa zakupu – dokumentacja prawna, widoczna tylko dla admina (jak resztę
            finansów w tym module), nie ma potrzeby pokazywać tego pracownikowi */}
        {isAdmin && phone.agreementPhoto && (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.rowLabel}>📄 Umowa zakupu</Text>
            <Image source={{ uri: phone.agreementPhoto }} style={styles.agreementPhoto} />
          </View>
        )}
      </Card>

      {/* BLOKADY */}
      {(phone.hasIcloudLock || phone.hasCarrierLock || phone.isReported) ? (
        <Card>
          <Text style={styles.sectionTitle}>⚠️ Blokady</Text>
          {phone.hasIcloudLock  && <LockRow icon="🔒" label="Blokada iCloud (Find My)" />}
          {phone.hasCarrierLock && <LockRow icon="📡" label="Simlock operatora" />}
          {phone.isReported     && <LockRow icon="🚨" label="Telefon zastrzeżony / zgłoszony jako kradziony" danger />}
          {phone.lockNotes && (
            <View style={styles.lockNotes}>
              <Text style={styles.lockNotesText}>{phone.lockNotes}</Text>
            </View>
          )}
        </Card>
      ) : (
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.success }]}>✅ Brak blokad</Text>
        </Card>
      )}

      {/* POWIĄZANA NAPRAWA */}
      {repair && (
        <Card>
          <Text style={styles.sectionTitle}>🔧 Powiązana naprawa</Text>
          <Row label="Urządzenie" value={`${repair.brand} ${repair.model}`} />
          <Row label="Status"     value={repair.status} />
          <Row label="Nr zlecenia" value={`#${repair.displayNumber || repair.id}`} />
          <Button
            label="Przejdź do zlecenia"
            variant="ghost"
            onPress={() => navigation.navigate('RepairDetails', { repairId: repair.id })}
            style={{ marginTop: 8 }}
          />
        </Card>
      )}

      {/* ZMIANA STATUSU */}
      <Card>
        <Text style={styles.sectionTitle}>Zmień status</Text>
        <Button
          label={showStatusPicker ? '▲ Zamknij' : '🔄 Zmień status telefonu'}
          variant="ghost"
          onPress={() => setShowStatusPicker(!showStatusPicker)}
        />
        {showStatusPicker && (
          <View style={styles.statusList}>
            {tradeStatusList.filter(s => s !== phone.status).map(s => (
              <TouchableOpacity key={s} style={styles.statusItem} onPress={() => handleStatusChange(s)}>
                <Text style={[styles.statusItemText, { color: tradeStatusColors[s] }]}>
                  {tradeStatusIcons[s]} {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>

      {/* USUŃ */}
      <Button label="🗑️ Usuń telefon z bazy" variant="danger" onPress={handleDelete} style={{ marginTop: 8, marginBottom: 32 }} />
    </ScrollView>
  );
};

const Row = ({ label, value }) => (
  <View style={rowS.row}>
    <Text style={rowS.label}>{label}</Text>
    <Text style={rowS.value}>{value}</Text>
  </View>
);

const LockRow = ({ icon, label, danger = false }) => (
  <View style={lockS.row}>
    <Text style={lockS.icon}>{icon}</Text>
    <Text style={[lockS.label, danger && { color: colors.danger }]}>{label}</Text>
  </View>
);

const rowS = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { fontSize: 14, color: colors.textSecondary },
  value: { fontSize: 14, color: colors.textPrimary, fontWeight: '500', maxWidth: '55%', textAlign: 'right' },
});

const lockS = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  icon:  { fontSize: 16 },
  label: { fontSize: 14, color: colors.warning, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 16, paddingBottom: 40 },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error:        { color: colors.danger, fontSize: 16 },
  headerCard:   {},
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft:   { flex: 1, marginRight: 12 },
  deviceName:   { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  deviceSub:    { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  imei:         { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  statusText:   { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  dateLine:     { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  sellRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel:     { fontSize: 14, color: colors.textSecondary },
  sellValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue:     { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  agreementPhoto: { width: 200, height: 200, borderRadius: 10, marginTop: 6 },
  editIcon:     { fontSize: 14 },
  sellEdit:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sellInput:    { borderWidth: 1, borderColor: colors.accent, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, fontSize: 15, color: colors.textPrimary, minWidth: 80 },
  saveBtn:      { backgroundColor: colors.success, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  profitBox:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: colors.primary },
  profitLabel:  { fontSize: 16, fontWeight: '700', color: colors.primary },
  profitValue:  { fontSize: 22, fontWeight: '800' },
  lockNotes:    { marginTop: 8, padding: 10, backgroundColor: colors.warning + '15', borderRadius: 8 },
  lockNotesText:{ fontSize: 13, color: colors.textPrimary },
  statusList:   { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  statusItem:   { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.divider },
  statusItemText:{ fontSize: 15, fontWeight: '600' },
});

export default TradeDetailScreen;
