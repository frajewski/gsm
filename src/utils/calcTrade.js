// ============================================================
//  calcTrade.js – obliczenia finansowe dla skupu/sprzedaży
// ============================================================

import { TRADE_STATUS } from '../constants/tradeStatuses';
import { getMonthName } from './formatDate';

// Zysk z jednego telefonu = cena sprzedaży − cena zakupu
export const calcPhoneProfit = (phone) =>
  phone.status === TRADE_STATUS.SOLD
    ? (phone.sellPrice || 0) - (phone.buyPrice || 0)
    : 0;

// Łączna suma zakupów (wszystkie telefony)
export const calcTotalBought = (phonesArray) =>
  phonesArray.reduce((sum, p) => sum + (p.buyPrice || 0), 0);

// Łączna suma sprzedaży (tylko sprzedane)
export const calcTotalSold = (phonesArray) =>
  phonesArray
    .filter((p) => p.status === TRADE_STATUS.SOLD)
    .reduce((sum, p) => sum + (p.sellPrice || 0), 0);

// Łączny zysk netto ze sprzedanych
export const calcTotalProfit = (phonesArray) =>
  phonesArray
    .filter((p) => p.status === TRADE_STATUS.SOLD)
    .reduce((sum, p) => sum + calcPhoneProfit(p), 0);

// ---- FILTROWANIE PO OKRESIE ----

export const filterPhonesToday = (phonesArray) => {
  const today = new Date();
  return phonesArray.filter((p) => {
    const d = new Date(p.boughtAt);
    return (
      d.getDate()     === today.getDate()     &&
      d.getMonth()    === today.getMonth()    &&
      d.getFullYear() === today.getFullYear()
    );
  });
};

export const filterPhonesThisMonth = (phonesArray) => {
  const now = new Date();
  return phonesArray.filter((p) => {
    const d = new Date(p.boughtAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
};

export const filterPhonesThisYear = (phonesArray) => {
  const year = new Date().getFullYear();
  return phonesArray.filter((p) => new Date(p.boughtAt).getFullYear() === year);
};

// ---- RAPORT ZBIORCZY ----

export const getTradeStats = (phonesArray) => {
  const sold      = phonesArray.filter((p) => p.status === TRADE_STATUS.SOLD);
  const inStock   = phonesArray.filter((p) => p.status !== TRADE_STATUS.SOLD);
  const inRepair  = phonesArray.filter((p) => p.status === TRADE_STATUS.REPAIR);
  const ready     = phonesArray.filter((p) => p.status === TRADE_STATUS.READY);

  return {
    total:        phonesArray.length,
    sold:         sold.length,
    inStock:      inStock.length,
    inRepair:     inRepair.length,
    ready:        ready.length,
    totalBought:  calcTotalBought(phonesArray),
    totalSold:    calcTotalSold(phonesArray),
    totalProfit:  calcTotalProfit(phonesArray),
    // Wartość magazynu (suma cen zakupu niesprzedanych)
    stockValue:   inStock.reduce((s, p) => s + (p.buyPrice || 0), 0),
  };
};

// Statystyki podzielone na dziś / miesiąc / rok
export const getTradeStatsByPeriod = (phonesArray) => ({
  today:     getTradeStats(filterPhonesToday(phonesArray)),
  thisMonth: getTradeStats(filterPhonesThisMonth(phonesArray)),
  thisYear:  getTradeStats(filterPhonesThisYear(phonesArray)),
  allTime:   getTradeStats(phonesArray),
});

// Dane miesięczne dla bieżącego roku
export const getMonthlyTradeData = (phonesArray) => {
  const year = new Date().getFullYear();
  const yearPhones = phonesArray.filter(
    (p) => new Date(p.boughtAt).getFullYear() === year
  );

  return Array.from({ length: 12 }, (_, i) => {
    const monthPhones = yearPhones.filter(
      (p) => new Date(p.boughtAt).getMonth() === i
    );
    const soldThisMonth = monthPhones.filter((p) => p.status === TRADE_STATUS.SOLD);
    return {
      month:       getMonthName(i),
      bought:      monthPhones.length,
      sold:        soldThisMonth.length,
      buySpend:    calcTotalBought(monthPhones),
      sellRevenue: calcTotalSold(monthPhones),
      profit:      calcTotalProfit(monthPhones),
    };
  });
};

// Top marki w skupie
export const getTopTradeBrands = (phonesArray) => {
  const counts = phonesArray.reduce((acc, p) => {
    acc[p.brand] = (acc[p.brand] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};
