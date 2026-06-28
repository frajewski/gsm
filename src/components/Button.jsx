// Wielozadaniowy przycisk – reaguje na motyw (jasny/ciemny)
// Warianty: primary | accent | ghost | danger | success

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useColors } from '../constants/ThemeContext';

const Button = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const colors = useColors();

  const variantStyles = {
    primary: { bg: colors.primary,  shadow: colors.primary,  opacity: 0.25 },
    accent:  { bg: colors.accent,   shadow: colors.accent,   opacity: 0.30 },
    ghost:   { bg: 'transparent',   shadow: 'transparent',   opacity: 0    },
    danger:  { bg: colors.danger,   shadow: colors.danger,   opacity: 0.20 },
    success: { bg: colors.success,  shadow: colors.success,  opacity: 0.25 },
  };

  const v = variantStyles[variant] || variantStyles.primary;
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[{
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        backgroundColor: v.bg,
        ...(isGhost ? { borderWidth: 1.5, borderColor: colors.primary } : {}),
        shadowColor: v.shadow,
        shadowOpacity: (disabled || loading) ? 0 : v.opacity,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: (disabled || loading) ? 0 : (isGhost ? 0 : 3),
        opacity: (disabled || loading) ? 0.5 : 1,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.primary : '#fff'} />
      ) : (
        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          letterSpacing: 0.3,
          color: isGhost ? colors.primary : '#FFFFFF',
        }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;
