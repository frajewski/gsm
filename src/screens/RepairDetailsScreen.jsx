// ============================================================
//  RepairDetailsScreen.jsx – szczegóły zlecenia
//  Serwisant: może zmieniać status, wysyłać SMS
//  Klient: podgląd + przejście do EstimateScreen
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import useStore        from '../store/useStore';
import Button          from '../components/Button';
import Card            from '../components/Card';
import StatusBadge     from '../components/StatusBadge';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import STATUS, { statusList, terminalStatuses } from '../constants/statuses';
import { warrantyPeriods, calcWarrantyEndDate } from '../constants/warrantyPeriods';
import { formatDate }  from '../utils/formatDate';
import { smsTemplates, smsSend_Custom } from '../services/smsService';

const RepairDetailsScreen = ({ route, navigation }) => {
  const { repairId } = route.params;

  const getRepairById = useStore((state) => state.getRepairById);
  const getUserById   = useStore((state) => state.getUserById);
  const updateRepair  = useStore((state) => state.updateRepair);
  const currentUser   = useStore((state) => state.currentUser);

  const repair   = getRepairById(repairId);
  const customer = repair ? getUserById(repair.customerId) : null;
  const isTech   = ['admin', 'worker'].includes(currentUser?.role);
  // Tylko admin widzi rozbicie ceny na części/usługę (marża). Pracownik – jak klient –
  // widzi tylko sumę, bo jego zadanie to przyjmowanie/wydawanie urządzeń, nie rozliczenia.
  const isAdmin  = currentUser?.role === 'admin';

  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showSMSPicker,    setShowSMSPicker]    = useState(false);

  // Stan formularza gwarancji – pojawia się tylko przy zmianie statusu na "Odebrane"
  const [showWarrantyForm,    setShowWarrantyForm]    = useState(false);
  const [selectedWarranty,    setSelectedWarranty]    = useState(warrantyPeriods[2]); // domyślnie 3 miesiące

  if (!repair) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Nie znaleziono zlecenia.</Text>
      </View>
    );
  }

  // Dodaj zdjęcia dokumentujące wynik naprawy (np. wymieniony ekran, naprawiony port)
  // Zapisujemy od razu do bazy (updateRepair), w przeciwieństwie do zdjęć przy przyjęciu,
  // które trzymane są lokalnie aż do zapisania całego nowego zlecenia.
  const pickRepairPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Brak dostępu', 'Zezwól na dostęp do galerii w ustawieniach.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      const updated = [...(repair.repairPhotos || []), ...uris].slice(0, 5);
      updateRepair(repairId, { repairPhotos: updated });
    }
  };

  // Usuń jedno zdjęcie po naprawie
  const removeRepairPhoto = (index) => {
    const updated = (repair.repairPhotos || []).filter((_, i) => i !== index);
    updateRepair(repairId, { repairPhotos: updated });
  };

  const isClosed = terminalStatuses.includes(repair.status);

  // Zmień status zlecenia.
  // Status "Odebrane" wymaga dodatkowo wyboru okresu gwarancji – pokazuje
  // osobny formularz zamiast prostego potwierdzenia.
  const handleStatusChange = (newStatus) => {
    if (newStatus === STATUS.DELIVERED) {
      setShowWarrantyForm(true);
      setShowStatusPicker(false);
      return;
    }
    Alert.alert(
      'Zmiana statusu',
      `Zmienić status na: „${newStatus}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zmień',
          onPress: () => {
            updateRepair(repairId, { status: newStatus });
            setShowStatusPicker(false);
          },
        },
      ]
    );
  };

  // Potwierdź wydanie urządzenia z wybraną gwarancją
  const handleConfirmDelivery = () => {
    const issuedAt = new Date().toISOString();
    updateRepair(repairId, {
      status: STATUS.DELIVERED,
      warrantyMonths: selectedWarranty.months,
      warrantyEndDate: calcWarrantyEndDate(issuedAt, selectedWarranty.months),
      issuedAt,
    });
    setShowWarrantyForm(false);
  };

  // Wyślij SMS z wybranym szablonem
  const handleSMS = (template) => {
    smsSend_Custom(customer?.phone, template.body);
    setShowSMSPicker(false);
  };

  const templates = smsTemplates(repair, customer?.name || 'Kliencie');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* --- NAGŁÓWEK ZLECENIA --- */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.deviceName}>{repair.brand} {repair.model}</Text>
            <Text style={styles.repairId}>#{repair.displayNumber || repair.id}</Text>
          </View>
          <StatusBadge status={repair.status} />
        </View>
        {repair.imei && <Text style={styles.imei}>IMEI: {repair.imei}</Text>}
        <Text style={styles.createdAt}>Przyjęto: {formatDate(repair.createdAt)}</Text>
        {repair.status === STATUS.DELIVERED && repair.warrantyMonths > 0 && (
          <View style={styles.warrantyBadge}>
            <Text style={styles.warrantyBadgeText}>
              🛡️ Gwarancja {repair.warrantyMonths} mies. — do {formatDate(repair.warrantyEndDate)}
            </Text>
          </View>
        )}
        {repair.status === STATUS.DELIVERED && repair.warrantyMonths === 0 && (
          <Text style={styles.noWarrantyText}>Wydano bez gwarancji</Text>
        )}
      </Card>

      {/* --- KLIENT (dla serwisanta) --- */}
      {isTech && customer && (
        <Card>
          <Text style={styles.sectionTitle}>Klient</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Imię i nazwisko</Text>
            <Text style={styles.rowValue}>{customer.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Telefon</Text>
            <Text style={styles.rowValue}>{customer.phone || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{customer.email}</Text>
          </View>
          {/* Przejście do karty klienta */}
          <Button
            label="📋 Karta klienta"
            variant="ghost"
            onPress={() => navigation.navigate('CustomerCard', { customerId: customer.id })}
            style={{ marginTop: 8 }}
          />
        </Card>
      )}

      {/* --- OPIS USTERKI --- */}
      <Card>
        <Text style={styles.sectionTitle}>Opis usterki</Text>
        <Text style={styles.description}>{repair.description}</Text>
      </Card>

      {/* --- KOSZTORYS --- */}
      <Card>
        <Text style={styles.sectionTitle}>Kosztorys</Text>
        {/* Rozbicie na części/usługę – TYLKO admin widzi marżę. Pracownik widzi sumę, tak jak klient. */}
        {isAdmin && (
          <>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Części</Text>
              <Text style={styles.rowValue}>{repair.partsCost} zł</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Usługa</Text>
              <Text style={styles.rowValue}>{repair.serviceCost} zł</Text>
            </View>
          </>
        )}
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Łącznie</Text>
          <Text style={styles.totalValue}>{repair.partsCost + repair.serviceCost} zł</Text>
        </View>
        {/* Dokument sprzedaży i NIP, jeśli wybrano fakturę */}
        {repair.documentType && (
          <View style={[styles.row, { marginTop: 4 }]}>
            <Text style={styles.rowLabel}>Dokument</Text>
            <Text style={styles.rowValue}>
              {repair.documentType === 'Faktura' ? '📄 Faktura' : '🧾 Paragon'}
            </Text>
          </View>
        )}
        {repair.documentType === 'Faktura' && repair.customerNip && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>NIP</Text>
            <Text style={styles.rowValue}>{repair.customerNip}</Text>
          </View>
        )}
        {/* Status akceptacji kosztorysu */}
        <Text style={[styles.estimateStatus, {
          color: repair.estimateAccepted === true ? colors.success
               : repair.estimateAccepted === false ? colors.danger
               : colors.warning,
        }]}>
          {repair.estimateAccepted === true  ? '✅ Kosztorys zaakceptowany'
         : repair.estimateAccepted === false ? '❌ Kosztorys odrzucony'
         :                                     '⏳ Oczekuje na decyzję klienta'}
        </Text>
        {/* Klient może przejść do EstimateScreen – sprawdzamy sumę obu pól, bo pracownik
            zapisuje całą cenę w serviceCost (partsCost zostaje 0 w jego modelu pracy) */}
        {!isTech && repair.estimateAccepted === null && (repair.partsCost + repair.serviceCost) > 0 && (
          <Button
            label="💰 Przejdź do kosztorysu"
            onPress={() => navigation.navigate('Estimate', { repairId })}
            style={{ marginTop: 10 }}
          />
        )}
        {/* Serwisant przechodzi do edycji kosztorysu */}
        {isTech && !isClosed && (
          <Button
            label="✏️ Edytuj kosztorys"
            variant="ghost"
            onPress={() => navigation.navigate('Estimate', { repairId })}
            style={{ marginTop: 10 }}
          />
        )}
      </Card>

      {/* --- GALERIA ZDJĘĆ --- */}
      {repair.photos?.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Zdjęcia ({repair.photos.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {repair.photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        </Card>
      )}

      {/* --- GALERIA ZDJĘĆ PO NAPRAWIE (widoczna tylko dla klienta – serwisant zarządza
          tymi zdjęciami wyżej, w karcie "Akcje serwisanta", więc nie duplikujemy widoku) --- */}
      {!isTech && repair.repairPhotos?.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Zdjęcia po naprawie ({repair.repairPhotos.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {repair.repairPhotos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        </Card>
      )}

      {/* --- HISTORIA STATUSÓW --- */}
      <Card>
        <Text style={styles.sectionTitle}>Historia statusów</Text>
        {repair.history.map((entry, i) => (
          <View key={i} style={styles.historyRow}>
            <View style={[styles.historyDot, i === repair.history.length - 1 && styles.historyDotLast]} />
            <View>
              <Text style={styles.historyStatus}>{entry.status}</Text>
              <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* --- AKCJE SERWISANTA --- */}
      {isTech && (
        <Card>
          <Text style={styles.sectionTitle}>Akcje serwisanta</Text>

          {/* Zdjęcia po naprawie – dokumentacja wykonanej pracy (np. wymieniony ekran) */}
          <Text style={styles.subLabel}>📸 Zdjęcia po naprawie ({repair.repairPhotos?.length || 0}/5)</Text>
          <Button label="📷 Dodaj zdjęcia z galerii" variant="ghost" onPress={pickRepairPhotos} />
          {repair.repairPhotos?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {repair.repairPhotos.map((uri, index) => (
                <View key={index} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removeRepairPhoto(index)}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.divider} />

          {/* Zmiana statusu */}
          {!isClosed && (
            <>
              <Button
                label={showStatusPicker ? '▲ Zamknij' : '🔄 Zmień status'}
                variant="ghost"
                onPress={() => setShowStatusPicker(!showStatusPicker)}
              />
              {showStatusPicker && (
                <View style={styles.statusList}>
                  {statusList.filter(s => s !== repair.status).map(s => (
                    <TouchableOpacity key={s} style={styles.statusItem} onPress={() => handleStatusChange(s)}>
                      <Text style={styles.statusItemText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Formularz gwarancji – pojawia się tylko przy wyborze statusu "Odebrane" */}
              {showWarrantyForm && (
                <View style={styles.warrantyBox}>
                  <Text style={styles.warrantyTitle}>🛡️ Okres gwarancji na naprawę</Text>
                  <Text style={styles.warrantyHint}>
                    Wybierz okres gwarancji przed wydaniem urządzenia klientowi.
                  </Text>
                  <View style={styles.warrantyOptions}>
                    {warrantyPeriods.map((period) => (
                      <TouchableOpacity
                        key={period.months}
                        style={[
                          styles.warrantyChip,
                          selectedWarranty.months === period.months && styles.warrantyChipActive,
                        ]}
                        onPress={() => setSelectedWarranty(period)}
                      >
                        <Text style={[
                          styles.warrantyChipText,
                          selectedWarranty.months === period.months && styles.warrantyChipTextActive,
                        ]}>
                          {period.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.warrantyActions}>
                    <Button
                      label="✅ Potwierdź wydanie"
                      variant="success"
                      onPress={handleConfirmDelivery}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="Anuluj"
                      variant="ghost"
                      onPress={() => setShowWarrantyForm(false)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </>
          )}

          {/* Wysyłanie SMS */}
          {customer?.phone && (
            <>
              <Button
                label={showSMSPicker ? '▲ Zamknij SMS' : `📱 Wyślij SMS do klienta`}
                variant="ghost"
                onPress={() => setShowSMSPicker(!showSMSPicker)}
                style={{ marginTop: 8 }}
              />
              {showSMSPicker && (
                <View style={styles.statusList}>
                  {templates.map(t => (
                    <TouchableOpacity key={t.id} style={styles.statusItem} onPress={() => handleSMS(t)}>
                      <Text style={styles.statusItemText}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Potwierdzenie przyjęcia / wykonania */}
          <Button
            label="🖨️ Drukuj potwierdzenie"
            variant="ghost"
            onPress={() => navigation.navigate('RepairConfirm', { repairId })}
            style={{ marginTop: 8 }}
          />
        </Card>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  content:          { padding: 16, paddingBottom: 40 },
  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:        { fontSize: 16, color: colors.danger },
  headerCard:       { marginBottom: 0 },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft:       { flex: 1, marginRight: 12 },
  deviceName:       { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  repairId:         { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  imei:             { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  createdAt:        { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  row:              { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel:         { fontSize: 14, color: colors.textSecondary },
  rowValue:         { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  totalRow:         { borderBottomWidth: 0, marginTop: 4 },
  totalLabel:       { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalValue:       { fontSize: 15, fontWeight: '700', color: colors.primary },
  estimateStatus:   { fontSize: 13, fontWeight: '600', marginTop: 10 },
  description:      { fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
  photo:            { width: 100, height: 100, borderRadius: 8, marginRight: 8 },
  historyRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  historyDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border, marginTop: 4 },
  historyDotLast:   { backgroundColor: colors.accent },
  historyStatus:    { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  historyDate:      { fontSize: 12, color: colors.textSecondary },
  statusList:       { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  statusItem:       { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.divider },
  statusItemText:   { fontSize: 14, color: colors.textPrimary },
  warrantyBadge:     { marginTop: 10, padding: 10, backgroundColor: colors.success + '15', borderRadius: 8 },
  warrantyBadgeText: { fontSize: 13, color: colors.success, fontWeight: '600' },
  noWarrantyText:    { fontSize: 12, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' },
  warrantyBox:       { marginTop: 12, padding: 14, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  warrantyTitle:     { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  warrantyHint:      { fontSize: 12, color: colors.textSecondary, marginBottom: 12, lineHeight: 17 },
  warrantyOptions:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  warrantyChip:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  warrantyChipActive:{ backgroundColor: colors.accent, borderColor: colors.accent },
  warrantyChipText:  { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  warrantyChipTextActive: { color: '#fff', fontWeight: '700' },
  warrantyActions:   { flexDirection: 'row', gap: 8 },
  subLabel:         { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  divider:          { height: 1, backgroundColor: colors.divider, marginVertical: 14 },
  photoRow:         { marginTop: 12, marginBottom: 4 },
  photoWrap:        { position: 'relative', marginRight: 10 },
  photoRemove:      { position: 'absolute', top: -6, right: -6, backgroundColor: colors.danger, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  photoRemoveText:  { color: '#fff', fontSize: 10, fontWeight: '700' },
});

export default RepairDetailsScreen;
