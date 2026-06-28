import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, View } from 'react-native';

import LoginScreen           from '../screens/LoginScreen';
import RegisterScreen        from '../screens/RegisterScreen';
import DashboardScreen       from '../screens/DashboardScreen';
import HomeScreen            from '../screens/HomeScreen';
import AddRepairScreen       from '../screens/AddRepairScreen';
import RepairDetailsScreen   from '../screens/RepairDetailsScreen';
import RepairConfirmScreen   from '../screens/RepairConfirmScreen';
import CustomerCardScreen    from '../screens/CustomerCardScreen';
import EstimateScreen        from '../screens/EstimateScreen';
import StatsScreen           from '../screens/StatsScreen';
import ProfileScreen         from '../screens/ProfileScreen';
import SettingsScreen        from '../screens/SettingsScreen';
import TradeHomeScreen       from '../screens/TradeHomeScreen';
import TradeAddScreen        from '../screens/TradeAddScreen';
import TradeDetailScreen     from '../screens/TradeDetailScreen';
import TradeStatsScreen      from '../screens/TradeStatsScreen';
import BookingRequestScreen  from '../screens/BookingRequestScreen';
import BookingListScreen     from '../screens/BookingListScreen';
import BookingDetailScreen   from '../screens/BookingDetailScreen';
import UserManagementScreen  from '../screens/UserManagementScreen';

import useStore from '../store/useStore';
import colors from '../constants/colors';
import { useColors as _useColors } from '../constants/ThemeContext';
import { ROLES } from '../constants/roles';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle:      { backgroundColor: colors.primary },
  headerTintColor:  '#fff',
  headerTitleStyle: { fontWeight: '700', fontSize: 17 },
  headerBackTitle:  'Wróć',
  contentStyle:     { backgroundColor: colors.background },
};

const RootNavigator = () => {
  const currentUser = useStore((s) => s.currentUser);
  const isAdmin     = currentUser?.role === ROLES.ADMIN;
  const isStaff     = [ROLES.ADMIN, ROLES.WORKER].includes(currentUser?.role);
  const pendingCount = useStore((s) => s.getPendingBookingsCount());

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {currentUser ? (
          <>
            {/* DASHBOARD */}
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={({ navigation }) => ({
                title: '🔧 GSM Serwis',
                headerRight: () => (
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {isAdmin && (
                      <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: 6 }}>
                        <Text style={{ fontSize: 20 }}>⚙️</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ padding: 6 }}>
                      <Text style={{ fontSize: 20 }}>👤</Text>
                    </TouchableOpacity>
                  </View>
                ),
              })}
            />

            {/* SERWIS */}
            <Stack.Screen name="Home"          component={HomeScreen}          options={{ title: 'Zlecenia serwisowe' }} />
            <Stack.Screen name="AddRepair"     component={AddRepairScreen}     options={{ title: 'Nowe zlecenie' }} />
            <Stack.Screen name="RepairDetails" component={RepairDetailsScreen} options={{ title: 'Szczegóły zlecenia' }} />
            <Stack.Screen name="RepairConfirm" component={RepairConfirmScreen} options={{ title: 'Potwierdzenie' }} />
            <Stack.Screen name="CustomerCard"  component={CustomerCardScreen}  options={{ title: 'Karta klienta' }} />
            <Stack.Screen name="Estimate"      component={EstimateScreen}      options={{ title: 'Kosztorys' }} />
            <Stack.Screen name="Stats"         component={StatsScreen}         options={{ title: 'Statystyki serwisu' }} />
            <Stack.Screen name="Profile"       component={ProfileScreen}       options={{ title: 'Profil' }} />
            <Stack.Screen name="Settings"      component={SettingsScreen}      options={{ title: 'Ustawienia' }} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: '👥 Użytkownicy' }} />

            {/* WNIOSKI */}
            <Stack.Screen
              name="BookingList"
              component={BookingListScreen}
              options={({ navigation }) => ({
                title: isStaff ? 'Umówione naprawy' : 'Moje terminy',
                headerRight: () =>
                  !isStaff ? (
                    <TouchableOpacity onPress={() => navigation.navigate('BookingRequest')} style={{ padding: 6 }}>
                      <Text style={{ fontSize: 22 }}>➕</Text>
                    </TouchableOpacity>
                  ) : null,
              })}
            />
            <Stack.Screen name="BookingRequest" component={BookingRequestScreen} options={{ title: 'Umów naprawę' }} />
            <Stack.Screen name="BookingDetail"  component={BookingDetailScreen}  options={{ title: 'Termin naprawy' }} />

            {/* SKUP */}
            <Stack.Screen
              name="TradeHome"
              component={TradeHomeScreen}
              options={({ navigation }) => ({
                title: '📱 Skup & Sprzedaż',
                headerRight: () =>
                  isAdmin ? (
                    <TouchableOpacity onPress={() => navigation.navigate('TradeStats')} style={{ padding: 6 }}>
                      <Text style={{ fontSize: 20 }}>📊</Text>
                    </TouchableOpacity>
                  ) : null,
              })}
            />
            <Stack.Screen name="TradeAdd"    component={TradeAddScreen}    options={{ title: 'Dodaj telefon' }} />
            <Stack.Screen name="TradeDetail" component={TradeDetailScreen} options={{ title: 'Szczegóły telefonu' }} />
            <Stack.Screen name="TradeStats"  component={TradeStatsScreen}  options={{ title: 'Raport skupu' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"    component={LoginScreen}    options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Rejestracja' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
