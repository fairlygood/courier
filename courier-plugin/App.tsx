import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { PluginManager } from 'sn-plugin-lib';

import RegisterScreen from './src/screens/RegisterScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SendScreen from './src/screens/SendScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InboxScreen from './src/screens/InboxScreen';

import { setAuthToken, setRefreshToken, getAuthToken, register, login } from './src/api';
import { getStoredAuth, saveAuth, clearStoredAuth } from './src/db';
import { loadCustomFonts } from './src/fonts';

type Screen = 'loading' | 'register' | 'login' | 'dashboard' | 'send' | 'settings' | 'inbox';

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState<string | null>(null);
  const initAuthRef = useRef<() => Promise<void>>();
  const navigatingRef = useRef(false);

  function resetToRegister() {
    setAuthToken(null);
    setRefreshToken(null);
    clearStoredAuth();
    setScreen('register');
  }

  async function initAuth() {
    try {
      const stored = await getStoredAuth();
      if (!stored) {
        setScreen('register');
        setLoaded(true);
        return;
      }
      setAuthToken(stored.token);
      setRefreshToken(stored.refreshToken);
      try {
        const { getProfile } = require('./src/api');
        await getProfile();
      } catch {
        resetToRegister();
        setLoaded(true);
        return;
      }

      const { checkPendingButton } = require('./index');
      const pendingId = checkPendingButton();
      if (pendingId === 200) {
        setScreen('send');
      } else {
        setScreen('dashboard');
      }
      setLoaded(true);
    } catch {
      setScreen('register');
      setLoaded(true);
    }
  }

  initAuthRef.current = initAuth;

  useEffect(() => {
    loadCustomFonts();
    initAuth();
  }, []);

  useEffect(() => {
    const sub = PluginManager.registerButtonListener({
      onButtonPress: (event: { id: number }) => {
        if (navigatingRef.current) return;
        if (!getAuthToken()) {
          initAuthRef.current?.();
          return;
        }
        if (event.id === 200) setScreen('send');
        else if (event.id === 100) setScreen('dashboard');
      },
    });
    return () => { try { sub?.remove?.(); } catch {} };
  }, []);

  const handleRegister = async (displayName: string, bio: string, country: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    navigatingRef.current = true;
    try {
      const res = await register(displayName, bio, country || undefined, password);
      setAuthToken(res.token);
      setRefreshToken(res.refreshToken);
      await saveAuth({
        token: res.token,
        refreshToken: res.refreshToken || '',
        userId: res.user.id,
        username: res.user.username,
        displayName: res.user.displayName,
        bio: res.user.bio || '',
        country: res.user.country || '',
      });
      setWelcomeUsername(res.user.username);
      navigatingRef.current = false;
    } catch (err: any) {
      navigatingRef.current = false;
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    navigatingRef.current = true;
    try {
      const res = await login(username, password);
      setAuthToken(res.token);
      setRefreshToken(res.refreshToken);
      await saveAuth({
        token: res.token,
        refreshToken: res.refreshToken || '',
        userId: res.user.id,
        username: res.user.username,
        displayName: res.user.displayName,
        bio: res.user.bio || '',
        country: res.user.country || '',
      });
      setScreen('dashboard');
      navigatingRef.current = false;
    } catch (err: any) {
      navigatingRef.current = false;
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    clearStoredAuth();
    setAuthToken(null);
    setRefreshToken(null);
    setScreen('register');
    PluginManager.closePluginView();
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} />
      </View>
    );
  }

  if (welcomeUsername) {
    return (
      <View style={styles.container}>
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>You're in!</Text>
          <Text style={styles.welcomeBody}>
            Your mailing address is:
          </Text>
          <Text style={styles.welcomeAddress}>{welcomeUsername}</Text>
          <Text style={styles.welcomeBody}>
            Other users can send letters to you at this address.
          </Text>
          <Text style={styles.welcomeNote}>
            You'll need this address and your password to sign in again.{'\n'}
            Make sure you save them both.
          </Text>
          <Pressable
            style={styles.welcomeBtn}
            onPress={() => { setWelcomeUsername(null); setScreen('dashboard'); }}
          >
            <Text style={styles.welcomeBtnText}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (screen === 'register') {
    return (
      <RegisterScreen
        onRegister={handleRegister}
        onGoToLogin={() => { setAuthError(null); setScreen('login'); }}
        error={authError}
        loading={authLoading}
      />
    );
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onGoToRegister={() => { setAuthError(null); setScreen('register'); }}
        error={authError}
        loading={authLoading}
      />
    );
  }

  if (screen === 'send') {
    return (
      <SendScreen
        onBack={() => PluginManager.closePluginView()}
        onSent={() => PluginManager.closePluginView()}
      />
    );
  }

  if (screen === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setScreen('dashboard')}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'inbox') {
    return (
      <InboxScreen
        onBack={() => setScreen('dashboard')}
        onSettings={() => setScreen('settings')}
      />
    );
  }

  return (
    <DashboardScreen
      onSettings={() => setScreen('settings')}
      onInbox={() => setScreen('inbox')}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  welcome: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  welcomeBody: {
    fontSize: 22,
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  welcomeAddress: {
    fontSize: 30,
    fontWeight: '700',
    color: '#000',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
  },
  welcomeNote: {
    fontSize: 20,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 28,
    lineHeight: 28,
  },
  welcomeBtn: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: '#333',
    borderRadius: 14,
  },
  welcomeBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
});

export default App;
