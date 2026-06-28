// ============================================================
//  BookingRequestScreen.jsx – klient składa wniosek o naprawę
//  Wybiera datę z kalendarza + markę + model + opis usterki
// ============================================================

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import useStore  from '../store/useStore';
import Button    from '../components/Button';
import Card      from '../components/Card';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import brands    from '../constants/brands';

// Generuje 14 kolejnych dni od dziś (do wyboru terminu)
const generateDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    // Pomiń niedzielę (0)
    if (d.getDay() !== 0) {
      days.push(d);
    }
  }
  return days;
};

const DAY_NAMES = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const MONTH_NAMES = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'];

const BookingRequestScreen = ({ navigation }) => {
  const currentUser = useStore((s) => s.currentUser);
  const addBooking  = useStore((s) => s.addBooking);

  const [brand,         setBrand]         = useState('');
  const [model,         setModel]         = useState('');
  const [description,   setDescription]   = useState('');
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [showBrand,     setShowBrand]     = useState(false);
  const [loading,       setLoading]       = useState(false);

  const days = generateDays();
  const selectedBrandLabel = brands.find(b => b.value === brand)?.label || 'Wybierz markę…';

  const handleSubmit = () => {
    if (!brand)              { Alert.alert('Błąd', 'Wybierz markę urządzenia.'); return; }
    if (!model.trim())       { Alert.alert('Błąd', 'Podaj model urządzenia.');   return; }
    if (!description.trim()) { Alert.alert('Błąd', 'Opisz usterkę.');            return; }
    if (!selectedDate)       { Alert.alert('Błąd', 'Wybierz preferowany termin.'); return; }

    setLoading(true);
    setTimeout(() => {
      addBooking({
        customerId:    currentUser.id,
        brand,
        model:         model.trim(),
        description:   description.trim(),
        preferredDate: selectedDate.toISOString(),
      });
      setLoading(false);
      Alert.alert(
        '✅ Termin zarezerwowany!',
        'Serwis wkrótce się odezwie z potwierdzeniem. Zobaczysz powiadomienie w zakładce „Moje terminy".',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, 300);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* INFO */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📅 Jak to działa?</Text>
        <Text style={styles.infoText}>
          Wybierz preferowany termin i opisz usterkę. Serwis potwierdzi datę, poda cenę i przydzieli pracownika.
        </Text>
      </View>

      {/* URZĄDZENIE */}
      <Text style={styles.section}>Urządzenie</Text>
      <Card>
        {/* Dropdown marki */}
        <TouchableOpacity style={styles.pickerRow} onPress={() => setShowBrand(!showBrand)}>
          <Text style={[styles.pickerText, !brand && styles.placeholder]}>
            📱 {selectedBrandLabel}
          </Text>
          <Text style={styles.chevron}>{showBrand ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showBrand && (
          <View style={styles.dropdown}>
            {brands.map(b => (
              <TouchableOpacity key={b.value} style={styles.dropItem}
                onPress={() => { setBrand(b.value); setShowBrand(false); }}>
                <Text style={styles.dropText}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Model</Text>
        <TextInput style={styles.input} value={model} onChangeText={setModel}
          placeholder="np. iPhone 13, Galaxy S23" placeholderTextColor={colors.textSecondary} />
      </Card>

      {/* OPIS USTERKI */}
      <Text style={styles.section}>Opis usterki</Text>
      <Card>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Opisz dokładnie co się dzieje z Twoim urządzeniem…&#10;np. Bateria rozładowuje się w ciągu 3 godzin, chciałbym wymianę."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </Card>

      {/* WYBÓR TERMINU */}
      <Text style={styles.section}>Preferowany termin</Text>
      <Card>
        <Text style={styles.calendarHint}>Wybierz dzień (poniedziałek – sobota):</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarRow}>
          {days.map((day, i) => {
            const isSelected = selectedDate?.toDateString() === day.toDateString();
            const isSaturday = day.getDay() === 6;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayBox,
                  isSelected && styles.dayBoxSelected,
                  isSaturday && styles.dayBoxSaturday,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>
                  {DAY_NAMES[day.getDay()]}
                </Text>
                <Text style={[styles.dayNum, isSelected && styles.dayTextSelected]}>
                  {day.getDate()}
                </Text>
                <Text style={[styles.dayMonth, isSelected && styles.dayTextSelected]}>
                  {MONTH_NAMES[day.getMonth()]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedDate && (
          <View style={styles.selectedDateBox}>
            <Text style={styles.selectedDateText}>
              ✅ Wybrany termin:{' '}
              <Text style={{ fontWeight: '700' }}>
                {DAY_NAMES[selectedDate.getDay()]}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
            </Text>
          </View>
        )}
      </Card>

      <Button
        label="📅 Umów termin"
        onPress={handleSubmit}
        loading={loading}
        style={{ marginTop: 16 }}
      />
      <Button
        label="Anuluj"
        variant="ghost"
        onPress={() => navigation.goBack()}
        style={{ marginTop: 8, marginBottom: 32 }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: 16 },
  infoBox:         { backgroundColor: colors.accent + '15', borderRadius: 12, padding: 16, marginBottom: 4 },
  infoTitle:       { fontSize: 14, fontWeight: '700', color: colors.accent, marginBottom: 6 },
  infoText:        { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
  section:         { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  label:           { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 12 },
  input:           { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15, color: colors.textPrimary },
  textarea:        { height: 120 },
  pickerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  pickerText:      { fontSize: 15, color: colors.textPrimary, flex: 1 },
  placeholder:     { color: colors.textSecondary },
  chevron:         { fontSize: 12, color: colors.textSecondary },
  dropdown:        { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6 },
  dropItem:        { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.divider },
  dropText:        { fontSize: 14, color: colors.textPrimary },
  calendarHint:    { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  calendarRow:     { flexDirection: 'row' },
  dayBox:          { alignItems: 'center', padding: 10, marginRight: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, minWidth: 52 },
  dayBoxSelected:  { backgroundColor: colors.accent, borderColor: colors.accent },
  dayBoxSaturday:  { borderColor: colors.warning + '80' },
  dayName:         { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  dayNum:          { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginVertical: 2 },
  dayMonth:        { fontSize: 11, color: colors.textSecondary },
  dayTextSelected: { color: '#fff' },
  selectedDateBox: { marginTop: 14, padding: 12, backgroundColor: colors.success + '15', borderRadius: 8 },
  selectedDateText:{ fontSize: 13, color: colors.textPrimary },
});

export default BookingRequestScreen;
