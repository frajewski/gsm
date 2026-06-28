// ============================================================
//  EstimateScreen.jsx – kosztorys naprawy
//  Serwisant: może edytować ceny i wysłać powiadomienie
//  Klient: widzi kosztorys, akceptuje lub odrzuca
// ============================================================

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import useStore     from '../store/useStore';
import Button       from '../components/Button';
import Card         from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import STATUS       from '../constants/statuses';
import { smsSend_Estimate } from '../services/smsService';

const EstimateScreen = ({ route, navigation }) => {
  const { repairId } = route.params;

  const getRepairById = useStore((state) => state.getRepairById);
  const getUserById   = useStore((state) => state.getUserById);
  const updateRepair  = useStore((state) => state.updateRepair);
  const currentUser   = useStore((state) => state.currentUser);

  const repair   = getRepairById(repairId);
  const customer = repair ? getUserById(repair.customerId) : null;
  const isTech   = ['admin', 'worker'].includes(currentUser?.role);
  // Tylko admin widzi rozbicie ceny na części/usługę (marża). Pracownik wprowadza
  // kosztorys (edytuje pola), ale widzi tylko sumę – jego rola to przyjęcie/wydanie, nie rozliczenia.
  const isAdmin  = currentUser?.role === 'admin';

  // Pole jedyne dla pracownika: cena całości podana przez admina (np. telefonicznie)
  const [totalCostInput, setTotalCostInput] = useState(
    String((repair?.partsCost || 0) + (repair?.serviceCost || 0) || 0)
  );
  // Rozbicie wewnętrzne – tylko admin, opcjonalne, do własnych rozliczeń/marży
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [partsCost,     setPartsCost]     = useState(String(repair?.partsCost   || 0));
  const [serviceCost,   setServiceCost]   = useState(String(repair?.serviceCost || 0));
  const [notes,         setNotes]         = useState('');

  if (!repair) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Nie znaleziono zlecenia.</Text>
      </View>
    );
  }

  // Suma do wyświetlenia klientowi: jeśli admin rozbił na części/usługę, licz z tego;
  // inaczej (typowy przypadek pracownika) licz z jednego pola sumy
  const totalCost = isAdmin && showBreakdown
    ? (parseFloat(partsCost) || 0) + (parseFloat(serviceCost) || 0)
    : (parseFloat(totalCostInput) || 0);

  // Zapisuje zaktualizowany kosztorys. Pracownik zapisuje tylko sumę (w polu serviceCost,
  // partsCost zostaje 0 – to nie wpływa na to co widzi klient, bo wszędzie liczymy sumę obu).
  // Admin, jeśli rozwinął rozbicie, zapisuje obie wartości osobno do własnych rozliczeń.
  const handleSaveEstimate = () => {
    const dataToSave = isAdmin && showBreakdown
      ? { partsCost: parseFloat(partsCost) || 0, serviceCost: parseFloat(serviceCost) || 0 }
      : { partsCost: 0, serviceCost: parseFloat(totalCostInput) || 0 };

    updateRepair(repairId, {
      ...dataToSave,
      estimateAccepted: null, // reset – klient musi zaakceptować ponownie
    });
    // Opcjonalnie wyślij SMS z powiadomieniem
    if (customer?.phone) {
      Alert.alert(
        'Kosztorys zapisany',
        'Czy wysłać powiadomienie SMS do klienta?',
        [
          { text: 'Nie', onPress: () => navigation.goBack() },
          {
            text: 'Wyślij SMS',
            onPress: () => {
              smsSend_Estimate(
                { ...repair, ...dataToSave },
                customer.phone,
                customer.name
              );
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Klient: akceptuje kosztorys
  const handleAccept = () => {
    Alert.alert(
      'Potwierdzenie',
      `Akceptujesz kosztorys na kwotę ${totalCost.toFixed(2)} zł?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Akceptuję',
          style: 'default',
          onPress: () => {
            updateRepair(repairId, { estimateAccepted: true });
            Alert.alert('✅ Akceptacja zapisana', 'Serwis może przystąpić do naprawy.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
        },
      ]
    );
  };

  // Klient: odrzuca kosztorys
  const handleReject = () => {
    Alert.alert(
      'Odrzucenie kosztorysu',
      'Czy na pewno chcesz odrzucić kosztorys? Naprawa zostanie anulowana.',
      [
        { text: 'Wróć', style: 'cancel' },
        {
          text: 'Odrzucam',
          style: 'destructive',
          onPress: () => {
            updateRepair(repairId, {
              estimateAccepted: false,
              status: STATUS.CANCELLED,
            });
            Alert.alert('❌ Kosztorys odrzucony', 'Zlecenie zostało anulowane.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* --- NAGŁÓWEK --- */}
      <Card style={styles.headerCard}>
        <Text style={styles.deviceName}>{repair.brand} {repair.model}</Text>
        <Text style={styles.repairId}>Zlecenie #{repair.displayNumber || repair.id}</Text>
        {isTech && customer && (
          <Text style={styles.customerName}>👤 {customer.name}</Text>
        )}
      </Card>

      {/* --- POZYCJE KOSZTORYSU --- */}
      <Card>
        <Text style={styles.sectionTitle}>Szczegóły kosztorysu</Text>

        {isTech ? (
          /* Serwisant: jedno pole z ceną całości (podaną np. telefonicznie przez admina) */
          <>
            <Text style={styles.label}>Cena całości naprawy (zł)</Text>
            <TextInput
              style={styles.input}
              value={totalCostInput}
              onChangeText={setTotalCostInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              editable={!(isAdmin && showBreakdown)}
            />

            {/* Tylko admin: opcjonalne rozbicie wewnętrzne do własnych rozliczeń */}
            {isAdmin && (
              <>
                <Button
                  label={showBreakdown ? '▲ Zwiń rozbicie wewnętrzne' : '🔍 Rozbij na części/usługę (tylko admin)'}
                  variant="ghost"
                  onPress={() => setShowBreakdown(!showBreakdown)}
                  style={{ marginTop: 12 }}
                />
                {showBreakdown && (
                  <View style={styles.breakdownBox}>
                    <Text style={styles.label}>Koszt części (zł)</Text>
                    <TextInput
                      style={styles.input}
                      value={partsCost}
                      onChangeText={setPartsCost}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles.label}>Koszt usługi / robocizna (zł)</Text>
                    <TextInput
                      style={styles.input}
                      value={serviceCost}
                      onChangeText={setServiceCost}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                )}
              </>
            )}

            <Text style={styles.label}>Dodatkowe uwagi (widoczne dla klienta)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Opcjonalne informacje dla klienta…"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </>
        ) : (
          /* Klient: widok tylko do odczytu – tylko cena całości, bez rozbicia na koszty serwisu */
          <Text style={styles.estimateInfo}>
            Wycena obejmuje wszystkie niezbędne części i robociznę potrzebne do naprawy.
          </Text>
        )}

        {/* Łączna kwota */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Do zapłaty</Text>
          <Text style={styles.totalValue}>{totalCost.toFixed(2)} zł</Text>
        </View>
      </Card>

      {/* --- AKCJE KLIENTA --- */}
      {!isTech && repair.estimateAccepted === null && (
        <Card>
          <Text style={styles.sectionTitle}>Twoja decyzja</Text>
          <Text style={styles.decisionInfo}>
            Prosimy o decyzję dotyczącą kosztorysu naprawy Twojego urządzenia.
          </Text>
          <Button
            label="✅ Akceptuję kosztorys"
            variant="success"
            onPress={handleAccept}
            style={{ marginBottom: 10 }}
          />
          <Button
            label="❌ Odrzucam – rezygnuję z naprawy"
            variant="danger"
            onPress={handleReject}
          />
        </Card>
      )}

      {/* Status po decyzji klienta */}
      {!isTech && repair.estimateAccepted !== null && (
        <Card>
          <Text style={[styles.decisionResult, {
            color: repair.estimateAccepted ? colors.success : colors.danger,
          }]}>
            {repair.estimateAccepted
              ? '✅ Zaakceptowałeś ten kosztorys'
              : '❌ Odrzuciłeś ten kosztorys'}
          </Text>
        </Card>
      )}

      {/* --- AKCJE SERWISANTA --- */}
      {isTech && (
        <>
          <Button
            label="💾 Zapisz kosztorys"
            onPress={handleSaveEstimate}
            style={{ marginTop: 12 }}
          />
          <Button
            label="Anuluj"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={{ marginTop: 8 }}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 16, paddingBottom: 40 },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:    { fontSize: 16, color: colors.danger },
  headerCard:   { marginBottom: 0 },
  deviceName:   { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  repairId:     { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  customerName: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  label:        { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input:        { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.textPrimary },
  textarea:     { height: 80 },
  breakdownBox: { marginTop: 4, padding: 12, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  costRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  costLabel:    { fontSize: 15, color: colors.textPrimary },
  costValue:    { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  estimateInfo: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  totalBox:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 2, borderTopColor: colors.primary },
  totalLabel:   { fontSize: 17, fontWeight: '700', color: colors.primary },
  totalValue:   { fontSize: 22, fontWeight: '800', color: colors.primary },
  decisionInfo: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  decisionResult: { fontSize: 16, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
});

export default EstimateScreen;
