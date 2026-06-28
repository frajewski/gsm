// StatusBadge – kolorowy chip wyświetlający status naprawy
// Automatycznie dobiera kolor na podstawie statuses.js
// Użycie: <StatusBadge status="W naprawie" />

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColors, statusIcons } from '../constants/statuses';
import { useColors } from '../constants/ThemeContext';

const StatusBadge = ({ status, size = 'medium' }) => {
  const colors = useColors();
  const bgColor = statusColors[status] || colors.textSecondary;
  const icon = statusIcons[status] || '•';

  const isSmall = size === 'small';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: bgColor + '20' }, // 20 w hex = ~12% przezroczystości tła
      isSmall && styles.badgeSmall,
    ]}>
      <Text style={[styles.icon, isSmall && styles.iconSmall]}>{icon}</Text>
      <Text style={[styles.text, { color: bgColor }, isSmall && styles.textSmall]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',   // nie rozciągaj na całą szerokość
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,           // pill shape
    gap: 4,
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  icon: {
    fontSize: 13,
  },
  iconSmall: {
    fontSize: 11,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
});

export default StatusBadge;
