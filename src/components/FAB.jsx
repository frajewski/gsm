// FAB – Floating Action Button (pływający przycisk "+")
// Stały w prawym dolnym rogu ekranu, otwiera AddRepairScreen

import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useColors } from '../constants/ThemeContext';

const FAB = ({ onPress, icon = '+', style }) => {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[{
        position: 'absolute',
        bottom: 28,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.40,
        shadowRadius: 8,
        elevation: 8,
      }, style]}
    >
      <Text style={{ fontSize: 28, color: '#FFFFFF', lineHeight: 32, fontWeight: '300' }}>
        {icon}
      </Text>
    </TouchableOpacity>
  );
};

export default FAB;
