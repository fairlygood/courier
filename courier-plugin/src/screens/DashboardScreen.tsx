import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PluginManager } from 'sn-plugin-lib';
import Logo from '../../components/Logo';
import LetterListItem from '../components/LetterListItem';
import LetterDetailModal from '../components/LetterDetailModal';
import { ScrollTextIcon, InboxIcon, SettingsIcon } from '../components/Icons';
import { getPublicFeed, getInbox, deleteLetter } from '../api';
import { LetterSummary } from '../types';
import { theme } from '../theme';
import { groupByDate } from '../utils';
import { getStoredAuth } from '../db';

interface Props {
  onSettings: () => void;
  onInbox: () => void;
}

interface ListItem {
  type: 'intro' | 'notification' | 'header' | 'prompt' | 'date' | 'letter';
  key: string;
  date?: string;
  letter?: LetterSummary;
  inTransitCount?: number;
  nextArrivalHours?: number;
  unreadCount?: number;
}

export default function DashboardScreen({ onSettings, onInbox }: Props) {
  const [feed, setFeed] = useState<LetterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LetterSummary | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [inboxLetters, setInboxLetters] = useState<LetterSummary[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pf, ib, auth] = await Promise.all([getPublicFeed(), getInbox(), getStoredAuth()]);
      setFeed(pf);
      setInboxLetters(ib);
      setCurrentUserId(auth?.userId || null);
      setUsername(auth?.username || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredFeed = showMineOnly && currentUserId
    ? feed.filter((l) => l.authorId === currentUserId)
    : feed;

  const handleDelete = useCallback((letter: LetterSummary) => {
    Alert.alert(
      'Delete letter?',
      'This will permanently remove your letter from the public feed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLetter(letter.id);
              setFeed((prev) => prev.filter((l) => l.id !== letter.id));
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ],
    );
  }, []);

  const buildItems = useCallback((): ListItem[] => {
    const items: ListItem[] = [];

    items.push({ type: 'intro', key: 'intro' });

    // Notification panel between address and public letters
    const now = Date.now();
    const inTransit = inboxLetters.filter((l) => new Date(l.deliverAt).getTime() > now);
    const unreadDelivered = inboxLetters.filter((l) => new Date(l.deliverAt).getTime() <= now && !l.isRead);

    if (inTransit.length > 0 || unreadDelivered.length > 0) {
      items.push({
        type: 'notification',
        key: 'notification',
        inTransitCount: inTransit.length,
        nextArrivalHours: inTransit.length > 0
          ? Math.max(1, Math.ceil((Math.min(...inTransit.map((l) => new Date(l.deliverAt).getTime())) - now) / (1000 * 60 * 60)))
          : 0,
        unreadCount: unreadDelivered.length,
      } as any);
    }

    items.push({ type: 'header', key: 'header' });

    if (filteredFeed.length === 0) {
      items.push({ type: 'prompt', key: 'prompt' });
      return items;
    }

    const groups = groupByDate(filteredFeed);
    for (const [date, letters] of groups) {
      items.push({ type: 'date', key: `date-${date}`, date });
      for (const letter of letters) {
        items.push({ type: 'letter', key: letter.id, letter });
      }
    }

    return items;
  }, [filteredFeed, inboxLetters]);

  const items = buildItems();

  const isOwnLetter = (letter: LetterSummary) =>
    !!currentUserId && letter.authorId === currentUserId && showMineOnly;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={() => PluginManager.closePluginView()}>
          <Text style={styles.toolBtnIcon}>✕</Text>
        </Pressable>
        <Logo size="toolbar" />
        <View style={styles.toolbarRight}>
          <Pressable style={styles.toolBtn} onPress={onInbox}>
            <InboxIcon size={theme.fontSize.icon} color="#333" />
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={onSettings}>
            <SettingsIcon size={theme.fontSize.icon} color="#333" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'intro') {
              return (
                <View style={styles.intro}>
                  <Text style={styles.introText}>
                    Courier is a space for thoughtful communication..
                  </Text>
                  {username ? (
                    <View style={styles.addressBlock}>
                      <Text style={styles.addressLabel}>Your mailing address</Text>
                      <Text style={styles.addressValue}>{username}</Text>
                      <Text style={styles.addressNote}>
                        Other users can send you mail at this address.
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            }
            if (item.type === 'notification') {
              return (
                <Pressable style={styles.notification} onPress={onInbox}>
                  {item.inTransitCount! > 0 ? (
                    <Text style={styles.notificationText}>
                      You have {item.inTransitCount} letter{item.inTransitCount !== 1 ? 's' : ''} in transit.{' '}
                      {item.inTransitCount === 1
                        ? `It arrives in approx ${item.nextArrivalHours} hour${item.nextArrivalHours !== 1 ? 's' : ''}.`
                        : `The next arrives in approx ${item.nextArrivalHours} hour${item.nextArrivalHours !== 1 ? 's' : ''}.`}
                    </Text>
                  ) : null}
                  {item.unreadCount! > 0 ? (
                    <Text style={[styles.notificationText, item.inTransitCount! > 0 && styles.notificationTextGap]}>
                      You have {item.unreadCount} available letter{item.unreadCount !== 1 ? 's' : ''} to read now.
                    </Text>
                  ) : null}
                </Pressable>
              );
            }
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <ScrollTextIcon size={28} color="#444" />
                    <Text style={styles.sectionHeaderText}>Public Letters</Text>
                  </View>
                  <Pressable
                    style={[styles.mineToggle, showMineOnly && styles.mineToggleActive]}
                    onPress={() => setShowMineOnly(!showMineOnly)}
                  >
                    <Text style={[styles.mineToggleText, showMineOnly && styles.mineToggleTextActive]}>
                      My Letters
                    </Text>
                  </Pressable>
                </View>
              );
            }
            if (item.type === 'prompt') {
              return (
                <View style={styles.prompt}>
                  <Text style={styles.promptText}>
                    {showMineOnly
                      ? 'You have not published any public letters yet.'
                      : 'Publish your own letter by selecting\nSend to Courier from the plugin menu\nand selecting Public.'}
                  </Text>
                </View>
              );
            }
            if (item.type === 'date') {
              return (
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{item.date}</Text>
                </View>
              );
            }
            if (item.type === 'letter' && item.letter) {
              return (
                <LetterListItem
                  letter={item.letter}
                  onPress={() => setSelected(item.letter!)}
                  onDelete={isOwnLetter(item.letter) ? () => handleDelete(item.letter!) : undefined}
                />
              );
            }
            return null;
          }}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
        />
      )}

      <LetterDetailModal letter={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const s = theme.spacing;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal:22 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: theme.toolbarHeight,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  toolBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnIcon: { fontSize: theme.fontSize.icon },
  toolbarRight: { flexDirection: 'row', gap: 8 },
  loader: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: theme.fontSize.body,
    color: '#666',
    textAlign: 'center',
    marginBottom: s.md,
  },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: theme.buttonPaddingV,
    backgroundColor: '#333',
    borderRadius: theme.borderRadius,
  },
  retryBtnText: { color: '#fff', fontSize: theme.fontSize.button, fontWeight: '600' },
  list: { paddingBottom: s.xl },
  intro: {
    paddingHorizontal: s.md,
    paddingTop: s.lg,
    paddingBottom: s.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  introText: {
    fontSize: theme.fontSize.body,
    color: '#555',
    lineHeight: theme.fontSize.body + 8,
    marginBottom: s.md,
  },
  addressBlock: {
    backgroundColor: '#f5f5f5',
    borderRadius: theme.borderRadius,
    padding: s.md,
    marginTop: s.xs,
  },
  addressLabel: {
    fontSize: theme.fontSize.small,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: s.xs,
  },
  addressValue: {
    fontSize: theme.fontSize.subtitle,
    fontWeight: '700',
    color: '#333',
    marginBottom: s.xs,
  },
  addressNote: {
    fontSize: theme.fontSize.small,
    color: '#888',
  },
  notification: {
    marginHorizontal: s.md,
    marginTop: s.md,
    padding: s.md,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  notificationText: {
    fontSize: theme.fontSize.body,
    color: '#333',
    lineHeight: theme.fontSize.body + 8,
  },
  notificationTextGap: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s.md,
    paddingTop: s.xl,
    paddingBottom: s.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderText: {
    fontSize: theme.fontSize.header,
    fontWeight: '700',
    color: '#444',
  },
  mineToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  mineToggleActive: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  mineToggleText: {
    fontSize: theme.fontSize.meta,
    fontWeight: '600',
    color: '#666',
  },
  mineToggleTextActive: {
    color: '#fff',
  },
  prompt: {
    padding: s.xl,
    alignItems: 'center',
  },
  promptText: {
    fontSize: theme.fontSize.body,
    color: '#888',
    textAlign: 'center',
    lineHeight: theme.fontSize.body + 8,
  },
  dateHeader: {
    paddingHorizontal: s.md,
    paddingTop: s.md,
    paddingBottom: s.xs,
  },
  dateHeaderText: {
    fontSize: theme.fontSize.label,
    fontWeight: '700',
    color: '#999',
  },
});
