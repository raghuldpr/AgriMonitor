import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';

export const FertilizerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fertilizer Calculator</Text>
      <Text style={styles.subtitle}>Acreage, Application Rate & Bag Estimation</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 8,
  },
});
