import './src/utils/disableWarnings';
import React, { useCallback, useEffect } from 'react';
import Navigation from './src/navigation';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

export default function App() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Очищаем localStorage браузера при запуске
      window.localStorage.clear();
    }
  }, []);

  const renderNavigation = useCallback(() => <Navigation />, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {renderNavigation()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
