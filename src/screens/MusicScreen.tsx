import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MusicScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Music Screen - Coming Soon</Text>
    </View>
  );
};
// сделать надо музло а пока пусто
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    color: '#666',
  },
});

export default MusicScreen;
