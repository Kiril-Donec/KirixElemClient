import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Предопределенные цветовые пары (фон и текст)
const colorPairs = [
  { bg: '#FFE5E5', text: '#FF4D4D' }, // Красный
  { bg: '#E5F1FF', text: '#3399FF' }, // Синий
  { bg: '#E5FFE5', text: '#33CC33' }, // Зеленый
  { bg: '#FFE5FF', text: '#FF33FF' }, // Розовый
  { bg: '#FFF0E5', text: '#FF8533' }, // Оранжевый
  { bg: '#E5F9FF', text: '#33CCFF' }, // Голубой
  { bg: '#F2E5FF', text: '#9933FF' }, // Фиолетовый
  { bg: '#FFFFE5', text: '#CCCC33' }, // Желтый
];

interface LetterAvatarProps {
  name: string;
  size?: number;
  style?: any;
}

const LetterAvatar: React.FC<LetterAvatarProps> = ({ name, size = 120, style }) => {
  // Получаем первую букву имени, если имя пустое используем "?"
  const letter = (name?.charAt(0) || '?').toUpperCase();
  
  // Выбираем цветовую пару на основе имени
  const colorIndex = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colorPairs.length;
  const colors = colorPairs[colorIndex];

  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.bg,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    letter: {
      color: colors.text,
      fontSize: size * 0.4,
      fontWeight: '600',
      textAlign: 'center',
      textAlignVertical: 'center',
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.letter}>{letter}</Text>
    </View>
  );
};

export default LetterAvatar;
