import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { getProfile, updateProfile } from '../api';
import { getStoredAuth, updateStoredProfile } from '../db';
import { ArrowLeftIcon } from '../components/Icons';
import CountryPicker from '../components/CountryPicker';
import { theme } from '../theme';

interface Props {
  onBack: () => void;
  onLogout: () => void;
}

export default function SettingsScreen({ onBack, onLogout }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const profile = await getProfile();
      setDisplayName(profile.displayName);
      setBio(profile.bio || '');
      setCountry(profile.country || '');
      setUsername(profile.username);
    } catch {
      const stored = await getStoredAuth();
      if (stored) {
        setDisplayName(stored.displayName);
        setBio(stored.bio || '');
        setCountry(stored.country || '');
        setUsername(stored.username);
      }
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName, bio, country });
      await updateStoredProfile(displayName, bio, country);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to update profile:', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={onBack}>
          <ArrowLeftIcon size={theme.fontSize.icon} color="#333" />
        </Pressable>
        <Text style={styles.toolTitle}>Settings</Text>
        <View style={styles.toolBtn} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Your delivery address:</Text>
        <Text style={styles.fixedValue}>{username || 'Unknown'}</Text>
        <Text style={styles.note}>Other users can send letters to this address. It cannot be changed.</Text>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="How others see you..."
          placeholderTextColor="#999"
          maxLength={50}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell others a little about yourself..."
          placeholderTextColor="#999"
          maxLength={200}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Country</Text>
        <CountryPicker selected={country} onSelect={setCountry} />
        <Text style={styles.note}>
          Your country determines how long letters take to arrive.
        </Text>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.bottomSection}>
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    backgroundColor: '#fff',
  },
  toolbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, height: theme.toolbarHeight,
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0', backgroundColor: '#f8f8f8',
  },
  toolTitle: { fontSize: theme.fontSize.title, fontWeight: '700', color: '#000' },
  toolBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { paddingHorizontal: 24 },
  label: {
    fontSize: theme.fontSize.label, fontWeight: '600', color: '#333',
    marginBottom: theme.spacing.xs, marginTop: theme.spacing.md,
  },
  fixedValue: {
    fontSize: theme.fontSize.body, color: '#555',
    padding: theme.inputPadding, backgroundColor: '#f5f5f5',
    borderRadius: theme.borderRadius,
  },
  note: {
    fontSize: theme.fontSize.small, color: '#999', marginTop: theme.spacing.xs,
  },
  input: {
    borderWidth: 2, borderColor: '#ccc', borderRadius: theme.borderRadius,
    paddingHorizontal: theme.inputPadding, paddingVertical: theme.inputPadding,
    fontSize: theme.fontSize.input, color: '#000', height: theme.inputHeight,
  },
  bioInput: {
    height: 'auto',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: theme.spacing.lg, paddingVertical: theme.buttonPaddingV,
    backgroundColor: '#333', borderRadius: theme.borderRadius, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: theme.fontSize.button, fontWeight: '700' },
  bottomSection: {
    marginTop: 'auto', padding: 24, borderTopWidth: 2, borderTopColor: '#eee',
  },
  logoutBtn: {
    paddingVertical: theme.buttonPaddingV, backgroundColor: '#fef2f2', borderRadius: theme.borderRadius,
    alignItems: 'center', borderWidth: 2, borderColor: '#fca5a5', paddingHorizontal: 16,
  },
  logoutBtnText: {
    color: '#dc2626', fontSize: theme.fontSize.button, fontWeight: '700',
  },
});
