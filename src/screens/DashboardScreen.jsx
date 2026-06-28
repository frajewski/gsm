import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useStore from '../store/useStore';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { ROLES } from '../constants/roles';
import { TRADE_STATUS } from '../constants/tradeStatuses';
import STATUS   from '../constants/statuses';

const DashboardScreen = ({ navigation }) => {
  const currentUser         = useStore((s) => s.currentUser);
  const repairs             = useStore((s) => s.getVisibleRepairs());
  const phones              = useStore((s) => s.phones);
  const getPendingBookings  = useStore((s) => s.getPendingBookingsCount);
  const getVisibleBookings  = useStore((s) => s.getVisibleBookings);

  const isAdmin    = currentUser?.role === ROLES.ADMIN;
  const isWorker   = currentUser?.role === ROLES.WORKER;
  const isStaff    = isAdmin || isWorker;
  const isCustomer = currentUser?.role === ROLES.CUSTOMER;

  const activeRepairs  = repairs.filter(r => r.status !== STATUS.DELIVERED && r.status !== STATUS.CANCELLED).length;
  const readyRepairs   = repairs.filter(r => r.status === STATUS.READY).length;
  const stockPhones    = phones.filter(p => p.status !== TRADE_STATUS.SOLD).length;
  const pendingBookings = isStaff ? getPendingBookings() : getVisibleBookings().filter(b => b.status === 'Oczekuje').length;
  const myBookings     = isCustomer ? getVisibleBookings().length : 0;

  // Pora dnia do dynamicznego powitania – drobny, ale ludzki detal
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Cześć' : 'Dobry wieczór';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Powitanie */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{timeGreeting}, {currentUser?.name?.split(' ')[0]} 👋</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {isAdmin ? '👑 Administrator' : isWorker ? '🔧 Pracownik' : '👤 Klient'}
          </Text>
        </View>
      </View>

      {/* DUŻE PRZYCISKI */}
      <View style={styles.bigButtons}>

        {/* SERWIS – wszyscy */}
        <BigCard
          colors={['#2D4263', '#1A2A42']}
          icon="🔧"
          title="Serwis GSM"
          subtitle="Zlecenia napraw"
          onPress={() => navigation.navigate('Home')}
        >
          {activeRepairs > 0 && <Badge label={`${activeRepairs} aktywnych`} color="rgba(255,255,255,0.22)" />}
          {readyRepairs  > 0 && <Badge label={`✅ ${readyRepairs} gotowych`} color={colors.success} />}
        </BigCard>

        {/* UMÓW NAPRAWĘ – klient rezerwuje termin, admin/pracownik obsługuje */}
        <BigCard
          colors={['#7C6FFF', '#5A4FE0']}
          icon={isCustomer ? '📅' : '🗓️'}
          title={isCustomer ? 'Umów naprawę' : 'Umówione naprawy'}
          subtitle={isCustomer ? 'Wybierz dogodny termin' : 'Zarezerwowane terminy'}
          onPress={() => navigation.navigate('BookingList')}
        >
          {pendingBookings > 0 && (
            <Badge
              label={isCustomer ? `${pendingBookings} oczekuje` : `⏳ ${pendingBookings} nowych`}
              color={isCustomer ? 'rgba(255,255,255,0.22)' : colors.warning}
            />
          )}
          {isCustomer && myBookings === 0 && (
            <Badge label="Naciśnij +" color="rgba(255,255,255,0.22)" />
          )}
        </BigCard>

        {/* SKUP – tylko staff */}
        {isStaff && (
          <BigCard
            colors={['#379777', '#246B52']}
            icon="📱"
            title="Skup & Sprzedaż"
            subtitle="Telefony używane"
            onPress={() => navigation.navigate('TradeHome')}
          >
            {stockPhones > 0 && <Badge label={`${stockPhones} w magazynie`} color="rgba(255,255,255,0.22)" />}
          </BigCard>
        )}
      </View>

      {/* SZYBKIE AKCJE */}
      <Text style={styles.quickTitle}>Szybkie akcje</Text>
      <View style={styles.quickGrid}>
        {isStaff  && <QuickBtn icon="➕" label="Nowe zlecenie"  onPress={() => navigation.navigate('AddRepair')} />}
        {isStaff  && <QuickBtn icon="📊" label="Statystyki"     onPress={() => navigation.navigate('Stats')} />}
        {isAdmin  && <QuickBtn icon="👥" label="Użytkownicy"    onPress={() => navigation.navigate('UserManagement')} />}
        {isAdmin  && <QuickBtn icon="⚙️" label="Ustawienia"     onPress={() => navigation.navigate('Settings')} />}
        {isCustomer && <QuickBtn icon="📅" label="Umów naprawę" onPress={() => navigation.navigate('BookingRequest')} />}
        <QuickBtn icon="👤" label="Profil" onPress={() => navigation.navigate('Profile')} />
      </View>
    </ScrollView>
  );
};

// Duża karta z gradientem, ikoną w "plakietce" i delikatnym poświeceniem
const BigCard = ({ colors: gradientColors, icon, title, subtitle, onPress, children }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.bigCardWrap}>
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bigCard}>
      <View style={styles.bigCardTop}>
        <View style={styles.iconBadge}>
          <Text style={styles.bigIcon}>{icon}</Text>
        </View>
      </View>
      <View>
        <Text style={styles.bigTitle}>{title}</Text>
        <Text style={styles.bigSub}>{subtitle}</Text>
        <View style={styles.badgeRow}>{children}</View>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const Badge = ({ label, color }) => (
  <View style={[badgeS.wrap, { backgroundColor: color }]}>
    <Text style={badgeS.text}>{label}</Text>
  </View>
);
const QuickBtn = ({ icon, label, onPress }) => (
  <TouchableOpacity style={quickS.btn} onPress={onPress} activeOpacity={0.8}>
    <View style={quickS.iconWrap}>
      <Text style={quickS.icon}>{icon}</Text>
    </View>
    <Text style={quickS.label}>{label}</Text>
  </TouchableOpacity>
);

const badgeS = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  text: { fontSize: 12, color: '#fff', fontWeight: '700' },
});
const quickS = StyleSheet.create({
  btn:     { flex: 1, minWidth: '45%', maxWidth: '48%', backgroundColor: colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', margin: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  iconWrap:{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon:    { fontSize: 22 },
  label:   { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  content:      { padding: 20, paddingBottom: 40 },
  header:       { marginBottom: 26, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting:     { fontSize: 24, fontWeight: '800', color: colors.primary, flex: 1, marginRight: 10 },
  roleBadge:    { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  roleBadgeText:{ fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  bigButtons:   { gap: 14, marginBottom: 30 },
  bigCardWrap:  { borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  bigCard:      { borderRadius: 20, padding: 22, minHeight: 150, justifyContent: 'space-between' },
  bigCardTop:   { flexDirection: 'row', justifyContent: 'flex-end' },
  iconBadge:    { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: -4, right: -4 },
  bigIcon:      { fontSize: 26 },
  bigTitle:     { fontSize: 21, fontWeight: '800', color: '#fff' },
  bigSub:       { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 3, marginBottom: 10 },
  badgeRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
});

export default DashboardScreen;
