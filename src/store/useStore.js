// ============================================================
//  useStore.js – globalny stan aplikacji (Zustand)
//  WERSJA FIRESTORE z REAL-TIME LISTENERAMI (onSnapshot)
//
//  Zmiana względem wersji mockDb.js:
//  - repairs/phones/bookings NIE są już ręcznie synchronizowane po każdej
//    operacji (dbAdd.../dbUpdate...) – subscribeToX nasłuchuje Firestore
//    bezpośrednio i AUTOMATYCZNIE aktualizuje stan przy KAŻDEJ zmianie,
//    niezależnie skąd pochodzi (ta apka, panel webowy, inny pracownik).
//  - Subskrypcje startują w startListening() (wywołane raz po zalogowaniu,
//    patrz App.js) i są zatrzymywane w stopListening() (przy wylogowaniu)
//    – to zapobiega memory leakom i niepotrzebnym odczytom w tle.
//  - addRepair/updateRepair/etc. nadal istnieją z tymi samymi nazwami i
//    zwracają Promise – ale NIE aktualizują już ręcznie stanu przez set(),
//    bo listener zrobi to sam, gdy Firestore potwierdzi zapis.
// ============================================================

import { create } from 'zustand';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import {
  subscribeToUsers,
  updateUserRole as dbUpdateUserRole,
  addWalkInCustomer as dbAddWalkInCustomer,
  mergeWalkInIntoFirebaseAccount,
  addRepair as dbAddRepair, updateRepair as dbUpdateRepair,
  subscribeToRepairs,
  addPhone as dbAddPhone, updatePhone as dbUpdatePhone, deletePhone as dbDeletePhone,
  subscribeToPhones,
  addBookingRequest as dbAddBooking, updateBookingRequest as dbUpdateBooking,
  subscribeToBookings,
} from '../firebase/firestoreDb';
import { ROLES } from '../constants/roles';
import { BOOKING_STATUS } from '../constants/bookingStatuses';
import STATUS from '../constants/statuses';
import { firebaseLogin, firebaseRegister, firebaseLogout } from '../firebase/firebaseAuthService';
import { getProfileByUid, createLocalProfile } from '../firebase/userProfileService';
import { app } from '../firebase/firebaseConfig';

const functions = getFunctions(app);
const decideInitialRoleFn = httpsCallable(functions, 'decideInitialRole');
const setUserRoleClaimFn  = httpsCallable(functions, 'setUserRoleClaim');
const syncOwnRoleClaimFn  = httpsCallable(functions, 'syncOwnRoleClaim');

// Wymusza odświeżenie tokenu JWT bieżącego użytkownika – NIEZBĘDNE po każdej
// zmianie custom claims (decideInitialRole/setUserRoleClaim), inaczej klient
// nadal widzi STARĄ rolę w request.auth.token w firestore.rules, mimo że
// Cloud Function już zaktualizowała claim po stronie Firebase Auth.
const refreshToken = async () => {
  const user = getAuth(app).currentUser;
  if (user) await user.getIdToken(true);
};

// Uchwyty na aktywne subskrypcje (poza stanem Zustand – to nie dane do renderowania,
// tylko funkcje do późniejszego odpięcia się od Firestore)
let unsubUsers    = null;
let unsubRepairs  = null;
let unsubPhones   = null;
let unsubBookings = null;

const useStore = create((set, get) => ({

  // ── AUTENTYKACJA (Firebase) ───────────────────────────────

  currentUser: null,
  authLoading: false,
  _registering: false,

  login: async (email, password) => {
    set({ authLoading: true });
    const result = await firebaseLogin(email, password);
    if (!result.success) {
      set({ authLoading: false });
      return { success: false, error: result.error };
    }
    let profile = await getProfileByUid(result.user.uid);

    if (profile) {
      // Profil już istnieje w Firestore – upewnij się że token ma custom claim
      // zgodny z aktualną rolą zapisaną w bazie. Bez tego kroku token może
      // pamiętać STARĄ rolę (np. z czasu przed wprowadzeniem custom claims,
      // albo jeśli rola była zmieniona ręcznie w konsoli Firebase), a wtedy
      // firestore.rules odmawiają dostępu mimo że profil mówi co innego.
      await syncOwnRoleClaimFn();
      await refreshToken();
      profile = await getProfileByUid(result.user.uid); // odśwież po sync, na wszelki wypadek
    } else {
      // Stara sesja Firebase bez profilu w Firestore (np. środowisko testowe
      // wyczyszczone niezależnie od Firebase Auth) – zdecyduj rolę tak samo
      // bezpiecznie jak przy normalnej rejestracji
      const { data } = await decideInitialRoleFn();
      await refreshToken();
      profile = await createLocalProfile({
        uid: result.user.uid,
        name: result.user.displayName || email.split('@')[0],
        email: result.user.email,
        role: data.role,
      });
    }
    set({ currentUser: profile, authLoading: false });
    get().startListening();
    return { success: true, user: profile };
  },

  logout: async () => {
    get().stopListening();
    await firebaseLogout();
    set({ currentUser: null, repairs: [], phones: [], bookings: [] });
  },

  register: async (userData) => {
    set({ authLoading: true, _registering: true });
    const result = await firebaseRegister(userData.email, userData.password, userData.name);
    if (!result.success) {
      set({ authLoading: false, _registering: false });
      return { success: false, error: result.error };
    }

    // Rola decydowana bezpiecznie przez Cloud Function (patrz functions/index.js) –
    // klient nigdy nie ma możliwości samodzielnie ustawić sobie roli "admin"
    const { data } = await decideInitialRoleFn();
    await refreshToken();
    const profile = await createLocalProfile({
      uid:   result.user.uid,
      name:  userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role:  data.role,
    });

    set({ currentUser: profile, authLoading: false, _registering: false });
    get().startListening();
    return { success: true, user: profile, becameAdmin: data.role === ROLES.ADMIN };
  },

  restoreSession: async (firebaseUser) => {
    if (get()._registering) return;
    if (!firebaseUser) { set({ currentUser: null }); return; }

    let profile = await getProfileByUid(firebaseUser.uid);

    if (profile) {
      // Konto już istniało w Firestore – upewnij się że ma custom claim
      // zgodny z jego rolą (potrzebne dla kont stworzonych przed wprowadzeniem
      // custom claims; dla kont nowszych to po prostu nieszkodliwa, szybka
      // operacja potwierdzająca, że claim się zgadza)
      await syncOwnRoleClaimFn();
      await refreshToken();
    }

    if (!profile) {
      const { data } = await decideInitialRoleFn();
      await refreshToken();
      profile = await createLocalProfile({
        uid:   firebaseUser.uid,
        name:  firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Użytkownik',
        email: firebaseUser.email,
        role:  data.role,
      });
    }

    set({ currentUser: profile });
    get().startListening();
  },

  // ── REAL-TIME LISTENERY ───────────────────────────────────
  // Wywoływane raz po ustaleniu currentUser (login/register/restoreSession).
  // Bezpieczne wywołać wielokrotnie – najpierw odpina starą subskrypcję.

  startListening: () => {
    const user = get().currentUser;
    get().stopListening(); // odepnij stare listenery, jeśli istniały (np. zmiana użytkownika)

    const isStaff = user?.role === ROLES.ADMIN || user?.role === ROLES.WORKER;

    unsubUsers    = subscribeToUsers((users) => set({ users }));
    unsubRepairs  = subscribeToRepairs(user, (repairs) => set({ repairs }));
    unsubBookings = subscribeToBookings(user, (bookings) => set({ bookings }));

    // Subskrybuj phones TYLKO dla personelu – firestore.rules i tak odmawia
    // dostępu klientowi (allow read: if isStaff()), więc subskrybowanie tego
    // dla roli customer gwarantowanie produkuje błąd permission-denied
    // w konsoli, mimo że nic w apce z tego nie korzysta dla klienta.
    if (isStaff) {
      unsubPhones = subscribeToPhones((phones) => set({ phones }));
    } else {
      set({ phones: [] });
    }
  },

  stopListening: () => {
    unsubUsers?.();
    unsubRepairs?.();
    unsubPhones?.();
    unsubBookings?.();
    unsubUsers = unsubRepairs = unsubPhones = unsubBookings = null;
  },

  // ── POMOCNIKI RÓL ─────────────────────────────────────────

  isAdmin:    () => get().currentUser?.role === ROLES.ADMIN,
  isWorker:   () => [ROLES.ADMIN, ROLES.WORKER].includes(get().currentUser?.role),
  isCustomer: () => get().currentUser?.role === ROLES.CUSTOMER,

  // ── NAPRAWY ───────────────────────────────────────────────
  // repairs jest teraz AUTOMATYCZNIE aktualizowane przez subscribeToRepairs –
  // addRepair/updateRepair tylko wysyłają zmianę do Firestore, nie modyfikują
  // stanu ręcznie (listener zrobi to, gdy Firestore potwierdzi zapis)

  repairs: [],

  addRepair: async (data) => dbAddRepair(data),
  updateRepair: async (id, changes) => dbUpdateRepair(id, changes),

  // getVisibleRepairs zostaje dla wstecznej kompatybilności z ekranami,
  // ale teraz repairs w stanie JEST JUŻ przefiltrowane przez subscribeToRepairs
  // (rola customer dostaje tylko swoje od razu z Firestore query) – ta funkcja
  // po prostu zwraca aktualny stan, synchronicznie
  getVisibleRepairs: () => get().repairs,

  getRepairById: (id) => get().repairs.find((r) => r.id === id) || null,
  getRepairsByCustomer: (id) => get().repairs.filter((r) => r.customerId === id),

  // ── UŻYTKOWNICY ───────────────────────────────────────────
  // users jest teraz AUTOMATYCZNIE aktualizowane przez subscribeToUsers –
  // wszystkie poniższe funkcje są SYNCHRONICZNE, czytają z lokalnego stanu,
  // identycznie jak w starej wersji mockDb.js. Żaden ekran wywołujący
  // getUserById/getCustomers/getWorkers/getAllUsers nie wymaga zmian.

  users: [],

  getUserById:  (id) => get().users.find((u) => u.id === id) || null,
  getCustomers: () => get().users.filter((u) => u.role === ROLES.CUSTOMER),
  getWorkers:   () => get().users.filter((u) => u.role === ROLES.WORKER),
  getAllUsers:  () => get().users,

  addWalkInCustomer: async (data) => dbAddWalkInCustomer(data),

  updateUserRole: async (userId, newRole) => {
    const updated = await dbUpdateUserRole(userId, newRole);
    // Zsynchronizuj custom claim na koncie Auth tej osoby – inaczej firestore.rules
    // wciąż widziałyby jej STARĄ rolę (z tokenu), mimo że dokument w Firestore
    // już ma nową wartość. Osoba zobaczy efekt po kolejnym zalogowaniu/odświeżeniu
    // tokenu – to świadomy kompromis, opisany w komentarzu nagłówkowym firestore.rules.
    await setUserRoleClaimFn({ targetUid: userId, newRole });
    if (get().currentUser?.id === userId) {
      set({ currentUser: updated });
    }
    return updated;
  },

  // ── WNIOSKI REZERWACJI ────────────────────────────────────

  bookings: [],

  addBooking: async (data) => dbAddBooking(data),
  updateBooking: async (id, changes) => dbUpdateBooking(id, changes),

  convertBookingToRepair: async (bookingId) => {
    const booking = get().bookings.find((b) => b.id === bookingId);
    if (!booking) return null;

    const newRepair = await get().addRepair({
      customerId:  booking.customerId,
      brand:       booking.brand,
      model:       booking.model,
      imei:        '',
      description: booking.description,
      status:      STATUS.ACCEPTED,
      photos:      [],
      partsCost:   0,
      serviceCost: booking.estimatedPrice || 0,
      estimateAccepted: booking.estimatedPrice > 0 ? true : null,
    });

    await get().updateBooking(bookingId, {
      status: BOOKING_STATUS.CONVERTED,
      linkedRepairId: newRepair.id,
    });

    return newRepair;
  },

  getVisibleBookings: () => get().bookings,
  getBookingById: (id) => get().bookings.find((b) => b.id === id) || null,
  getPendingBookingsCount: () =>
    get().bookings.filter((b) => b.status === BOOKING_STATUS.PENDING).length,

  // ── SKUP / SPRZEDAŻ ───────────────────────────────────────

  phones: [],

  addPhone: async (data) => dbAddPhone(data),
  updatePhone: async (id, changes) => dbUpdatePhone(id, changes),
  deletePhone: async (id) => dbDeletePhone(id),
  getPhoneById: (id) => get().phones.find((p) => p.id === id) || null,

  // ── UI ────────────────────────────────────────────────────

  toastMessage: null,
  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },
}));

export default useStore;
