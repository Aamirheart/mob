import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    try {
      await login(email, password);
      router.back(); // Go back to Cart after login
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.form}>
        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
        
        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder="Enter your email"
          placeholderTextColor={colors.icon}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: colors.text }]}>Password</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder="Enter your password"
          placeholderTextColor={colors.icon}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button 
            title={loading ? "Logging in..." : "Sign In"} 
            onPress={handleLogin} 
            disabled={loading}
        />
        
        {loading && <ActivityIndicator style={{marginTop: 20}} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  form: { gap: 15 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});