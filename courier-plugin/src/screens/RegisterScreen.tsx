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
import CountryPicker from '../components/CountryPicker';
import { theme } from '../theme';

interface Props {
  onRegister: (displayName: string, bio: string, country: string, password: string) => Promise<void>;
  onGoToLogin: () => void;
  error: string | null;
  loading: boolean;
}

export default function RegisterScreen({ onRegister, onGoToLogin, error, loading }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Logo style={styles.logo} />
      <Text style={styles.subtitle}>Handwritten letters, delivered.</Text>

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="How others see you"
        placeholderTextColor="#999"
        maxLength={50}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={styles.input}
        value={bio}
        onChangeText={setBio}
        placeholder="Enter your bio. You can change this later."
        placeholderTextColor="#999"
        maxLength={200}
      />

      <Text style={styles.label}>Country</Text>
      <CountryPicker selected={country} onSelect={setCountry} />
      <Text style={styles.note}>
        Your country determines how long letters take to arrive.
      </Text>

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        placeholderTextColor="#999"
        secureTextEntry
      />
      <Text style={styles.note}>
        Your username will be auto-generated (e.g. brave-crimson-falcon).
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={() => onRegister(displayName, bio, country, password)}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? 'Joining...' : 'Join Courier'}
        </Text>
      </Pressable>

      <Pressable style={styles.linkBtn} onPress={onGoToLogin}>
        <Text style={styles.linkText}>Already registered? Sign in</Text>
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
  note: {
    fontSize: theme.fontSize.small,
    color: '#999',
    marginTop: theme.spacing.sm,
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