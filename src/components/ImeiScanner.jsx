// ============================================================
//  ImeiScanner.jsx – skaner kodów kreskowych/QR dla IMEI
//  Używa expo-camera z funkcją skanowania
//  Instalacja: npx expo install expo-camera
// ============================================================

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useColors } from '../constants/ThemeContext';

const ImeiScanner = ({ onScanned, onClose }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Poproś o uprawnienia jeśli brak
  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.permBox}>
        <Text style={styles.permText}>Potrzebny dostęp do aparatu aby skanować IMEI</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Zezwól na dostęp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Anuluj</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    // Sprawdź czy zeskanowany kod wygląda jak IMEI (15 cyfr)
    const cleaned = data.replace(/\D/g, '');
    if (cleaned.length === 15) {
      onScanned(cleaned);
    } else if (data.length > 5) {
      // Może być inny kod – zapytaj czy użyć
      Alert.alert(
        'Zeskanowano kod',
        `Zeskanowana wartość:\n${data}\n\nCzy użyć jako IMEI?`,
        [
          { text: 'Tak', onPress: () => onScanned(data) },
          { text: 'Skanuj ponownie', onPress: () => setScanned(false) },
          { text: 'Anuluj', style: 'cancel', onPress: onClose },
        ]
      );
    } else {
      Alert.alert('Błąd', 'Nie rozpoznano kodu IMEI. Spróbuj ponownie.', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13', 'code39'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Ramka celownika */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scanBox}>
              {/* Narożniki ramki */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Text style={styles.scanHint}>Skieruj aparat na kod kreskowy IMEI</Text>
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>✕ Anuluj skanowanie</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
};

// Wrapper jako modal – wygodniejszy w użyciu
export const ImeaScannerModal = ({ visible, onScanned, onClose }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <ImeiScanner onScanned={(imei) => { onScanned(imei); onClose(); }} onClose={onClose} />
  </Modal>
);

const OVERLAY_COLOR = 'rgba(0,0,0,0.6)';
const CORNER_SIZE   = 22;
const CORNER_WIDTH  = 3;
const ACCENT        = '#6465FF'; // lightColors.accent – skaner jest zawsze na czarnym tle kamery

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  camera:       { flex: 1 },
  overlay:      { flex: 1 },
  topOverlay:   { flex: 1, backgroundColor: OVERLAY_COLOR },
  middleRow:    { flexDirection: 'row', height: 220 },
  sideOverlay:  { flex: 1, backgroundColor: OVERLAY_COLOR },
  scanBox:      { width: 260, height: 220, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 12 },
  bottomOverlay:{ flex: 1, backgroundColor: OVERLAY_COLOR, alignItems: 'center', justifyContent: 'center' },
  scanHint:     { color: '#fff', fontSize: 13, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  cancelBtn:    { paddingHorizontal: 24, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 30 },
  cancelBtnText:{ color: '#fff', fontSize: 16, fontWeight: '600' },
  // Narożniki ramki
  corner:       { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: ACCENT },
  cornerTL:     { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR:     { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL:     { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR:     { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  // Blok uprawnień
  permBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F7F7F7' },
  permText:     { fontSize: 16, color: '#1A1A2E', textAlign: 'center', marginBottom: 20 },
  permBtn:      { backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14, marginBottom: 12 },
  permBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeBtn:     { paddingVertical: 10 },
  closeBtnText: { color: '#6B7280', fontSize: 14 },
});

export default ImeiScanner;
