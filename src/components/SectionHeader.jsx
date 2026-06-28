// SectionHeader – nagłówek sekcji z opcjonalnym przyciskiem akcji i licznikiem

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColors } from '../constants/ThemeContext';

const SectionHeader = ({ title, count, actionLabel, onAction }) => {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
        {count !== undefined && (
          <View style={{ backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{count}</Text>
          </View>
        )}
      </View>
      {actionLabel && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: 14, color: colors.accent, fontWeight: '600' }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SectionHeader;
