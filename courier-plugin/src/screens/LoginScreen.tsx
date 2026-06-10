import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Logo from '../../components/Logo';
import { theme } from '../theme';

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onGoToRegister: () => void;
  error: string | null;
  loading: boolean;
}

export default function LoginScreen({ onLogin, onGoToRegister, error, loading }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Logo style={styles.logo} />
      <Text style={styles.subtitle}>Sign in to your account.</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={(t) => setUsername(t.toLowerCase())}
        placeholder="brave-crimson-falcon"
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        placeholderTextColor="#999"
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={() => onLogin(username.trim().toLowerCase(), password)}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </Pressable>

      <Pressable style={styles.linkBtn} onPress={onGoToRegister}>
        <Text style={styles.linkText}>New here? Create an account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  logo: {
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.subtitle,
    color: '#666',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  label: {
    fontSize: theme.fontSize.label,
    fontWeight: '600',
    color: '#333',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  input: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: theme.borderRadius,
    paddingHorizontal: theme.inputPadding,
    paddingVertical: theme.inputPadding,
    fontSize: theme.fontSize.input,
    color: '#000',
    height: theme.inputHeight,
  },
  error: {
    fontSize: theme.fontSize.meta,
    color: '#c00',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  btn: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.buttonPaddingV,
    backgroundColor: '#333',
    borderRadius: theme.borderRadius,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: '#fff',
    fontSize: theme.fontSize.button,
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  linkText: {
    fontSize: theme.fontSize.meta,
    color: '#666',
  },
});