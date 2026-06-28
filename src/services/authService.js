// ============================================================
//  authService.js – logika autentykacji (mock)
//  W produkcji zastąp wywołania mockDb odpowiednimi endpointami API
// ============================================================

import { users, addUser } from '../data/mockDb';

// Zaloguj użytkownika – zwraca { success, user } lub { success: false, error }
export const loginUser = (email, password) => {
  // Normalizuj email – usuń spacje, zamień na małe litery
  const normalizedEmail = email.trim().toLowerCase();

  const user = users.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  );

  if (user) {
    return { success: true, user };
  }
  return { success: false, error: 'Nieprawidłowy email lub hasło.' };
};

// Zarejestruj nowego użytkownika
export const registerUser = ({ name, phone, email, password, role = 'customer' }) => {
  // Walidacja podstawowa
  if (!name || !email || !password) {
    return { success: false, error: 'Wypełnij wszystkie wymagane pola.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'Hasło musi mieć minimum 6 znaków.' };
  }

  // Sprawdź unikalność emaila
  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return { success: false, error: 'Konto z tym adresem email już istnieje.' };
  }

  // Utwórz konto
  const newUser = addUser({ name, phone, email, password, role });
  return { success: true, user: newUser };
};

// Walidacja numeru telefonu w formacie +48XXXXXXXXX lub 9 cyfr
export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+48)?\d{9}$/.test(cleaned);
};

// Walidacja adresu email
export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
