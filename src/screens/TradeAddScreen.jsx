// ============================================================
//  TradeAddScreen.jsx – formularz dodania telefonu do skupu
//  v2: skaner IMEI + cena sprzedaży dopiero po statusie Sprzedany
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import useStore      from '../store/useStore';
import Button        from '../components/Button';
import Card          from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import brands        from '../constants/brands';
import grades        from '../constants/grades';
import tradeSources  from '../constants/tradeSources';
import { storageOptions } from '../constants/storageOptions';
import TRADE_STATUS  from '../constants/tradeStatuses';
import { ImeaScannerModal } from '../components/ImeiScanner';

const TradeAddScreen = ({ navigation }) => {
  const addPhone = useStore((state) => state.addPhone);
  const repairs  = useStore((state) => state.repairs);

  const [brand,       setBrand]       = useState('');
  const [model,       setModel]       = useState('');
  const [imei,        setImei]        = useState('');
  const [color,       setColor]       = useState('');
  const [storage,     setStorage]     = useState('');
  const [grade,       setGrade]       = useState('');
  const [source,      setSource]      = useState('');
  const [sourceNote,  setSourceNote]  = useState('');
  // Foto umowy zakupu od klienta prywatnego (np. podpisana umowa kupna-sprzedaży) –
  // istotne tylko gdy source === 'private', dokumentuje legalność nabycia urządzenia
  const [agreementPhoto, setAgreementPhoto] = useState(null);
  const [buyPrice,    setBuyPrice]    = useState('');

  const [hasIcloudLock,  setHasIcloudLock]  = useState(false);
  const [hasCarrierLock, setHasCarrierLock] = useState(false);
  const [isReported,     setIsReported]     = useState(false);
  const [lockNotes,      setLockNotes]      = useState('');

  const [linkedRepairId, setLinkedRepairId] = useState('');
  const [notes,          setNotes]          = useState('');

  const [showBrand,    setShowBrand]    = useState(false);
  const [showGrade,    setShowGrade]    = useState(false);
  const [showSource,   setShowSource]   = useState(false);
  const [showRepairs,  setShowRepairs]  = useState(false);
  const [showScanner,  setShowScanner]  = useState(false);
  const [loading,      setLoading]      = useState(false);

  const selectedBrandLabel  = brands.find(b => b.value === brand)?.label        || 'Wybierz markę…';
  const selectedGradeLabel  = grades.find(g => g.value === grade)?.label        || 'Wybierz grade…';
  const selectedSourceLabel = tradeSources.find(s => s.value === source)?.label || 'Wybierz źródło…';
  const linkedRepair        = repairs.find(r => r.id === linkedRepairId);
  const selectedRepairLabel = linkedRepair
    ? `${linkedRepair.brand} ${linkedRepair.model} (#${linkedRepairId})`
    : 'Brak powiązania';

  // Wybierz pojedyncze zdjęcie umowy zakupu (dokument, nie galeria urządzenia)
  const pickAgreementPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Brak dostępu', 'Zezwól na dostęp do galerii w ustawieniach.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setAgreementPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!brand)         { Alert.alert('Błąd', 'Wybierz markę.');         return; }
    if (!model.trim())  { Alert.alert('Błąd', 'Podaj model.');           return; }
    if (!grade)         { Alert.alert('Błąd', 'Wybierz grade.');         return; }
    if (!source)        { Alert.alert('Błąd', 'Wybierz źródło zakupu.'); return; }
    if (!buyPrice)      { Alert.alert('Błąd', 'Podaj cenę zakupu.');     return; }

    setLoading(true);
    try {
      await addPhone({
        brand, model: model.trim(), imei: imei.trim(),
        color: color.trim(), storage, grade, source, sourceNote: sourceNote.trim(),
        agreementPhoto,
        buyPrice:  parseFloat(buyPrice) || 0,
        sellPrice: 0,            // ← cena sprzedaży ustawiana DOPIERO po oznaczeniu jako Sprzedany
        status: TRADE_STATUS.BOUGHT,
        hasIcloudLock, hasCarrierLock, isReported,
        lockNotes: lockNotes.trim(),
        linkedRepairId: linkedRepairId || null,
        notes: notes.trim(),
      });
      setLoading(false);
      Alert.alert('✅ Dodano!', 'Telefon dodany do skupu.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Błąd', 'Nie udało się dodać telefonu: ' + error.message);
    }
  };

  const LockSwitch = ({ label, value, onChange, danger = false }) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: colors.border, true: danger ? colors.danger : colors.warning }}
        thumbColor={value ? colors.primary : '#f4f3f4'} />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Skaner IMEI jako modal */}
      <ImeaScannerModal
        visible={showScanner}
        onScanned={(val) => { setImei(val); setShowScanner(false); }}
        onClose={() => setShowScanner(false)}
      />

      {/* URZĄDZENIE */}
      <Text style={styles.section}>Urządzenie</Text>
      <Card>
        <Picker label="📱 Marka" value={selectedBrandLabel} open={showBrand}
          onToggle={() => setShowBrand(!showBrand)} placeholder={!brand}>
          {showBrand && brands.map(b => (
            <DropItem key={b.value} label={b.label}
              onPress={() => { setBrand(b.value); setShowBrand(false); }} />
          ))}
        </Picker>
        <Text style={styles.label}>Model</Text>
        <TextInput style={styles.input} value={model} onChangeText={setModel}
          placeholder="np. iPhone 14 Pro" placeholderTextColor={colors.textSecondary} />

        {/* IMEI z przyciskiem skanera */}
        <Text style={styles.label}>IMEI</Text>
        <View style={styles.imeiRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={imei} onChangeText={setImei}
            placeholder="15 cyfr" placeholderTextColor={colors.textSecondary}
            keyboardType="numeric" maxLength={15}
          />
          <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)}>
            <Text style={styles.scanBtnText}>📷 Skanuj</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Kolor</Text>
        <TextInput style={styles.input} value={color} onChangeText={setColor}
          placeholder="np. Czarny, Biały, Niebieski" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>Pamięć</Text>
        <View style={styles.chipsRow}>
          {storageOptions.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, storage === s && styles.chipActive]}
              onPress={() => setStorage(storage === s ? '' : s)}
            >
              <Text style={[styles.chipText, storage === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* GRADE */}
      <Text style={styles.section}>Stan wizualny</Text>
      <Card>
        <Picker label="🏷️ Grade" value={selectedGradeLabel} open={showGrade}
          onToggle={() => setShowGrade(!showGrade)} placeholder={!grade}>
          {showGrade && grades.map(g => (
            <TouchableOpacity key={g.value} style={styles.dropItem}
              onPress={() => { setGrade(g.value); setShowGrade(false); }}>
              <Text style={[styles.dropLabel, { color: g.color }]}>{g.emoji} {g.label}</Text>
              <Text style={styles.dropSub}>{g.description}</Text>
            </TouchableOpacity>
          ))}
        </Picker>
      </Card>

      {/* ŹRÓDŁO */}
      <Text style={styles.section}>Źródło zakupu</Text>
      <Card>
        <Picker label="📦 Skąd" value={selectedSourceLabel} open={showSource}
          onToggle={() => setShowSource(!showSource)} placeholder={!source}>
          {showSource && tradeSources.map(s => (
            <DropItem key={s.value} label={`${s.emoji} ${s.label}`}
              onPress={() => { setSource(s.value); setShowSource(false); }} />
          ))}
        </Picker>
        <Text style={styles.label}>Notatka (nick OLX, imię klienta…)</Text>
        <TextInput style={styles.input} value={sourceNote} onChangeText={setSourceNote}
          placeholder="Opcjonalnie" placeholderTextColor={colors.textSecondary} />

        {/* Foto umowy zakupu – istotne tylko przy zakupie od klienta prywatnego,
            dokumentuje legalność nabycia (np. podpisana umowa kupna-sprzedaży) */}
        {source === 'private' && (
          <>
            <Text style={styles.label}>📄 Zdjęcie umowy zakupu (opcjonalnie)</Text>
            {agreementPhoto ? (
              <View style={styles.agreementWrap}>
                <Image source={{ uri: agreementPhoto }} style={styles.agreementPhoto} />
                <TouchableOpacity style={styles.agreementRemove} onPress={() => setAgreementPhoto(null)}>
                  <Text style={styles.agreementRemoveText}>✕ Usuń</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Button label="📷 Dodaj zdjęcie umowy" variant="ghost" onPress={pickAgreementPhoto} />
            )}
          </>
        )}
      </Card>

      {/* CENA ZAKUPU — cena sprzedaży ustawiania dopiero po zmianie statusu na Sprzedany */}
      <Text style={styles.section}>Cena zakupu</Text>
      <Card>
        <Text style={styles.label}>Cena zakupu (zł) *</Text>
        <TextInput style={styles.input} value={buyPrice} onChangeText={setBuyPrice}
          placeholder="0" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Cenę sprzedaży i zysk uzupełnisz po zmianie statusu telefonu na „Sprzedany"
          </Text>
        </View>
      </Card>

      {/* BLOKADY */}
      <Text style={styles.section}>Blokady i zastrzeżenia</Text>
      <Card>
        <LockSwitch label="🔒 Blokada iCloud (Find My)"                 value={hasIcloudLock}  onChange={setHasIcloudLock}  danger />
        <LockSwitch label="📡 Simlock operatora"                         value={hasCarrierLock} onChange={setHasCarrierLock} />
        <LockSwitch label="⚠️ Zastrzeżony / zgłoszony jako kradziony"    value={isReported}     onChange={setIsReported}     danger />
        {(hasIcloudLock || hasCarrierLock || isReported) && (
          <>
            <Text style={styles.label}>Notatki o blokadach</Text>
            <TextInput style={[styles.input, styles.textarea]} value={lockNotes}
              onChangeText={setLockNotes} multiline numberOfLines={3} textAlignVertical="top"
              placeholder="Np. właściciel zna kod, simlock T-Mobile…"
              placeholderTextColor={colors.textSecondary} />
          </>
        )}
      </Card>

      {/* POWIĄZANIE Z NAPRAWĄ */}
      <Text style={styles.section}>Powiązanie z naprawą (opcjonalnie)</Text>
      <Card>
        <Picker label="🔧 Zlecenie" value={selectedRepairLabel} open={showRepairs}
          onToggle={() => setShowRepairs(!showRepairs)} placeholder={!linkedRepairId}>
          {showRepairs && (
            <>
              <DropItem label="Brak powiązania"
                onPress={() => { setLinkedRepairId(''); setShowRepairs(false); }} />
              {repairs.map(r => (
                <TouchableOpacity key={r.id} style={styles.dropItem}
                  onPress={() => { setLinkedRepairId(r.id); setShowRepairs(false); }}>
                  <Text style={styles.dropLabel}>{r.brand} {r.model}</Text>
                  <Text style={styles.dropSub}>#{r.id} · {r.status}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </Picker>
      </Card>

      {/* NOTATKI */}
      <Text style={styles.section}>Notatki</Text>
      <Card>
        <TextInput style={[styles.input, styles.textarea]} value={notes} onChangeText={setNotes}
          placeholder="Dodatkowe informacje…" placeholderTextColor={colors.textSecondary}
          multiline numberOfLines={4} textAlignVertical="top" />
      </Card>

      <Button label="💾 Dodaj do skupu" onPress={handleSubmit} loading={loading} style={{ marginTop: 16 }} />
      <Button label="Anuluj" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 8, marginBottom: 32 }} />
    </ScrollView>
  );
};

const Picker = ({ label, value, open, onToggle, placeholder, children }) => (
  <View>
    <TouchableOpacity style={styles.pickerRow} onPress={onToggle}>
      <Text style={[styles.pickerText, placeholder && styles.placeholder]}>{label}: {value}</Text>
      <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
    {children}
  </View>
);

const DropItem = ({ label, onPress }) => (
  <TouchableOpacity style={styles.dropItem} onPress={onPress}>
    <Text style={styles.dropLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  content:     { padding: 16 },
  section:     { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  label:       { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input:       { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.textPrimary },
  textarea:    { height: 80 },
  imeiRow:     { flexDirection: 'row', alignItems: 'center' },
  chipsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  chipActive:  { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:    { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
  scanBtn:     { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, justifyContent: 'center' },
  scanBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  agreementWrap:       { marginTop: 8, alignItems: 'flex-start' },
  agreementPhoto:      { width: 160, height: 160, borderRadius: 10, marginBottom: 8 },
  agreementRemove:     { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.danger + '15', borderRadius: 8 },
  agreementRemoveText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  pickerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  pickerText:  { fontSize: 14, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textSecondary },
  chevron:     { fontSize: 12, color: colors.textSecondary },
  dropItem:    { paddingVertical: 10, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: colors.divider },
  dropLabel:   { fontSize: 14, color: colors.textPrimary },
  dropSub:     { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  switchRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
  switchLabel: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  infoBox:     { marginTop: 10, padding: 10, backgroundColor: colors.accent + '15', borderRadius: 8 },
  infoText:    { fontSize: 12, color: colors.accent, fontWeight: '500' },
});

export default TradeAddScreen;
