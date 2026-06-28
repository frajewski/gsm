# 🔧 GSM Service App

Aplikacja mobilna do zarządzania serwisem GSM: zlecenia napraw, rezerwacja terminów online przez klientów, oraz skup i sprzedaż telefonów używanych.  
Zbudowana w **React Native + Expo**. Działa na Androidzie i iPhonie.  
Logowanie i konta użytkowników działają przez **Firebase Authentication** (email+hasło, opcjonalnie Google). Dane operacyjne (zlecenia, telefony, terminy) są trzymane w pamięci aplikacji — znikają po jej zamknięciu/restarcie.

---

## 📋 Spis treści

1. [Co robi aplikacja?](#co-robi-aplikacja)
2. [Role użytkowników](#role-użytkowników)
3. [Czego potrzebujesz przed startem?](#czego-potrzebujesz-przed-startem)
4. [Konfiguracja Firebase](#konfiguracja-firebase)
5. [Instalacja krok po kroku](#instalacja-krok-po-kroku)
6. [Uruchomienie](#uruchomienie)
7. [Logowanie — jak zacząć](#logowanie--jak-zacząć)
8. [Struktura projektu](#struktura-projektu)
9. [Najczęstsze problemy](#najczęstsze-problemy)
10. [Znane ograniczenia](#znane-ograniczenia)

---

## Co robi aplikacja?

### 🔧 Moduł serwisu (naprawy)
- Przyjmowanie zlecenia: marka, model, IMEI, opis usterki, zdjęcia, blokada ekranu (PIN/wzór)
- Wybór dokumentu sprzedaży (Paragon / Faktura) — przy fakturze wymagany NIP klienta
- Wstępny kosztorys: pracownik wpisuje jedną cenę całości (podaną np. telefonicznie przez admina); **rozbicie na części/usługę i marża widoczne są tylko dla admina**
- Zmiana statusu zlecenia (Przyjęte → W diagnozie → W naprawie → Oczekuje na części → Gotowe → Odebrane)
- Przy statusie "Odebrane" — wybór okresu gwarancji (brak / 1 / 3 / 6 / 12 miesięcy), automatyczne liczenie daty końca gwarancji
- Czytelna numeracja zleceń w formacie `N/ROK` (np. `1/2026`), resetująca się co rok
- Wysyłanie SMS-ów do klienta z gotowych szablonów (otwiera aplikację SMS na telefonie)
- Drukowane potwierdzenie przyjęcia z danymi klienta, urządzenia, dokumentem sprzedaży i NIP — klient widzi tylko cenę całości, bez rozbicia na marżę
- Karta klienta z pełną historią napraw
- Statystyki finansowe (tylko admin): dzienny/miesięczny/roczny zysk, top marki

### 📅 Umawianie naprawy (rezerwacja online)
- Klient wybiera markę, model, opisuje usterkę i wskazuje preferowany termin z kalendarza (najbliższe 14 dni, pon–sob)
- Admin/pracownik widzi zgłoszenie i może: zaakceptować termin, zaproponować inny, podać wycenę, przypisać pracownika, albo odrzucić z podaniem powodu
- Po akceptacji — jedno kliknięcie przekształca zgłoszenie w pełne zlecenie naprawy

### 📱 Skup i sprzedaż telefonów używanych
- Dodawanie telefonu do skupu: marka, model, IMEI (ze skanerem kodu), kolor, **pamięć** (32GB–1TB), grade stanu (A–D), źródło zakupu
- Oznaczanie blokad: iCloud (Find My), simlock operatora, status "zastrzeżony/zgłoszony jako kradziony"
- Cena zakupu, cena sprzedaży i zysk — **widoczne tylko dla admina**; pracownik widzi tylko status i podstawowe dane urządzenia
- Powiązanie telefonu z konkretnym zleceniem naprawy (np. telefon odkupiony po nieudanej naprawie)
- Raport finansowy skupu (tylko admin)

### 👥 Zarządzanie użytkownikami
- Admin może zmieniać role innych użytkowników: Klient ↔ Pracownik (przez ekran "Użytkownicy")
- Rola Admina **nie może zostać przyznana przez standardowy formularz rejestracji** — to zabezpieczenie przed przypadkowym albo złośliwym przejęciem pełnych uprawnień

---

## Role użytkowników

| Rola | Jak dostaje dostęp | Co widzi |
|---|---|---|
| 👑 **Admin** | Konto z najwyższymi uprawnieniami, niedostępne przez standardową rejestrację | Wszystko — pełne ceny, marże, raporty, zarządzanie użytkownikami |
| 🔧 **Pracownik** | Rejestruje się jako klient, admin podnosi mu rolę | Zlecenia, skup — ale bez cen zakupu/sprzedaży/marży. Widzi tylko sumę do zapłaty |
| 👤 **Klient** | Rejestruje się sam przez apkę (email+hasło lub Google) | Tylko własne zlecenia i terminy, sumę kosztorysu (bez rozbicia) |

> 🔒 Każda nowa rejestracja przez formularz w apce **zawsze** dostaje rolę Klient — nie ma możliwości wyboru innej roli przy rejestracji, nawet teoretycznie. To wymuszone jest na dwóch poziomach (formularz i logika store), żeby nikt nie mógł sam sobie przyznać wyższych uprawnień.

---

## Czego potrzebujesz przed startem?

| Co | Minimalna wersja | Jak sprawdzić |
|---|---|---|
| **Node.js** | v18 lub nowszy | `node --version` |
| **npm** | v9 lub nowszy | `npm --version` |
| **Expo Go** (apka na telefon) | najnowsza | App Store / Google Play |
| **Konto Firebase** | darmowy plan Spark | [console.firebase.google.com](https://console.firebase.google.com) |
| Git (opcjonalnie) | dowolna | `git --version` |

> 💡 **Expo Go** to bezpłatna aplikacja — instalujesz ją na swoim telefonie i skanem kodu QR uruchamiasz projekt. Nie musisz instalować Androida ani Xcode!

---

## Konfiguracja Firebase

Logowanie wymaga własnego projektu Firebase (jest darmowy). Jeśli korzystasz z gotowego `google-services.json` dołączonego do tego repo — projekt jest już skonfigurowany i możesz przejść do [Instalacji](#instalacja-krok-po-kroku).

Jeśli konfigurujesz od zera:

1. Wejdź na [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. W projekcie: **Build → Authentication → Get started**
3. Zakładka **Sign-in method** → włącz **Email/Password** (i opcjonalnie **Google**)
4. **Project settings → General → Add app → Android**, podaj package name: `pl.gsmserwis.app`
5. Pobierz **`google-services.json`** i umieść go w głównym folderze projektu (`GSMServiceApp/google-services.json`)
6. Zaktualizuj dane w `src/firebase/firebaseConfig.js` wartościami z pobranego pliku

> ⚠️ Logowanie przez Google **nie działa w Expo Go** ze względu na ograniczenia OAuth (zmienny redirect URI w trybie deweloperskim). Zadziała poprawnie po zbudowaniu Development Build lub finalnego APK przez `eas build`. Email+hasło działa od razu, niezależnie od tego.

---

## Instalacja krok po kroku

### Krok 1 — Pobierz Node.js (jeśli nie masz)

Wejdź na [nodejs.org](https://nodejs.org) i pobierz wersję **LTS** (zieloną).

### Krok 2 — Przejdź do folderu projektu

```bash
cd GSMServiceApp
```

### Krok 3 — Zainstaluj wszystkie zależności

```bash
npm install --legacy-peer-deps
```

> Flaga `--legacy-peer-deps` jest potrzebna ze względu na niektóre pakiety Expo — bez niej instalacja może się wywalić z błędem konfliktu wersji.

### Krok 4 — Dociągnij natywne paczki zgodne z wersją Expo

```bash
npx expo install --fix
```

---

## Uruchomienie

```bash
npx expo start
```

W terminalu pojawi się **kod QR**. Co dalej:

**Na telefonie (rekomendowane):**
1. Otwórz aplikację **Expo Go**
2. Zeskanuj kod QR z terminala (aparatem albo wewnątrz Expo Go)
3. Aplikacja załaduje się na Twoim telefonie ✅

**Na emulatorze Android:**
- Naciśnij klawisz `a` w terminalu (wymaga Android Studio)

**Na symulatorze iOS (tylko Mac):**
- Naciśnij klawisz `i` w terminalu (wymaga Xcode, symulator musi być wcześniej otwarty)

Jeśli po większych zmianach w kodzie coś nie działa poprawnie, prawie zawsze pomaga:

```bash
npx expo start --clear
```

---

## Logowanie — jak zacząć

### 🔑 Gotowe konta testowe (do szybkiego sprawdzenia aplikacji)

Poniższe konta są już zarejestrowane i gotowe do użycia — wystarczy się zalogować, bez przechodzenia przez rejestrację:

| Rola | Email | Hasło |
|---|---|---|
| 👑 Admin | `kontaktfonexpert@gmail.com` | `Filip123!` |
| 🔧 Pracownik | `pracownik@test.pl` | `123456` |
| 👤 Klient | `klient@test.pl` | `123456` |

> ⚠️ To konta testowe stworzone wyłącznie do oceny tego prototypu — projekt Firebase, na którym działają, jest tymczasowy i zostanie usunięty po zakończeniu oceny.

---

Niezależnie od kont powyżej, aplikacja **nie ma żadnych "kont demo" do zalogowania jednym kliknięciem** — logowanie idzie przez prawdziwy Firebase Authentication, więc każde nowe konto musi zostać faktycznie zarejestrowane.

### Pierwsze logowanie

Przy pierwszym uruchomieniu zarejestruj się normalnie przez formularz "Zarejestruj się". Domyślnie nowo zarejestrowane konto dostaje rolę Klient — przypisanie roli Admina lub Pracownika dla wybranych kont odbywa się poza standardowym formularzem rejestracji, jako dodatkowy krok konfiguracji po stronie właściciela serwisu.

### Konta pracowników i klientów

Każda osoba rejestruje się sama przez ekran "Zarejestruj się" — dostaje automatycznie rolę Klient. Jeśli ma być pracownikiem serwisu, zaloguj się jako Admin i w **Dashboard → Użytkownicy** zmień jej rolę na Pracownik.

### Przykładowi klienci (dane testowe, NIE konta do logowania)

W bazie są trzy rekordy testowych klientów — **Anna Nowak**, **Piotr Wiśniewski**, **Karolina Zając**. To nie są konta z logowaniem (nie mają hasła, oznaczone jako `isWalkIn: true`) — to przykładowe dane do testowania list i wyboru klienta przy przyjmowaniu zlecenia, symulujące klientów "papierowych" dodanych ręcznie przez pracownika (np. gdy klient nie ma jeszcze konta w apce).

> 💡 Jeśli realny klient o takim samym adresie email kiedyś się zarejestruje, system automatycznie scali jego nowe konto z tymi danymi testowymi, zachowując historię zleceń.

---

## Struktura projektu

```
GSMServiceApp/
├── App.js                       ← punkt startowy, nasłuchuje sesji Firebase
├── app.json                     ← konfiguracja Expo (nazwa, ikona, uprawnienia, scheme)
├── google-services.json         ← konfiguracja Firebase (Android)
├── package.json                 ← lista bibliotek
│
└── src/
    ├── components/              ← wielokrotnego użytku "klocki UI"
    │   ├── Button.jsx           ← przycisk (primary/ghost/danger/success)
    │   ├── Card.jsx             ← biała karta z cieniem
    │   ├── FAB.jsx              ← pływający przycisk "+"
    │   ├── ImeiScanner.jsx      ← skaner kodu kreskowego (expo-camera)
    │   ├── RepairListItem.jsx   ← wiersz na liście zleceń
    │   ├── SectionHeader.jsx    ← nagłówek sekcji z licznikiem
    │   └── StatusBadge.jsx      ← kolorowy chip statusu
    │
    ├── constants/                ← niezmienne wartości
    │   ├── bookingStatuses.js   ← statusy rezerwacji terminu
    │   ├── brands.js            ← lista marek telefonów
    │   ├── colors.js            ← WSZYSTKIE kolory aplikacji
    │   ├── documentTypes.js     ← Paragon / Faktura
    │   ├── grades.js            ← grade stanu telefonu w skupie (A–D)
    │   ├── roles.js             ← admin / worker / customer
    │   ├── statuses.js          ← statusy naprawy + kolory + ikony
    │   ├── storageOptions.js    ← pojemności pamięci (32GB–1TB)
    │   ├── tradeSources.js      ← źródła zakupu telefonu w skupie
    │   ├── tradeStatuses.js     ← statusy telefonu w skupie
    │   └── warrantyPeriods.js   ← okresy gwarancji + liczenie daty końca
    │
    ├── data/
    │   └── mockDb.js            ← "baza danych" — tablice w pamięci + CRUD + scalanie kont
    │
    ├── firebase/
    │   ├── firebaseConfig.js        ← inicjalizacja Firebase
    │   ├── firebaseAuthService.js   ← logowanie/rejestracja email+hasło
    │   ├── googleAuthService.js     ← logowanie przez Google
    │   └── userProfileService.js    ← łączenie profilu Firebase z rolą/danymi lokalnymi
    │
    ├── navigation/
    │   └── RootNavigator.jsx    ← routing: zalogowany/niezalogowany, uprawnienia w nagłówkach
    │
    ├── screens/                  ← ekrany aplikacji
    │   ├── LoginScreen.jsx           ← logowanie (email+hasło, Google)
    │   ├── RegisterScreen.jsx        ← rejestracja (zawsze rola Klient)
    │   ├── DashboardScreen.jsx       ← ekran główny z dużymi kartami modułów
    │   ├── HomeScreen.jsx            ← lista zleceń + wyszukiwarka + filtry
    │   ├── AddRepairScreen.jsx       ← formularz nowego zlecenia
    │   ├── RepairDetailsScreen.jsx   ← szczegóły + zmiana statusu + gwarancja + SMS
    │   ├── RepairConfirmScreen.jsx   ← drukowane potwierdzenie przyjęcia
    │   ├── CustomerCardScreen.jsx    ← historia klienta
    │   ├── EstimateScreen.jsx        ← kosztorys (edycja / akceptacja)
    │   ├── StatsScreen.jsx           ← statystyki finansowe serwisu
    │   ├── ProfileScreen.jsx         ← profil + wylogowanie
    │   ├── SettingsScreen.jsx        ← ustawienia wydruku/potwierdzeń (admin)
    │   ├── BookingRequestScreen.jsx  ← klient umawia naprawę (kalendarz)
    │   ├── BookingListScreen.jsx     ← lista umówionych terminów
    │   ├── BookingDetailScreen.jsx   ← odpowiedź na termin / konwersja na zlecenie
    │   ├── UserManagementScreen.jsx  ← zmiana ról użytkowników (admin)
    │   ├── TradeHomeScreen.jsx       ← lista telefonów w skupie
    │   ├── TradeAddScreen.jsx        ← formularz dodania telefonu do skupu
    │   ├── TradeDetailScreen.jsx     ← szczegóły telefonu, status, cena sprzedaży
    │   └── TradeStatsScreen.jsx      ← raport finansowy skupu (admin)
    │
    ├── services/
    │   ├── authService.js       ← walidacja email/telefonu
    │   └── smsService.js        ← szablony SMS (otwiera aplikację SMS)
    │
    ├── store/
    │   ├── useStore.js          ← globalny stan (Zustand) — auth, naprawy, terminy, skup
    │   └── useSettings.js       ← ustawienia wydruku potwierdzeń
    │
    └── utils/
        ├── formatDate.js        ← formatowanie dat po polsku
        ├── calcProfit.js        ← obliczenia zysku serwisu, statystyki
        └── calcTrade.js         ← obliczenia zysku ze skupu telefonów
```

### Jak to działa w skrócie?

```
Użytkownik naciska przycisk
        ↓
   Komponent (Screen)
        ↓
  useStore (Zustand)      ← globalny stan, dostępny wszędzie
        ↓
    mockDb.js             ← dane operacyjne w pamięci (zlecenia, telefony, terminy)
        +
  Firebase Auth           ← logowanie, hasła, sesja użytkownika
        ↓
  Stan zaktualizowany → UI odświeżony automatycznie
```

---

## Najczęstsze problemy

### ❌ `Error: The required package 'expo-asset' cannot be found`
Po większych zmianach w zależnościach `node_modules` wymaga przebudowy:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npx expo install --fix
npx expo start --clear
```

### ❌ `Identifier 'X' has already been declared`
Błąd składni w kodzie (np. zdublowana deklaracja zmiennej) — to nie problem środowiska, plik wymaga poprawki.

### ❌ Logowanie Google: "Dostęp zablokowany: błąd autoryzacji" (Error 400: invalid_request)
To znane ograniczenie Expo Go — redirect URI generowany w trybie deweloperskim (`exp://192.168.x.x:8081`) nie może zostać zarejestrowany w Google Cloud Console, bo zmienia się z każdą siecią Wi-Fi. Email+hasło działa bez przeszkód. Google Sign-In zadziała poprawnie po zbudowaniu Development Build lub finalnego APK.

### ❌ Po rejestracji konto ma złą rolę
Sprawdź, czy rejestrujesz się na adres email, który nie pokrywa się z żadnym innym kontem w `mockDb.js` — system automatycznie scala konta o identycznym adresie email, co może przywrócić wcześniej zapisaną rolę.

### ❌ Telefon i komputer są w różnych sieciach Wi-Fi
Expo Go i komputer muszą być w **tej samej sieci Wi-Fi**.
Alternatywnie w terminalu naciśnij `s` → wybierz "Expo Go (tunnel)" — działa przez internet.

### ❌ `Metro bundler` kręci się w kółko / nieaktualny widok po zmianach
```bash
npx expo start --clear
```

### ❌ Terminal: `Error: EPERM: process.cwd failed`
Terminal "zgubił" aktualny folder, zwykle po usunięciu/przeniesieniu folderu projektu. Zamknij całe okno terminala i otwórz nowe, potem `cd` do folderu jeszcze raz.

### ❌ Zdjęcia nie działają (ImagePicker)
Na iPhonie/Androidzie trzeba zaakceptować uprawnienie do galerii przy pierwszym użyciu.
Jeśli odrzuciłeś — wejdź w Ustawienia → Expo Go → Zdjęcia → Zezwól.

### ❌ SMS nie wysyła się automatycznie
Funkcja otwiera aplikację SMS na telefonie — nie wysyła wiadomości samodzielnie w tle. Na emulatorze/symulatorze może nie działać — testuj na prawdziwym telefonie.

---

## Znane ograniczenia

- **Dane operacyjne nie są trwałe.** Zlecenia, telefony w skupie i umówione terminy żyją tylko w pamięci aplikacji (`mockDb.js`) — restart Metro bundlera albo przebudowanie projektu resetuje je do stanu początkowego. Tylko konta i hasła (Firebase Auth) są trwałe.
- **Google Sign-In nie działa w Expo Go** — wymaga Development Build albo finalnego APK (patrz wyżej).
- **Scalanie kont działa tylko po identycznym adresie email** — literówka albo inny adres oznacza dwa osobne profile bez połączonej historii.
- **Numeracja zleceń może mieć dziury** po usunięciu zlecenia — to zachowanie zbliżone do numeracji faktur w typowych systemach księgowych, nie błąd.

---

## Technologie

| Biblioteka | Do czego |
|---|---|
| **React Native + Expo** | framework aplikacji mobilnych |
| **Firebase Authentication** | logowanie, rejestracja, sesje użytkowników |
| **@react-navigation/native-stack** | nawigacja między ekranami |
| **Zustand** | globalny stan aplikacji |
| **expo-camera** | skaner IMEI w module skupu |
| **expo-image-picker** | wybieranie zdjęć z galerii |
| **expo-linear-gradient** | gradienty na ekranie głównym i logowania |
| **expo-auth-session / expo-web-browser** | logowanie przez Google |
| **@react-native-async-storage/async-storage** | trwałość sesji logowania |
| **react-native-paper** | gotowe komponenty Material Design |

---

## Dalszy rozwój (możliwe kierunki)

- [ ] Podpięcie trwałej bazy danych (np. Firestore) zamiast danych w pamięci
- [ ] Development Build / finalny APK do pełnego działania logowania Google
- [ ] Push notyfikacje zamiast SMS
- [ ] Eksport zleceń i raportów do PDF
- [ ] Tryb ciemny (dark mode)
- [ ] Automatyczne powiadomienia dla klienta o zmianie statusu naprawy

---

*Projekt rozwijany jako działający prototyp serwisu GSM, z myślą o realnym użyciu w codziennej pracy serwisu i sklepu.*
