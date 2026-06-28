// ============================================================
//  smsService.js – wysyłanie SMS-ów przez natywną aplikację telefonu
//  Korzysta z expo-sms (dedykowany moduł Expo do otwierania systemowego
//  okna wysyłania SMS) – działa spójnie na różnych telefonach Android,
//  w przeciwieństwie do ręcznego budowania URL ze schematem "sms:",
//  które na części urządzeń (np. niektórych Samsungach) zwraca błędnie
//  "brak aplikacji SMS" mimo że aplikacja SMS jest obecna i sprawna.
//  Nie wymaga żadnego backendu ani klucza API!
// ============================================================

import * as SMS from 'expo-sms';
import { Alert } from 'react-native';

// Otwórz aplikację SMS z wypełnionym numerem i treścią
const openSMS = async (phone, body) => {
  const isAvailable = await SMS.isAvailableAsync();
  if (isAvailable) {
    await SMS.sendSMSAsync([phone], body);
  } else {
    Alert.alert(
      'Brak aplikacji SMS',
      'Nie można otworzyć aplikacji wiadomości na tym urządzeniu.',
      [{ text: 'OK' }]
    );
  }
};

// ---- SZABLONY WIADOMOŚCI ----

// Przyjęcie urządzenia do serwisu
export const smsSend_Accepted = (repair, customerName) => {
  const body = `Dzień dobry ${customerName}! Przyjęliśmy Państwa urządzenie (${repair.brand} ${repair.model}) do serwisu. Numer zlecenia: ${repair.displayNumber || repair.id}. Poinformujemy o postępach naprawy. GSM Serwis`;
  return openSMS(repair.customerPhone, body);
};

// Informacja że kosztorys jest gotowy
export const smsSend_Estimate = (repair, customerPhone, customerName) => {
  const total = (repair.partsCost || 0) + (repair.serviceCost || 0);
  const body = `Dzień dobry ${customerName}! Kosztorys naprawy Państwa urządzenia ${repair.brand} ${repair.model}: ${total} zł. Prosimy o akceptację lub kontakt. GSM Serwis`;
  return openSMS(customerPhone, body);
};

// Urządzenie gotowe do odbioru
export const smsSend_Ready = (repair, customerPhone, customerName) => {
  const body = `Dzień dobry ${customerName}! Urządzenie ${repair.brand} ${repair.model} jest gotowe do odbioru. Zapraszamy pn-pt 9-18, sb 9-14. GSM Serwis, ul. Przykładowa 1, Płońsk`;
  return openSMS(customerPhone, body);
};

// Zlecenie anulowane
export const smsSend_Cancelled = (repair, customerPhone, customerName) => {
  const body = `Dzień dobry ${customerName}. Informujemy, że zlecenie naprawy ${repair.brand} ${repair.model} zostało anulowane. Urządzenie czeka na odbiór w serwisie. GSM Serwis`;
  return openSMS(customerPhone, body);
};

// Dowolna wiadomość własna
export const smsSend_Custom = (phone, body) => openSMS(phone, body);

// Gotowe szablony do wyświetlenia w interfejsie (lista do wyboru)
export const smsTemplates = (repair, customerName) => [
  {
    id: 'accepted',
    label: '📥 Przyjęcie do serwisu',
    body: `Dzień dobry ${customerName}! Przyjęliśmy ${repair.brand} ${repair.model} do serwisu (nr: ${repair.displayNumber || repair.id}). GSM Serwis`,
  },
  {
    id: 'estimate',
    label: '💰 Kosztorys gotowy',
    body: `Dzień dobry ${customerName}! Kosztorys: ${(repair.partsCost || 0) + (repair.serviceCost || 0)} zł. Prosimy o decyzję. GSM Serwis`,
  },
  {
    id: 'ready',
    label: '✅ Gotowe do odbioru',
    body: `Dzień dobry ${customerName}! Urządzenie ${repair.brand} ${repair.model} jest gotowe. Zapraszamy. GSM Serwis`,
  },
  {
    id: 'delay',
    label: '⏳ Opóźnienie naprawy',
    body: `Dzień dobry ${customerName}. Naprawa ${repair.brand} ${repair.model} wymaga więcej czasu. Przepraszamy za opóźnienie. Skontaktujemy się. GSM Serwis`,
  },
  {
    id: 'cancelled',
    label: '❌ Anulowanie zlecenia',
    body: `Dzień dobry ${customerName}. Zlecenie ${repair.brand} ${repair.model} zostało anulowane. Zapraszamy po odbiór. GSM Serwis`,
  },
];
