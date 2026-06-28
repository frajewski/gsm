// ============================================================
//  AddRepairScreen.jsx – formularz dodawania nowej naprawy
//  Tylko dla serwisanta. Zawiera: dropdown marek, ImagePicker, koszty.
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import useStore         from '../store/useStore';
import Button           from '../components/Button';
import Card             from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import brands, { faultTypes } from '../constants/brands';
import STATUS           from '../constants/statuses';
import { DOCUMENT_TYPE, documentTypeList } from '../constants/documentTypes';
import { ImeaScannerModal } from '../components/ImeiScanner';

const AddRepairScreen = ({ navigation }) => {
  const addRepair        = useStore((state) => state.addRepair);
  const currentUser      = useStore((state) => state.currentUser);
  const customers         = useStore((state) => state.getCustomers());
  const addWalkInCustomer = useStore((state) => state.addWalkInCustomer);
  // Tylko admin widzi/wprowadza rozbicie na części/usługę. Pracownik wpisuje jedną sumę.
  const isAdmin = currentUser?.role === 'admin';

  // --- Dane urządzenia ---
  const [brand,       setBrand]       = useState('');
  const [model,       setModel]       = useState('');
  const [imei,        setImei]        = useState('');
  const [description, setDescription] = useState('');
  const [faultType,   setFaultType]   = useState('');
  const [screenLock,  setScreenLock]  = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // --- Dokument sprzedaży (paragon/faktura) i NIP ---
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPE.RECEIPT); // domyślnie paragon
  const [customerNip,  setCustomerNip]  = useState('');

  // --- Kosztorys ---
  // Pracownik: jedna suma (cena podana np. telefonicznie przez admina)
  const [totalCostInput, setTotalCostInput] = useState('');
  // Admin: opcjonalne rozbicie wewnętrzne do własnych rozliczeń/marży
  const [showBreakdown,  setShowBreakdown]  = useState(false);
  const [partsCost,      setPartsCost]      = useState('');
  const [serviceCost,    setServiceCost]    = useState('');

  // --- Klient ---
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // --- Nowy klient (formularz "papierowy" bez konta Firebase) ---
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName,     setNewCustomerName]     = useState('');
  const [newCustomerPhone,    setNewCustomerPhone]    = useState('');
  const [newCustomerEmail,    setNewCustomerEmail]    = useState('');

  // --- Zdjęcia ---
  const [photos, setPhotos] = useState([]);

  // --- UI State ---
  const [showBrandPicker,    setShowBrandPicker]    = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showFaultPicker,    setShowFaultPicker]    = useState(false);
  const [loading,            setLoading]            = useState(false);

  // Zapisz nowego klienta "papierowego" i automatycznie wybierz go w formularzu
  const handleAddWalkInCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Błąd', 'Podaj imię i nazwisko klienta.');
      return;
    }
    try {
      // DIAGNOSTYKA TYMCZASOWA – sprawdzamy co faktycznie widzi token w tym
      // momencie, żeby ustalić czy problem jest w custom claim czy gdzie indziej
      const { getAuth } = await import('firebase/auth');
      const currentAuthUser = getAuth().currentUser;
      const tokenResult = await currentAuthUser.getIdTokenResult();
      console.log('=== DIAGNOSTYKA TOKENU ===');
      console.log('UID:', currentAuthUser.uid);
      console.log('Claims:', JSON.stringify(tokenResult.claims));
      console.log('Token wydany:', tokenResult.issuedAtTime);
      console.log('currentUser z store:', JSON.stringify(currentUser));
      console.log('==========================');

      const created = await addWalkInCustomer({
        name:  newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        email: newCustomerEmail.trim(),
      });
      setSelectedCustomerId(created.id);
      setShowNewCustomerForm(false);
      setShowCustomerPicker(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
    } catch (error) {
      // Pokazujemy faktyczny błąd – wcześniej brak await sprawiał, że błędy
      // (np. odrzucenie przez firestore.rules) były całkowicie niewidoczne
      Alert.alert('Błąd', 'Nie udało się dodać klienta: ' + error.message);
    }
  };

  // Wybierz zdjęcia z galerii (ImagePicker)
  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Brak dostępu', 'Zezwól na dostęp do galerii w ustawieniach.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,   // iOS 14+ / Android
      quality: 0.7,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      // result.assets to tablica wybranych zdjęć
      const uris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...uris].slice(0, 5)); // max 5 zdjęć
    }
  };

  // Usuń zdjęcie z podglądu
  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Walidacja i zapis zlecenia
  const handleSubmit = async () => {
    if (!brand) {      Alert.alert('Błąd', 'Wybierz markę urządzenia.');      return; }
    if (!model.trim()) { Alert.alert('Błąd', 'Podaj model urządzenia.');       return; }
    if (!description.trim()) { Alert.alert('Błąd', 'Opisz usterkę.');          return; }
    if (!selectedCustomerId) { Alert.alert('Błąd', 'Wybierz klienta.');        return; }
    if (documentType === DOCUMENT_TYPE.INVOICE && !customerNip.trim()) {
      Alert.alert('Błąd', 'Faktura wymaga podania NIP klienta.');
      return;
    }

    setLoading(true);
    // Jeśli admin rozwinął rozbicie wewnętrzne – zapisz osobno części/usługę.
    // W przeciwnym razie (typowy przypadek pracownika) cała suma idzie do serviceCost.
    const costData = isAdmin && showBreakdown
      ? { partsCost: parseFloat(partsCost) || 0, serviceCost: parseFloat(serviceCost) || 0 }
      : { partsCost: 0, serviceCost: parseFloat(totalCostInput) || 0 };

    try {
      const newRepair = await addRepair({
        customerId:  selectedCustomerId,
        brand,
        model:       model.trim(),
        imei:        imei.trim(),
        description: description.trim(),
        status:      STATUS.ACCEPTED,
        photos,
        ...costData,
        estimateAccepted: null,
        screenLock:  screenLock.trim(),
        documentType,
        customerNip: customerNip.trim(),
      });
      setLoading(false);
      Alert.alert('Zlecenie dodane!', `Nr zlecenia: ${newRepair.displayNumber || newRepair.id}`, [
        { text: 'OK', onPress: () => navigation.replace('RepairDetails', { repairId: newRepair.id }) },
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Błąd', 'Nie udało się dodać zlecenia: ' + error.message);
    }
  };

  const selectedBrandLabel    = brands.find(b => b.value === brand)?.label || 'Wybierz markę…';
  const selectedCustomerLabel = customers.find(c => c.id === selectedCustomerId)?.name || 'Wybierz klienta…';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Skaner IMEI jako modal */}
      <ImeaScannerModal
        visible={showScanner}
        onScanned={(val) => { setImei(val); setShowScanner(false); }}
        onClose={() => setShowScanner(false)}
      />

      {/* --- KLIENT --- */}
      <Text style={styles.sectionTitle}>Klient</Text>
      <Card>
        <TouchableOpacity style={styles.picker} onPress={() => setShowCustomerPicker(!showCustomerPicker)}>
          <Text style={[styles.pickerText, !selectedCustomerId && styles.placeholder]}>
            👤 {selectedCustomerLabel}
          </Text>
          <Text style={styles.chevron}>{showCustomerPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showCustomerPicker && (
          <View style={styles.dropdownList}>
            {/* Przycisk dodania nowego klienta na samym szczycie listy */}
            <TouchableOpacity
              style={styles.addCustomerBtn}
              onPress={() => setShowNewCustomerForm(!showNewCustomerForm)}
            >
              <Text style={styles.addCustomerText}>
                {showNewCustomerForm ? '▲ Zwiń' : '➕ Dodaj nowego klienta'}
              </Text>
            </TouchableOpacity>

            {/* Mini-formularz nowego klienta */}
            {showNewCustomerForm && (
              <View style={styles.newCustomerForm}>
                <TextInput
                  style={styles.input}
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                  placeholder="Imię i nazwisko *"
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                  placeholder="Numer telefonu"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={newCustomerEmail}
                  onChangeText={setNewCustomerEmail}
                  placeholder="Email (opcjonalnie)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.walkInHint}>
                  💡 Ten klient nie będzie mieć dostępu do apki – to tylko zapis w systemie. Jeśli klient zarejestruje się sam w przyszłości, jego konta nie połączą się automatycznie.
                </Text>
                <Button
                  label="Zapisz i wybierz klienta"
                  onPress={handleAddWalkInCustomer}
                  style={{ marginTop: 10 }}
                />
              </View>
            )}

            {/* Lista istniejących klientów */}
            {customers.map((c) => (
              <TouchableOpacity key={c.id} style={styles.dropdownItem}
                onPress={() => { setSelectedCustomerId(c.id); setShowCustomerPicker(false); }}>
                <Text style={styles.dropdownText}>{c.name}</Text>
                <Text style={styles.dropdownSub}>{c.phone}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>

      {/* --- DOKUMENT SPRZEDAŻY (paragon/faktura) --- */}
      <Text style={styles.sectionTitle}>Dokument sprzedaży</Text>
      <Card>
        <View style={styles.docTypeRow}>
          {documentTypeList.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.docTypeBtn, documentType === type && styles.docTypeBtnActive]}
              onPress={() => setDocumentType(type)}
            >
              <Text style={[styles.docTypeText, documentType === type && styles.docTypeTextActive]}>
                {type === DOCUMENT_TYPE.RECEIPT ? '🧾 Paragon' : '📄 Faktura'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pole NIP – widoczne tylko gdy wybrano fakturę */}
        {documentType === DOCUMENT_TYPE.INVOICE && (
          <>
            <Text style={styles.label}>NIP klienta (wymagany dla faktury) *</Text>
            <TextInput
              style={styles.input}
              value={customerNip}
              onChangeText={setCustomerNip}
              placeholder="000-000-00-00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={13}
            />
          </>
        )}
      </Card>

      {/* --- URZĄDZENIE --- */}
      <Text style={styles.sectionTitle}>Urządzenie</Text>
      <Card>
        {/* Dropdown marki */}
        <TouchableOpacity style={styles.picker} onPress={() => setShowBrandPicker(!showBrandPicker)}>
          <Text style={[styles.pickerText, !brand && styles.placeholder]}>
            📱 {selectedBrandLabel}
          </Text>
          <Text style={styles.chevron}>{showBrandPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showBrandPicker && (
          <View style={styles.dropdownList}>
            {brands.map((b) => (
              <TouchableOpacity key={b.value} style={styles.dropdownItem}
                onPress={() => { setBrand(b.value); setShowBrandPicker(false); }}>
                <Text style={styles.dropdownText}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Model</Text>
        <TextInput style={styles.input} value={model} onChangeText={setModel}
          placeholder="np. Galaxy S24, iPhone 15" placeholderTextColor={colors.textSecondary} />

        <Text style={styles.label}>IMEI (opcjonalnie)</Text>
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
      </Card>

      {/* --- BLOKADA EKRANU --- */}
      <Text style={styles.sectionTitle}>Blokada ekranu</Text>
      <Card>
        <Text style={styles.lockHint}>
          🔒 Jeśli klient zostawia telefon z aktywną blokadą, zapisz tutaj wzór/PIN — przyda się serwisantowi do testów po naprawie i pojawi się na potwierdzeniu przyjęcia.
        </Text>
        <Text style={styles.label}>Wzór blokady / PIN</Text>
        <TextInput style={styles.input} value={screenLock} onChangeText={setScreenLock}
          placeholder="np. 1234, lub opis wzoru" placeholderTextColor={colors.textSecondary} />
      </Card>

      {/* --- USTERKA --- */}
      <Text style={styles.sectionTitle}>Usterka</Text>
      <Card>
        {/* Szybki wybór typu usterki */}
        <TouchableOpacity style={styles.picker} onPress={() => setShowFaultPicker(!showFaultPicker)}>
          <Text style={[styles.pickerText, !faultType && styles.placeholder]}>
            🔧 {faultType || 'Typ usterki (opcjonalnie)'}
          </Text>
          <Text style={styles.chevron}>{showFaultPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showFaultPicker && (
          <View style={styles.dropdownList}>
            {faultTypes.map((f) => (
              <TouchableOpacity key={f} style={styles.dropdownItem}
                onPress={() => {
                  setFaultType(f);
                  if (!description) setDescription(f); // wstaw jako opis
                  setShowFaultPicker(false);
                }}>
                <Text style={styles.dropdownText}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Opis usterki *</Text>
        <TextInput style={[styles.input, styles.textarea]} value={description}
          onChangeText={setDescription} placeholder="Opisz problem klienta dokładnie…"
          placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} textAlignVertical="top" />
      </Card>

      {/* --- KOSZTORYS --- */}
      <Text style={styles.sectionTitle}>Wstępny kosztorys</Text>
      <Card>
        <Text style={styles.label}>Cena całości (zł, opcjonalnie)</Text>
        <TextInput
          style={styles.input}
          value={totalCostInput}
          onChangeText={setTotalCostInput}
          placeholder="0.00"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          editable={!(isAdmin && showBreakdown)}
        />

        {/* Tylko admin: opcjonalne rozbicie wewnętrzne do własnych rozliczeń */}
        {isAdmin && (
          <>
            <TouchableOpacity onPress={() => setShowBreakdown(!showBreakdown)} style={{ marginTop: 10 }}>
              <Text style={styles.breakdownToggle}>
                {showBreakdown ? '▲ Zwiń rozbicie wewnętrzne' : '🔍 Rozbij na części/usługę (tylko admin)'}
              </Text>
            </TouchableOpacity>
            {showBreakdown && (
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>Koszt części (zł)</Text>
                  <TextInput style={styles.input} value={partsCost} onChangeText={setPartsCost}
                    placeholder="0.00" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Koszt usługi (zł)</Text>
                  <TextInput style={styles.input} value={serviceCost} onChangeText={setServiceCost}
                    placeholder="0.00" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" />
                </View>
              </View>
            )}
          </>
        )}
      </Card>

      {/* --- ZDJĘCIA --- */}
      <Text style={styles.sectionTitle}>Zdjęcia ({photos.length}/5)</Text>
      <Card>
        <Button label="📷 Dodaj zdjęcia z galerii" variant="ghost" onPress={pickImages} />
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoWrap}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(index)}>
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </Card>

      {/* Przyciski */}
      <Button label="💾 Zapisz zlecenie" onPress={handleSubmit} loading={loading} style={styles.saveBtn} />
      <Button label="Anuluj" variant="ghost" onPress={() => navigation.goBack()} style={styles.cancelBtn} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  lockHint:     { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 4 },
  docTypeRow:      { flexDirection: 'row', gap: 10 },
  docTypeBtn:      { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  docTypeBtnActive:{ backgroundColor: colors.accent, borderColor: colors.accent },
  docTypeText:     { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  docTypeTextActive: { color: '#fff' },
  label:        { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input:        { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.textPrimary },
  textarea:     { height: 100 },
  picker:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 },
  pickerText:   { fontSize: 15, color: colors.textPrimary, flex: 1 },
  placeholder:  { color: colors.textSecondary },
  chevron:      { fontSize: 12, color: colors.textSecondary },
  dropdownList: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.divider },
  addCustomerBtn:  { paddingVertical: 12, paddingHorizontal: 4, backgroundColor: colors.accent + '12', borderRadius: 8, marginBottom: 4 },
  addCustomerText: { fontSize: 14, fontWeight: '700', color: colors.accent, textAlign: 'center' },
  breakdownToggle: { fontSize: 13, fontWeight: '600', color: colors.accent, textAlign: 'center' },
  imeiRow:     { flexDirection: 'row', alignItems: 'center' },
  scanBtn:     { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, justifyContent: 'center' },
  scanBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  newCustomerForm: { padding: 10, backgroundColor: colors.background, borderRadius: 8, marginBottom: 8 },
  walkInHint:      { fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginTop: 10 },
  dropdownText: { fontSize: 14, color: colors.textPrimary },
  dropdownSub:  { fontSize: 12, color: colors.textSecondary },
  row:          { flexDirection: 'row', gap: 12 },
  half:         { flex: 1 },
  total:        { fontSize: 15, fontWeight: '700', color: colors.primary, textAlign: 'right', marginTop: 12 },
  photoRow:     { marginTop: 12 },
  photoWrap:    { position: 'relative', marginRight: 10 },
  photo:        { width: 80, height: 80, borderRadius: 8 },
  photoRemove:  { position: 'absolute', top: -6, right: -6, backgroundColor: colors.danger, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  saveBtn:      { marginTop: 24 },
  cancelBtn:    { marginTop: 8 },
});

export default AddRepairScreen;
