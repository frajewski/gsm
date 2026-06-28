// ============================================================
//  mockDb.js – symulowana baza danych aplikacji GSM Service
//  W prawdziwej aplikacji zastąp to połączeniem z Firebase / REST API
//  Wszystkie operacje CRUD działają na tych tablicach w pamięci
// ============================================================

import { STATUS } from '../constants/statuses';
import { ROLES } from '../constants/roles';
import { BOOKING_STATUS } from '../constants/bookingStatuses';

// --- USERS ---
/** @type {import('../types').User[]} */
export let users = [
  // Przykładowi klienci "papierowi" – dane testowe do listy klientów (Nowe zlecenie, Karta klienta).
  // isWalkIn: true oznacza że to NIE są prawdziwe konta z logowaniem – nikt nie może się nimi zalogować.
  // Jeśli realny klient o tym samym emailu zarejestruje się sam, te dane zostaną automatycznie scalone.
  {
    id: 'u2',
    role: ROLES.CUSTOMER,
    name: 'Anna Nowak',
    phone: '+48601234567',
    email: 'anna@example.com',
    password: null,
    approved: true,
    isWalkIn: true,
  },
  {
    id: 'u3',
    role: ROLES.CUSTOMER,
    name: 'Piotr Wiśniewski',
    phone: '+48781999888',
    email: 'piotr@example.com',
    password: null,
    approved: true,
    isWalkIn: true,
  },
  {
    id: 'u4',
    role: ROLES.CUSTOMER,
    name: 'Karolina Zając',
    phone: '+48512345678',
    email: 'karolina@example.com',
    password: null,
    approved: true,
    isWalkIn: true,
  },
];

// Czy w systemie istnieje już jakiekolwiek konto z rolą Admin?
// Używane przy rejestracji: pierwsza osoba, która się zarejestruje w świeżo
// zainstalowanej apce (np. nowy serwis kupujący tę aplikację) automatycznie
// staje się jej właścicielem/adminem – nie trzeba już edytować kodu i robić
// nowego builda dla każdego nowego serwisu wdrażającego tę apkę.
export const adminAlreadyExists = () =>
  users.some((u) => u.role === ROLES.ADMIN);

// --- BOOKING REQUESTS (wnioski klientów o naprawę) ---
/**
 * @typedef {Object} BookingRequest
 * @property {string}      id
 * @property {string}      customerId
 * @property {string}      brand
 * @property {string}      model
 * @property {string}      description
 * @property {string}      preferredDate     // ISO date string
 * @property {string}      status            // BOOKING_STATUS
 * @property {string|null} adminNote         // odpowiedź admina
 * @property {string|null} proposedDate      // alternatywny termin od admina
 * @property {number}      estimatedPrice    // wycena admina
 * @property {string|null} assignedWorkerId  // przypisany pracownik
 * @property {string|null} linkedRepairId    // ID naprawy po konwersji
 * @property {string}      createdAt
 */
/** @type {BookingRequest[]} */
export let bookingRequests = [];

// --- REPAIRS ---
// Pusta tablica – zlecenia dodawane są przez formularz w aplikacji

/** @type {import('../types').Repair[]} */
export let repairs = [];


// ============================================================
//  Pomocnicze funkcje CRUD operujące na powyższych tablicach
//  W Zustand store importujesz te funkcje i wyświetlasz wyniki
// ============================================================

// Zwróć użytkownika po ID
export const getUserById = (id) =>
  users.find((u) => u.id === id) || null;

// Zwróć wszystkie naprawy danego klienta
export const getRepairsByCustomer = (customerId) =>
  repairs.filter((r) => r.customerId === customerId);

// Zwróć naprawę po ID
export const getRepairById = (id) =>
  repairs.find((r) => r.id === id) || null;

// Generuje kolejny czytelny numer zlecenia w formacie "N/ROK" (np. "1/2026", "2/2026").
// Liczy ile zleceń ZOSTAŁO JUŻ przyjętych w danym roku i dodaje 1 – więc numeracja
// resetuje się automatycznie na początku każdego roku kalendarzowego.
const generateDisplayNumber = () => {
  const year = new Date().getFullYear();
  const countThisYear = repairs.filter((r) => {
    const repairYear = new Date(r.createdAt).getFullYear();
    return repairYear === year;
  }).length;
  return `${countThisYear + 1}/${year}`;
};

// Dodaj nową naprawę – `id` to wewnętrzny unikalny identyfikator (techniczny,
// używany do wszystkich referencji w systemie), `displayNumber` to czytelny
// numer widoczny dla użytkownika (np. na liście zleceń, wydrukach) w formacie "N/ROK"
export const addRepair = (repairData) => {
  const newRepair = {
    ...repairData,
    id: `r${Date.now()}`,                   // unikalny ID techniczny – NIE pokazuj go użytkownikowi
    displayNumber: generateDisplayNumber(),  // czytelny numer, np. "1/2026"
    createdAt: new Date().toISOString(),
    history: [
      { date: new Date().toISOString(), status: STATUS.ACCEPTED },
    ],
  };
  repairs.push(newRepair);
  return newRepair;
};

// Zaktualizuj pole(a) naprawy + dodaj wpis do historii jeśli zmienił się status
export const updateRepair = (id, changes) => {
  const index = repairs.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const current = repairs[index];
  const updated = { ...current, ...changes };

  // Jeśli status się zmienił – dołącz wpis do historii
  if (changes.status && changes.status !== current.status) {
    updated.history = [
      ...current.history,
      { date: new Date().toISOString(), status: changes.status },
    ];
  }

  repairs[index] = updated;
  return updated;
};

// Dodaj nowego użytkownika (rejestracja)
export const addUser = (userData) => {
  const newUser = { ...userData, id: `u${Date.now()}` };
  users.push(newUser);
  return newUser;
};

// --- PHONES (SKUP/SPRZEDAŻ) ---
// Tablica telefonów skupionych – pusta na start, wypełniana przez formularz

/**
 * @typedef {Object} Phone
 * @property {string}  id
 * @property {string}  brand           // marka (z brands.js)
 * @property {string}  model           // model
 * @property {string}  imei            // numer IMEI
 * @property {string}  color           // kolor
 * @property {string}  grade           // stan wizualny: A/B/C/D
 * @property {string}  source          // skąd zakupiony (tradeSources.js)
 * @property {string}  sourceNote      // opcjonalna notatka (np. nick OLX)
 * @property {number}  buyPrice        // cena zakupu w PLN
 * @property {number}  sellPrice       // cena sprzedaży (0 = niesprzedany)
 * @property {string}  status          // TRADE_STATUS
 * @property {string}  boughtAt        // data zakupu ISO
 * @property {string|null} soldAt      // data sprzedaży ISO lub null
 * @property {boolean} hasIcloudLock   // blokada iCloud
 * @property {boolean} hasCarrierLock  // simlock operatora
 * @property {boolean} isReported      // zastrzeżony/kradziony
 * @property {string}  lockNotes       // notatki o blokadach
 * @property {string|null} linkedRepairId  // powiązane zlecenie naprawy
 * @property {string}  notes           // ogólne notatki
 */

/** @type {Phone[]} */
export let phones = [];

// --- CRUD dla phones ---

export const getPhoneById = (id) =>
  phones.find((p) => p.id === id) || null;

export const addPhone = (data) => {
  const newPhone = {
    ...data,
    id: `ph${Date.now()}`,
    boughtAt: new Date().toISOString(),
    soldAt: null,
    sellPrice: data.sellPrice || 0,
    linkedRepairId: data.linkedRepairId || null,
  };
  phones.push(newPhone);
  return newPhone;
};

export const updatePhone = (id, changes) => {
  const index = phones.findIndex((p) => p.id === id);
  if (index === -1) return null;
  // Jeśli zmieniono status na Sprzedany – zapisz datę sprzedaży
  if (changes.status === 'Sprzedany' && !phones[index].soldAt) {
    changes.soldAt = new Date().toISOString();
  }
  phones[index] = { ...phones[index], ...changes };
  return phones[index];
};

export const deletePhone = (id) => {
  const index = phones.findIndex((p) => p.id === id);
  if (index === -1) return false;
  phones.splice(index, 1);
  return true;
};

// --- CRUD dla bookingRequests ---

export const getBookingById = (id) =>
  bookingRequests.find((b) => b.id === id) || null;

export const getBookingsByCustomer = (customerId) =>
  bookingRequests.filter((b) => b.customerId === customerId);

export const addBookingRequest = (data) => {
  const newBooking = {
    ...data,
    id: `bk${Date.now()}`,
    status: BOOKING_STATUS.PENDING,
    adminNote: null,
    proposedDate: null,
    estimatedPrice: 0,
    assignedWorkerId: null,
    linkedRepairId: null,
    createdAt: new Date().toISOString(),
  };
  bookingRequests.push(newBooking);
  return newBooking;
};

export const updateBookingRequest = (id, changes) => {
  const index = bookingRequests.findIndex((b) => b.id === id);
  if (index === -1) return null;
  bookingRequests[index] = { ...bookingRequests[index], ...changes };
  return bookingRequests[index];
};

// Zaktualizuj rolę użytkownika (tylko admin)
export const updateUserRole = (userId, newRole) => {
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return null;
  users[index] = { ...users[index], role: newRole };
  return users[index];
};

// Dodaj klienta "papierowego" przez serwisanta/admina – bez konta Firebase.
// Klient nie loguje się do apki, ale serwisant może przypisywać mu zlecenia.
// ID generowane lokalnie (prefiks "walkin_" odróżnia od Firebase UID).
// Jeśli klient później zarejestruje się sam z tym samym emailem, te dwa
// profile NIE łączą się automatycznie – to ograniczenie obecnej wersji.
export const addWalkInCustomer = ({ name, phone, email }) => {
  const newCustomer = {
    id: `walkin_${Date.now()}`,
    role: 'customer',
    name,
    phone: phone || '',
    email: email || '',
    password: null,
    approved: true,
    isWalkIn: true, // oznaczenie że konto nie ma logowania
  };
  users.push(newCustomer);
  return newCustomer;
};

// ============================================================
//  ŁĄCZENIE KONT WALK-IN Z FIREBASE
//  Gdy klient "papierowy" (dodany ręcznie przez admina, ID: walkin_xxx)
//  rejestruje się sam przez Firebase, ten profil "przejmuje" jego stare
//  ID i historię (zlecenia, wnioski) – zamiast tworzyć drugi, osobny rekord.
// ============================================================

// Znajdź profil walk-in po adresie email (case-insensitive)
export const findWalkInByEmail = (email) => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return users.find(
    (u) => u.isWalkIn && u.email && u.email.toLowerCase() === normalized
  ) || null;
};

// Scal profil walk-in z nowym kontem Firebase:
// - usuwa stary rekord walk-in z `users`
// - przepisuje WSZYSTKIE referencje (repairs, bookingRequests, phones) na nowy Firebase UID
// - rola: jeśli osoba rejestrująca się WYBRAŁA rolę (np. "worker" w formularzu rejestracji),
//   ta rola ma priorytet nad rolą "customer" zapisaną w starym profilu walk-in.
//   Bez tego każdy admin/pracownik, który przypadkiem ma ten sam email co klient
//   "papierowy" dodany wcześniej, zostałby z powrotem zdegradowany do klienta.
export const mergeWalkInIntoFirebaseAccount = (walkInProfile, firebaseUid, intendedRole = null) => {
  const oldId = walkInProfile.id;

  // Przepisz zlecenia naprawy
  repairs.forEach((r) => {
    if (r.customerId === oldId) r.customerId = firebaseUid;
  });

  // Przepisz wnioski o rezerwację
  bookingRequests.forEach((b) => {
    if (b.customerId === oldId) b.customerId = firebaseUid;
  });

  // Przepisz powiązania w skupie telefonów (jeśli walk-in miał powiązaną naprawę)
  phones.forEach((p) => {
    if (p.customerId === oldId) p.customerId = firebaseUid;
  });

  // Usuń stary rekord walk-in z listy użytkowników
  const index = users.findIndex((u) => u.id === oldId);
  if (index !== -1) users.splice(index, 1);

  // Stwórz nowy profil pod Firebase UID, zachowując dane (imię, telefon) ze starego konta.
  // Rola: jawnie żądana rola wygrywa, inaczej zostaje rola ze starego profilu walk-in (zawsze "customer")
  const mergedProfile = {
    ...walkInProfile,
    id: firebaseUid,
    role: intendedRole || walkInProfile.role,
    isWalkIn: false,    // to już prawdziwe konto z logowaniem
    password: null,
  };
  users.push(mergedProfile);

  return mergedProfile;
};
