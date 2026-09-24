import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';

export const NearbyScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Agri Centers</Text>
      <Text style={styles.subtitle}>Fertilizer, Seeds, Godowns & Store Finder</Text>
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
