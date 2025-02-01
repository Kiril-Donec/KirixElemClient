import React, { useState, useContext } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { authAPI } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { AuthContext } from '../navigation';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      ':focus': {
        borderColor: '#007AFF',
      },
    }),
  },
  buttonContainer: {
    pointerEvents: 'auto',
  },
  button: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      ':hover': {
        backgroundColor: '#0056b3',
      },
    }),
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

const LoginScreen = () => {
  const navigation = useNavigation();
  const { setIsLoggedIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // проверка формата почти
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      Alert.alert('Ошибка', 'Введите почту');
      return;
    }
    if (!emailRegex.test(email)) {
      Alert.alert('Ошибка', 'Введите корректный email адрес');
      return;
    }
    if (!password) {
      Alert.alert('Ошибка', 'Введите пароль');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting login with email:', email);
      const response = await authAPI.login(email.trim(), password);
      console.log('Login response:', response);
      
      if (response?.status === 'success' && response?.S_KEY) {
        console.log('Login successful, storing S-KEY...');
        await AsyncStorage.setItem('S-KEY', response.S_KEY);
        setIsLoggedIn(true);
      } else {
        console.log('Invalid credentials');
        Alert.alert('Ошибка', 'Неверный email или пароль');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Ошибка', 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sigma Element Client</Text>
      <TextInput
        style={styles.input}
        placeholder="Электронная почта"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Войти</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginScreen;
