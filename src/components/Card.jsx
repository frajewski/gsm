// Podstawowy kontener kart – zaokrąglony, z cieniem, reaguje na motyw

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '../constants/ThemeContext';

const Card = ({ children, style, padding = 16 }) => {
  const colors = useColors();
  return (
    <View style={[{
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
      padding,
    }, style]}>
      {children}
    </View>
  );
};

export default Card;
