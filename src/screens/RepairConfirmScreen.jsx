// ============================================================
//  RepairConfirmScreen.jsx – podgląd potwierdzenia przyjęcia/wykonania
//  Zawiera: datę realizacji, wzór blokady, NIP klienta, QR
//  Drukowanie/eksport PDF realizowane przez expo-print + expo-sharing
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import useStore    from '../store/useStore';
import useSettings from '../store/useSettings';
import Button      from '../components/Button';
import Card        from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { formatDate, formatDateShort } from '../utils/formatDate';

const RepairConfirmScreen = ({ route }) => {
  const { repairId } = route.params;
  const getRepairById = useStore((s) => s.getRepairById);
  const getUserById   = useStore((s) => s.getUserById);
  const settings      = useSettings();

  const repair   = getRepairById(repairId);
  const customer = repair ? getUserById(repair.customerId) : null;

  // Pola edytowalne tylko na tym ekranie (nie zapisują się do bazy)
  const [screenLock,      setScreenLock]      = useState(repair?.screenLock || '');
  const [customerNip,     setCustomerNip]      = useState(repair?.customerNip || '');
  const [completionDate,  setCompletionDate]   = useState(
    new Date().toLocaleDateString('pl-PL')
  );
  const [acceptorName,    setAcceptorName]     = useState(settings.shopName);

  if (!repair) return (
    <View style={styles.centered}><Text style={styles.error}>Brak zlecenia.</Text></View>
  );

  const total = (repair.partsCost || 0) + (repair.serviceCost || 0);

  // Buduje dokument HTML lustrzanie odwzorowujący podgląd widoczny na ekranie,
  // żeby wydrukowany/wyeksportowany PDF wyglądał identycznie jak to co widzi serwisant
  const buildPrintHtml = () => {
    const row = (label, value) =>
      value ? `<div class="row"><span class="rowLabel">${label}:</span> <span class="rowValue">${value}</span></div>` : '';

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
            .shopName { font-size: 18px; font-weight: 800; text-align: center; margin: 0; }
            .shopSub { font-size: 12px; color: #555; text-align: center; margin: 2px 0; }
            .divider { border-top: 1px solid #ccc; margin: 14px 0; }
            .miniDivider { border-top: 1px solid #eee; margin: 8px 0; }
            .title { font-size: 15px; font-weight: 700; text-align: center; margin: 4px 0; }
            .repairId { font-size: 12px; color: #555; text-align: center; margin: 2px 0; }
            .docType { font-size: 13px; font-weight: 800; text-align: center; letter-spacing: 1px; margin: 8px 0 16px; }
            .twoCol { display: flex; gap: 24px; }
            .col { flex: 1; }
            .colTitle { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .row { font-size: 13px; margin-bottom: 4px; }
            .rowLabel { color: #555; }
            .rowValue { color: #111; }
            .totalRow { display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid #ccc; }
            .totalLabel, .totalValue { font-size: 16px; font-weight: 800; }
            .signRow { display: flex; justify-content: space-around; margin-top: 32px; }
            .sign { text-align: center; width: 40%; }
            .signLine { border-top: 1px solid #999; margin-bottom: 6px; }
            .signLabel { font-size: 11px; color: #777; }
          </style>
        </head>
        <body>
          <p class="shopName">${settings.shopName}</p>
          <p class="shopSub">${settings.shopAddress}</p>
          <p class="shopSub">${settings.shopPhone}</p>
          <div class="divider"></div>

          <p class="title">POTWIERDZENIE PRZYJĘCIA URZĄDZENIA</p>
          <p class="repairId">Nr zlecenia: #${repair.displayNumber || repair.id}</p>
          ${repair.documentType ? `<p class="docType">${repair.documentType === 'Faktura' ? '📄 FAKTURA' : '🧾 PARAGON'}</p>` : ''}

          <div class="twoCol">
            <div class="col">
              <p class="colTitle">KLIENT</p>
              ${row('Imię i nazwisko', customer?.name)}
              ${row('Telefon', customer?.phone)}
              ${row('NIP', customerNip)}
              <div class="miniDivider"></div>
              ${row('Data przyjęcia', formatDateShort(repair.createdAt))}
              ${settings.showCompletionDate ? row('Data realizacji', completionDate) : ''}
              ${row('Przyjął', acceptorName)}
            </div>
            <div class="col">
              <p class="colTitle">URZĄDZENIE</p>
              ${row('Marka / Model', `${repair.brand} ${repair.model}`)}
              ${row('IMEI / S/N', repair.imei || '—')}
              ${row('Opis usterki', repair.description)}
              ${settings.showScreenLockPattern ? `<div class="miniDivider"></div>${row('Wzór blokady', screenLock || '[ ________________ ]')}` : ''}
            </div>
          </div>

          <div class="divider"></div>
          <p class="colTitle">KOSZTORYS</p>
          <div class="totalRow">
            <span class="totalLabel">ŁĄCZNIE:</span>
            <span class="totalValue">${total} zł</span>
          </div>

          <div class="divider"></div>
          <div class="signRow">
            <div class="sign"><div class="signLine"></div><p class="signLabel">Podpis klienta</p></div>
            <div class="sign"><div class="signLine"></div><p class="signLabel">Podpis serwisanta</p></div>
          </div>
        </body>
      </html>
    `;
  };

  // Generuje PDF z dokumentu HTML, a następnie:
  // - na iOS: otwiera natywny systemowy dialog drukowania
  // - na Androidzie: dialog drukowania bywa niedostępny w Expo Go, więc zamiast tego
  //   otwieramy ekran "Udostępnij", z którego można zapisać PDF lub wysłać go dalej
  const handlePrint = async () => {
    try {
      const html = buildPrintHtml();
      if (Platform.OS === 'ios') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Potwierdzenie przyjęcia' });
        } else {
          Alert.alert('PDF zapisany', `Plik zapisano w: ${uri}`);
        }
      }
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się wygenerować dokumentu PDF. Spróbuj ponownie.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* EDYTOWALNE POLA PRZED WYDRUKIEM */}
      <Text style={styles.section}>Uzupełnij przed wydrukiem</Text>
      <Card>
        {settings.showCompletionDate && (
          <>
            <Text style={styles.label}>Data realizacji</Text>
            <TextInput style={styles.input} value={completionDate}
              onChangeText={setCompletionDate}
              placeholder="dd.mm.rrrr" placeholderTextColor={colors.textSecondary} />
          </>
        )}
        <Text style={styles.label}>Osoba przyjmująca</Text>
        <TextInput style={styles.input} value={acceptorName}
          onChangeText={setAcceptorName}
          placeholder="Imię i nazwisko" placeholderTextColor={colors.textSecondary} />
        {/* NIP wpisywany jest już przy przyjęciu zlecenia (AddRepairScreen) – tu tylko
            wyświetlamy go na podglądzie wydruku poniżej, bez ponownego wpisywania */}
        {settings.showScreenLockPattern && (
          <>
            <Text style={styles.label}>Wzór blokady ekranu / PIN (opcjonalnie)</Text>
            <TextInput style={styles.input} value={screenLock}
              onChangeText={setScreenLock}
              placeholder="np. 1234 lub opis wzoru" placeholderTextColor={colors.textSecondary} />
          </>
        )}
      </Card>

      {/* PODGLĄD POTWIERDZENIA */}
      <Text style={styles.section}>Podgląd wydruku</Text>
      <Card style={styles.printPreview} padding={20}>

        {/* Nagłówek */}
        <Text style={styles.printShopName}>{settings.shopName}</Text>
        <Text style={styles.printShopSub}>{settings.shopAddress}</Text>
        <Text style={styles.printShopSub}>{settings.shopPhone}</Text>
        <View style={styles.printDivider} />

        <Text style={styles.printTitle}>POTWIERDZENIE PRZYJĘCIA URZĄDZENIA</Text>
        <Text style={styles.printRepairId}>Nr zlecenia: #{repair.displayNumber || repair.id}</Text>
        {repair.documentType && (
          <Text style={styles.printDocType}>
            {repair.documentType === 'Faktura' ? '📄 FAKTURA' : '🧾 PARAGON'}
          </Text>
        )}

        {/* Dwa bloki: lewa strona (klient) | prawa strona (urządzenie) */}
        <View style={styles.printTwoCol}>

          {/* LEWA: dane klienta */}
          <View style={styles.printCol}>
            <Text style={styles.printColTitle}>KLIENT</Text>
            <PrintRow label="Imię i nazwisko" value={customer?.name} />
            <PrintRow label="Telefon"         value={customer?.phone} />
            {customerNip ? <PrintRow label="NIP" value={customerNip} /> : null}
            <View style={styles.printMiniDivider} />
            <PrintRow label="Data przyjęcia"  value={formatDateShort(repair.createdAt)} />
            {settings.showCompletionDate && (
              <PrintRow label="Data realizacji" value={completionDate} bold />
            )}
            <PrintRow label="Przyjął" value={acceptorName} />
          </View>

          {/* PRAWA: dane urządzenia */}
          <View style={styles.printCol}>
            <Text style={styles.printColTitle}>URZĄDZENIE</Text>
            <PrintRow label="Marka / Model" value={`${repair.brand} ${repair.model}`} />
            <PrintRow label="IMEI / S/N"    value={repair.imei || '—'} />
            <PrintRow label="Opis usterki"  value={repair.description} wrap />
            {settings.showScreenLockPattern && (
              <>
                <View style={styles.printMiniDivider} />
                <PrintRow label="Wzór blokady" value={screenLock || '[ ________________ ]'} />
              </>
            )}
          </View>
        </View>

        <View style={styles.printDivider} />

        {/* Kosztorys – dla klienta tylko cena całości, bez rozbicia na części/usługę */}
        <Text style={styles.printColTitle}>KOSZTORYS</Text>
        <View style={[styles.printCostRow, styles.printTotalRow]}>
          <Text style={styles.printTotalLabel}>ŁĄCZNIE:</Text>
          <Text style={styles.printTotalValue}>{total} zł</Text>
        </View>

        <View style={styles.printDivider} />

        {/* Podpisy */}
        <View style={styles.printSignRow}>
          <View style={styles.printSign}>
            <View style={styles.printSignLine} />
            <Text style={styles.printSignLabel}>Podpis klienta</Text>
          </View>
          <View style={styles.printSign}>
            <View style={styles.printSignLine} />
            <Text style={styles.printSignLabel}>Podpis serwisanta</Text>
          </View>
        </View>

        {/* KOD QR */}
        {settings.qrContent ? (
          <View style={styles.printQR}>
            {settings.qrLabel ? (
              <Text style={styles.printQRLabel}>{settings.qrLabel}</Text>
            ) : null}
            {/* Placeholder QR – w produkcji użyj react-native-qrcode-svg */}
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>[ KOD QR ]{'\n'}{settings.qrContent}</Text>
            </View>
          </View>
        ) : null}

      </Card>

      <Button label="🖨️ Drukuj / Eksportuj" onPress={handlePrint} style={{ marginTop: 16 }} />
      <Button label="Zamknij" variant="ghost" onPress={() => {}} style={{ marginTop: 8, marginBottom: 32 }} />
    </ScrollView>
  );
};

const PrintRow = ({ label, value, bold, wrap }) => (
  <View style={prS.row}>
    <Text style={prS.label}>{label}: </Text>
    <Text style={[prS.value, bold && prS.bold, wrap && prS.wrap]} numberOfLines={wrap ? 3 : 1}>
      {value || '—'}
    </Text>
  </View>
);

const prS = StyleSheet.create({
  row:   { flexDirection: 'row', marginBottom: 3, flexWrap: 'wrap' },
  label: { fontSize: 10, color: '#555', width: 90 },
  value: { fontSize: 10, color: '#111', flex: 1 },
  bold:  { fontWeight: '700' },
  wrap:  { flexShrink: 1 },
});

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: 16, paddingBottom: 40 },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error:           { color: colors.danger },
  section:         { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  label:           { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input:           { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.textPrimary },

  // Podgląd wydruku
  printPreview:    { backgroundColor: '#fff' },
  printShopName:   { fontSize: 14, fontWeight: '800', color: '#111', textAlign: 'center' },
  printShopSub:    { fontSize: 10, color: '#555', textAlign: 'center' },
  printDivider:    { height: 1, backgroundColor: '#ccc', marginVertical: 10 },
  printMiniDivider:{ height: 1, backgroundColor: '#eee', marginVertical: 6 },
  printTitle:      { fontSize: 12, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 4 },
  printRepairId:   { fontSize: 10, color: '#555', textAlign: 'center', marginBottom: 4 },
  printDocType:    { fontSize: 11, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 10, letterSpacing: 1 },
  printTwoCol:     { flexDirection: 'row', gap: 12 },
  printCol:        { flex: 1 },
  printColTitle:   { fontSize: 10, fontWeight: '700', color: '#333', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  printCostRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  printCostLabel:  { fontSize: 11, color: '#555' },
  printCostValue:  { fontSize: 11, color: '#111' },
  printTotalRow:   { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#ccc' },
  printTotalLabel: { fontSize: 13, fontWeight: '800', color: '#111' },
  printTotalValue: { fontSize: 13, fontWeight: '800', color: '#111' },
  printSignRow:    { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  printSign:       { alignItems: 'center', width: '40%' },
  printSignLine:   { width: '100%', height: 1, backgroundColor: '#999', marginBottom: 4 },
  printSignLabel:  { fontSize: 9, color: '#777' },
  printQR:         { alignItems: 'center', marginTop: 16 },
  printQRLabel:    { fontSize: 11, color: '#555', marginBottom: 6 },
  qrPlaceholder:   { width: 100, height: 100, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  qrPlaceholderText: { fontSize: 9, color: '#888', textAlign: 'center' },
});

export default RepairConfirmScreen;
