// ============================================================
//  calcProfit.js – obliczenia finansowe i statystyki serwisu
//  Użycie: import { calcProfit, getStatsByPeriod } from '../utils/calcProfit'
// ============================================================

import { STATUS } from '../constants/statuses';
import { getMonthName } from './formatDate';

// Zysk z jednej naprawy = koszt usługi − koszt części
export const calcSingleProfit = (repair) =>
  (repair.serviceCost || 0) - (repair.partsCost || 0);

// Łączny zysk z tablicy napraw
export const calcProfit = (repairsArray) =>
  repairsArray.reduce((sum, r) => sum + calcSingleProfit(r), 0);

// Łączny przychód (sama usługa)
export const calcRevenue = (repairsArray) =>
  repairsArray.reduce((sum, r) => sum + (r.serviceCost || 0), 0);

// Łączne koszty części
export const calcPartsCost = (repairsArray) =>
  repairsArray.reduce((sum, r) => sum + (r.partsCost || 0), 0);

// ---- FILTROWANIE PO OKRESIE ----

// Filtruj naprawy z dzisiaj
export const filterToday = (repairsArray) => {
  const today = new Date();
  return repairsArray.filter((r) => {
    const d = new Date(r.createdAt);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  });
};

// Filtruj naprawy z bieżącego miesiąca
export const filterThisMonth = (repairsArray) => {
  const now = new Date();
  return repairsArray.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
};

// Filtruj naprawy z bieżącego roku
export const filterThisYear = (repairsArray) => {
  const year = new Date().getFullYear();
  return repairsArray.filter((r) => new Date(r.createdAt).getFullYear() === year);
};

// ---- STATYSTYKI ZBIORCZE ----

// Zwróć pełny raport dla podanego zakresu napraw
export const getStats = (repairsArray) => {
  const completed = repairsArray.filter((r) => r.status === STATUS.DELIVERED);
  const active    = repairsArray.filter((r) =>
    r.status !== STATUS.DELIVERED && r.status !== STATUS.CANCELLED
  );
  const cancelled = repairsArray.filter((r) => r.status === STATUS.CANCELLED);

  return {
    total:         repairsArray.length,     // wszystkie zlecenia
    completed:     completed.length,        // zakończone
    active:        active.length,           // w toku
    cancelled:     cancelled.length,        // anulowane
    revenue:       calcRevenue(completed),  // przychód z ukończonych
    partsCost:     calcPartsCost(completed),// koszty części
    profit:        calcProfit(completed),   // zysk netto
  };
};

// Statystyki podzielone na dzisiaj / ten miesiąc / ten rok
export const getStatsByPeriod = (repairsArray) => ({
  today:     getStats(filterToday(repairsArray)),
  thisMonth: getStats(filterThisMonth(repairsArray)),
  thisYear:  getStats(filterThisYear(repairsArray)),
});

// ---- RANKINGI ----

// Zlicz wystąpienia wartości w tablicy (np. marki lub usterki)
const countOccurrences = (items) =>
  items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

// Posortuj obiekt { klucz: liczba } malejąco i zwróć tablicę [{name, count}]
const sortedRanking = (countObj) =>
  Object.entries(countObj)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

// Najpopularniejsze marki urządzeń
export const getTopBrands = (repairsArray) => {
  const brands = repairsArray.map((r) => r.brand).filter(Boolean);
  return sortedRanking(countOccurrences(brands));
};

// Najczęstsze usterki (pierwsze słowo opisu jako przybliżona kategoria)
// TODO: gdy dodasz pole faultType do Repair, użyj r.faultType zamiast opisu
export const getTopFaults = (repairsArray) => {
  const faults = repairsArray
    .map((r) => r.description?.split(' ').slice(0, 3).join(' ') || 'Brak opisu')
    .filter(Boolean);
  return sortedRanking(countOccurrences(faults)).slice(0, 5); // top 5
};

// Dane miesięczne dla bieżącego roku – [{month: 'Styczeń', profit: 500, count: 3}, ...]
export const getMonthlyData = (repairsArray) => {
  const year = new Date().getFullYear();
  const yearRepairs = repairsArray.filter(
    (r) => new Date(r.createdAt).getFullYear() === year
  );

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthRepairs = yearRepairs.filter(
      (r) => new Date(r.createdAt).getMonth() === monthIndex
    );
    const delivered = monthRepairs.filter((r) => r.status === STATUS.DELIVERED);
    return {
      month:  getMonthName(monthIndex),
      count:  monthRepairs.length,
      profit: calcProfit(delivered),
    };
  });
};
