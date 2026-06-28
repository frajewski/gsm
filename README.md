# GSM Service App

Aplikacja mobilna do obsługi serwisu GSM, napisana w **React Native + Expo**. Projekt służy do zarządzania zleceniami napraw, klientami, statusem urządzeń, kosztorysami, zdjęciami, SMS-ami oraz rolami użytkowników.

Aplikacja korzysta z **Firebase**:

* Firebase Authentication — logowanie i rejestracja użytkowników,
* Cloud Firestore — trwała baza danych zleceń, użytkowników i liczników,
* Firebase Cloud Functions — logika backendowa dla ról i panelu webowego,
* Firebase Hosting / panel webowy — planowane lub osobne środowisko do śledzenia zleceń przez klienta.

Projekt jest rozwijany jako system dla serwisu GSM, z podziałem na aplikację mobilną dla serwisu oraz panel webowy dla klienta / obsługi.

---

## Spis treści

1. [Funkcje aplikacji](#funkcje-aplikacji)
2. [Role użytkowników](#role-użytkowników)
3. [Firebase i baza danych](#firebase-i-baza-danych)
4. [Struktura danych Firestore](#struktura-danych-firestore)
5. [Instalacja](#instalacja)
6. [Uruchomienie aplikacji](#uruchomienie-aplikacji)
7. [Build APK / EAS](#build-apk--eas)
8. [Struktura projektu](#struktura-projektu)
9. [Panel webowy i śledzenie zleceń](#panel-webowy-i-śledzenie-zleceń)
10. [Najczęstsze problemy](#najczęstsze-problemy)
11. [Dalszy rozwój](#dalszy-rozwój)

---

## Funkcje aplikacji

### Moduł zleceń napraw

Aplikacja umożliwia obsługę zleceń serwisowych:

* dodawanie nowego zlecenia,
* wybór klienta,
* wpisanie marki i modelu urządzenia,
* wpisanie IMEI,
* opis usterki,
* zapis blokady ekranu, np. PIN,
* wybór dokumentu: Paragon / Faktura,
* wpisanie NIP dla faktury,
* dodawanie kosztów:

  * koszt części,
  * koszt usługi,
  * cena całkowita dla klienta,
* zapisywanie statusu naprawy,
* historia zmian statusów,
* zdjęcia urządzenia,
* karta klienta z historią napraw,
* numeracja zleceń w formacie `N/ROK`, np. `1/2026`.

Przykładowe statusy:

* Przyjęte,
* W diagnozie,
* W naprawie,
* Oczekuje na części,
* Gotowe,
* Odebrane,
* Odwołane.

---

### Kosztorys i widoczność kosztów

System rozróżnia informacje widoczne dla serwisu i dla klienta.

Admin może widzieć pełne koszty, np.:

* koszt części,
* koszt usługi,
* marża,
* statystyki finansowe.

Klient lub pracownik może widzieć uproszczoną cenę całości, bez pełnego rozbicia kosztów.

---

### SMS do klienta

Aplikacja może przygotowywać wiadomość SMS do klienta na podstawie statusu zlecenia.

SMS nie jest wysyłany automatycznie w tle. Aplikacja otwiera systemową aplikację SMS z gotową treścią, a użytkownik może ją wysłać ręcznie.

---

### Zdjęcia

Projekt korzysta z `expo-image-picker`, dzięki czemu można dodawać zdjęcia urządzenia do zlecenia.

Docelowo zdjęcia mogą być przechowywane w Firebase Storage lub jako część struktury zlecenia, zależnie od konfiguracji projektu.

---

### Drukowanie / potwierdzenie przyjęcia

Projekt zawiera obsługę generowania potwierdzenia przyjęcia zlecenia, które może zawierać:

* dane klienta,
* dane urządzenia,
* numer zlecenia,
* opis usterki,
* dokument sprzedaży,
* NIP,
* koszt dla klienta,
* warunki odbioru / gwarancji.

Do tego wykorzystywane są biblioteki Expo związane z drukowaniem i udostępnianiem.

---

## Role użytkowników

Aplikacja przewiduje podział na role:

| Rola                   | Opis                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| Admin                  | Pełny dostęp do zleceń, kosztów, statystyk i zarządzania użytkownikami |
| Pracownik / Technician | Obsługa zleceń, przyjmowanie napraw, zmiana statusów                   |
| Klient / Customer      | Dostęp tylko do swoich danych lub statusu własnego zlecenia            |

Nowy użytkownik nie powinien mieć możliwości samodzielnego nadania sobie roli admina. Role są obsługiwane przez Firebase i Cloud Functions.

---

## Firebase i baza danych

Projekt korzysta z Firebase jako backendu.

Wykorzystywane elementy:

* **Firebase Authentication** — konta użytkowników,
* **Cloud Firestore** — zlecenia, użytkownicy, liczniki,
* **Cloud Functions** — logika ról i zapytań z panelu webowego,
* **Firebase Hosting** — opcjonalny hosting panelu webowego.

Aplikacja nie działa już jako czysty mock/prototyp w pamięci aplikacji. Dane zleceń są zapisywane w Firestore, dzięki czemu mogą być dostępne z różnych urządzeń.

---

## Struktura danych Firestore

Aktualnie używane kolekcje:

```txt
counters
meta
repairs
users
bookingRequests
```

### `repairs`

Kolekcja zleceń napraw.

Przykładowy dokument:

```js
{
  brand: "Samsung",
  model: "Samsung Galaxy S24",
  imei: "",
  description: "Wymiana baterii",
  displayNumber: "1/2026",

  customerId: "USER_ID",
  customerNip: "",
  documentType: "Paragon",

  partsCost: 0,
  serviceCost: 350,

  status: "Przyjęte",
  estimateAccepted: null,

  screenLock: "1234",
  photos: [],

  createdAt: "2026-06-28T13:05:37.112Z",
  createdAtServer: Timestamp,

  history: [
    {
      date: "2026-06-28T13:05:37.112Z",
      status: "Przyjęte"
    }
  ]
}
```

### `users`

Kolekcja użytkowników / klientów.

Przykładowe pola:

```js
{
  email: "klient@example.com",
  fullName: "Jan Kowalski",
  phone: "500000000",
  role: "customer"
}
```

Dla działania wyszukiwania po numerze telefonu ważne jest, aby klient miał zapisany numer telefonu, np. w polu:

```txt
phone
phoneNumber
customerPhone
tel
mobile
```

### `counters`

Kolekcja liczników, np. do numeracji zleceń w danym roku.

Przykład:

```txt
counters / 2026
count: 1
```

### `bookingRequests`

Kolekcja zgłoszeń z panelu webowego lub formularza online.

Może zawierać:

```js
{
  name: "Jan Kowalski",
  phone: "500000000",
  brand: "Samsung",
  model: "Galaxy S24",
  description: "Nie ładuje",
  preferredDate: "2026-06-30",
  status: "Nowe zgłoszenie",
  source: "web",
  createdAt: "2026-06-28T..."
}
```

---

## Cloud Functions

Projekt korzysta z funkcji callable Firebase Functions.

Wdrożone funkcje backendowe:

```txt
decideInitialRole
setUserRoleClaim
syncOwnRoleClaim
lookupRepair
lookupRepairsByPhone
acceptEstimateWeb
rejectEstimateWeb
createBookingRequestWeb
```

### Funkcje ról

```txt
decideInitialRole
setUserRoleClaim
syncOwnRoleClaim
```

Odpowiadają za przypisywanie i synchronizację ról użytkowników.

### Funkcje panelu webowego

```txt
lookupRepair
lookupRepairsByPhone
acceptEstimateWeb
rejectEstimateWeb
createBookingRequestWeb
```

Służą do:

* wyszukiwania zlecenia po numerze zlecenia i telefonie,
* wyszukiwania zleceń po numerze telefonu,
* akceptacji kosztorysu z panelu webowego,
* odrzucenia kosztorysu z panelu webowego,
* tworzenia zgłoszeń naprawy z formularza webowego.

---

## Instalacja

### Wymagania

| Narzędzie    | Wersja                        |
| ------------ | ----------------------------- |
| Node.js      | zalecana LTS                  |
| npm          | v9 lub nowszy                 |
| Expo CLI     | przez `npx expo`              |
| Firebase CLI | przez `npx firebase-tools`    |
| Expo Go      | najnowsza wersja na telefonie |

---

### Pobranie projektu

```bash
git clone https://github.com/frajewski/gsm.git
cd gsm
```

---

### Instalacja zależności

```bash
npm install
```

Jeśli pojawią się konflikty zależności:

```bash
npm install --legacy-peer-deps
```

Po większych zmianach można też użyć:

```bash
npx expo install --fix
```

---

## Uruchomienie aplikacji

```bash
npx expo start
```

Po uruchomieniu Metro Bundlera:

* zeskanuj kod QR aplikacją Expo Go,
* albo uruchom Androida klawiszem `a`,
* albo uruchom iOS klawiszem `i` na Macu.

Jeżeli aplikacja ładuje starą wersję albo dziwnie się zachowuje:

```bash
npx expo start --clear
```

---

## Build APK / EAS

Projekt zawiera konfigurację `eas.json`, więc można budować aplikację przez Expo Application Services.

Instalacja / uruchomienie EAS:

```bash
npx eas-cli@latest login
```

Build Android:

```bash
npx eas-cli@latest build -p android
```

Build APK, jeśli profil jest skonfigurowany w `eas.json`:

```bash
npx eas-cli@latest build -p android --profile preview
```

---

## Struktura projektu

Przykładowa struktura:

```txt
gsm/
├── App.js
├── app.json
├── eas.json
├── google-services.json
├── metro.config.js
├── package.json
├── privacy-policy.html
└── src/
    ├── components/
    ├── constants/
    ├── firebase/
    ├── navigation/
    ├── screens/
    ├── services/
    ├── store/
    └── utils/
```

### Najważniejsze katalogi

| Katalog          | Opis                                                         |
| ---------------- | ------------------------------------------------------------ |
| `src/components` | komponenty UI wielokrotnego użytku                           |
| `src/constants`  | statusy, role, kolory, typy dokumentów, marki itd.           |
| `src/firebase`   | konfiguracja Firebase i usługi związane z autoryzacją / bazą |
| `src/navigation` | nawigacja aplikacji                                          |
| `src/screens`    | ekrany aplikacji                                             |
| `src/services`   | usługi pomocnicze, np. SMS                                   |
| `src/store`      | globalny stan aplikacji                                      |
| `src/utils`      | funkcje pomocnicze, np. formatowanie dat                     |

---

## Panel webowy i śledzenie zleceń

Oprócz aplikacji mobilnej rozwijany jest panel webowy.

Docelowo panel ma umożliwiać:

* klientowi sprawdzenie statusu zlecenia,
* wyszukiwanie zlecenia po numerze i telefonie,
* akceptację lub odrzucenie kosztorysu,
* wysłanie zgłoszenia naprawy,
* pracę z komputera przez panel admina.

Planowane śledzenie zlecenia powinno działać przez token:

```txt
https://twoja-domena.pl/?token=TRACKING_TOKEN
```

Przy tworzeniu zlecenia aplikacja może generować:

```js
trackingToken: "losowy-token"
trackingUrl: "https://twoja-domena.pl/?token=losowy-token"
```

Dzięki temu klient może wejść bez logowania w bezpieczny link do śledzenia konkretnego zlecenia.

---

## Najczęstsze problemy

### `FirebaseError: Missing or insufficient permissions`

Problem z regułami Firestore albo rolą użytkownika.

Sprawdź:

* czy użytkownik jest zalogowany,
* czy ma odpowiednią rolę w `users`,
* czy Cloud Function zsynchronizowała custom claims,
* czy reguły Firestore pozwalają na daną operację.

---

### `functions/internal`

Błąd po stronie Cloud Functions.

Sprawdź logi:

```bash
npx firebase-tools@latest functions:log --project gsmserviceapp-ff8f6
```

Dla konkretnej funkcji:

```bash
npx firebase-tools@latest functions:log --only lookupRepair --project gsmserviceapp-ff8f6
```

---

### Firebase CLI nie instaluje się globalnie

Jeśli występuje błąd `EACCES`, nie instaluj globalnie.

Używaj:

```bash
npx firebase-tools@latest <komenda>
```

Przykład:

```bash
npx firebase-tools@latest functions:list --project gsmserviceapp-ff8f6
```

---

### Expo pokazuje starą wersję aplikacji

Wyczyść cache:

```bash
npx expo start --clear
```

---

### SMS nie wysyła się automatycznie

To normalne. Aplikacja otwiera systemową aplikację SMS z gotową treścią. Użytkownik musi kliknąć wysłanie ręcznie.

---

### Google Sign-In nie działa w Expo Go

Logowanie Google może wymagać development builda lub finalnego APK, ponieważ Expo Go ma ograniczenia związane z redirect URI OAuth.

Email i hasło działają bez tego ograniczenia.

---

## Technologie

| Technologia              | Zastosowanie                   |
| ------------------------ | ------------------------------ |
| React Native             | aplikacja mobilna              |
| Expo                     | uruchamianie i build aplikacji |
| Firebase Authentication  | logowanie i rejestracja        |
| Cloud Firestore          | baza danych                    |
| Firebase Cloud Functions | backend / role / panel webowy  |
| React Navigation         | nawigacja między ekranami      |
| Zustand                  | globalny stan aplikacji        |
| Expo Camera              | skaner IMEI / kodów            |
| Expo Image Picker        | wybieranie zdjęć               |
| Expo SMS                 | przygotowanie wiadomości SMS   |
| Expo Print / Sharing     | potwierdzenia i udostępnianie  |
| React Native Paper       | komponenty UI                  |

---

## Dalszy rozwój

Planowane lub możliwe kierunki:

* generowanie linku śledzenia przy każdym zleceniu,
* automatyczne kopiowanie linku śledzenia,
* wysyłanie linku SMS-em do klienta,
* pełny panel webowy dla admina i pracownika,
* obsługa komputera i telefonu przez jeden panel webowy,
* podpięcie własnej domeny,
* Firebase Hosting dla panelu,
* Firebase Storage dla zdjęć,
* eksport potwierdzeń do PDF,
* statystyki miesięczne i roczne,
* filtrowanie zleceń po statusie, marce, telefonie, IMEI i numerze zlecenia,
* rozbudowane role: admin / pracownik / klient,
* powiadomienia push.

---

## Status projektu

Projekt jest aktywnie rozwijany jako aplikacja do realnej obsługi serwisu GSM. Aktualna wersja korzysta z Firebase i Firestore, a nie wyłącznie z danych tymczasowych w pamięci aplikacji.
