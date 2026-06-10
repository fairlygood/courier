import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { PluginManager } from 'sn-plugin-lib';
import Logo from '../../components/Logo';
import LetterListItem from '../components/LetterListItem';
import LetterDetailModal from '../components/LetterDetailModal';
import { InboxIcon, SettingsIcon, ArrowLeftIcon } from '../components/Icons';
import { getInbox } from '../api';
import { getStoredAuth } from '../db';
import { countryFlag } from '../countries';
import { LetterSummary } from '../types';
import { theme } from '../theme';
import { groupByDate } from '../utils';

interface Props {
  onBack: () => void;
  onSettings: () => void;
}

export default function InboxScreen({ onBack, onSettings }: Props) {
  const [letters, setLetters] = useState<LetterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LetterSummary | null>(null);
  const [now, setNow] = useState(Date.now());
  const [userCountry, setUserCountry] = useState('');

  // Re-render every 60s to update countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ib = await getInbox();
      setLetters(ib);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getStoredAuth().then((auth) => {
      if (auth?.country) setUserCountry(auth.country);
    });
  }, []);

  function hoursRemaining(deliverAt: string): number {
    return Math.max(0, Math.ceil((new Date(deliverAt).getTime() - now) / (1000 * 60 * 60)));
  }

  function deliveryProgress(letter: LetterSummary): number {
    const created = new Date(letter.createdAt).getTime();
    const deliver = new Date(letter.deliverAt).getTime();
    if (deliver <= created) return 1;
    const pct = (now - created) / (deliver - created);
    return Math.min(1, Math.max(0, pct));
  }

  const inTransit = letters.filter((l) => new Date(l.deliverAt).getTime() > now);
  const delivered = letters.filter((l) => new Date(l.deliverAt).getTime() <= now);

  const items = (() => {
    type Item = { type: 'header' | 'section' | 'date' | 'letter' | 'empty' | 'transitItem'; key: string; date?: string; letter?: LetterSummary; sectionLabel?: string; sectionSub?: string };
    const list: Item[] = [];
    list.push({ type: 'header', key: 'header' });

    if (letters.length === 0) {
      list.push({ type: 'empty', key: 'empty' });
      return list;
    }

    // In Transit section
    if (inTransit.length > 0) {
      list.push({ type: 'section', key: 'section-transit', sectionLabel: 'In Transit', sectionSub: `${inTransit.length} letter${inTransit.length !== 1 ? 's' : ''} on the way` });
      for (const letter of inTransit) {
        list.push({ type: 'transitItem', key: `transit-${letter.id}`, letter });
      }
    }

    // Delivered section
    if (delivered.length > 0) {
      list.push({ type: 'section', key: 'section-delivered', sectionLabel: 'Delivered', sectionSub: undefined });
      const groups = groupByDate(delivered);
      for (const [date, items] of groups) {
        list.push({ type: 'date', key: `date-${date}`, date });
        for (const letter of items) {
          list.push({ type: 'letter', key: letter.id, letter });
        }
      }
    }

    return list;
  })();

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={onBack}>
          <ArrowLeftIcon size={theme.fontSize.icon} color="#333" />
        </Pressable>
        <Logo size="toolbar" />
        <Pressable style={styles.toolBtn} onPress={onSettings}>
          <SettingsIcon size={theme.fontSize.icon} color="#333" />
        </Pressable>
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
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <InboxIcon size={28} color="#444" />
                  <Text style={styles.sectionHeaderText}>Inbox</Text>
                </View>
              );
            }
            if (item.type === 'empty') {
              return (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    No letters yet.{'\n'}When someone sends you a letter, it will appear here.
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
            if (item.type === 'section') {
              return (
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionDividerText}>{item.sectionLabel}</Text>
                  {item.sectionSub ? (
                    <Text style={styles.sectionDividerSub}>{item.sectionSub}</Text>
                  ) : null}
                </View>
              );
            }
            if (item.type === 'transitItem' && item.letter) {
              const letter = item.letter;
              const hrs = hoursRemaining(letter.deliverAt);
              const progress = deliveryProgress(letter);
              const senderFlag = countryFlag(letter.authorCountry);
              const destFlag = countryFlag(userCountry);

              return (
                <View style={styles.transitItem}>
                  <Text style={styles.transitAuthor} numberOfLines={1}>
                    From: {letter.authorName || letter.authorUsername}
                  </Text>

                  <View style={styles.progressRow}>
                    <Text style={styles.flag}>{senderFlag || '📬'}</Text>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>

                    <Text style={styles.flag}>{destFlag || '📬'}</Text>
                  </View>

                  <View style={styles.progressMeta}>
                    <Text style={styles.progressRemaining}>
                      {hrs <= 0
                        ? 'Arriving now...'
                        : hrs === 1
                          ? '~1 hour remaining'
                          : `~${hrs} hours remaining`}
                    </Text>
                  </View>
                </View>
              );
            }
            if (item.type === 'letter' && item.letter) {
              return (
                <LetterListItem
                  letter={item.letter}
                  onPress={() => setSelected(item.letter!)}
                  isUnread={!item.letter.isRead}
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
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal:22},
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    height: theme.toolbarHeight,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  toolBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: s.md,
    paddingTop: s.xl,
    paddingBottom: s.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeaderText: {
    fontSize: theme.fontSize.header,
    fontWeight: '700',
    color: '#444',
  },
  sectionDivider: {
    paddingHorizontal: s.md,
    paddingTop: s.xl,
    paddingBottom: s.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionDividerText: {
    fontSize: theme.fontSize.header,
    fontWeight: '700',
    color: '#444',
  },
  sectionDividerSub: {
    fontSize: theme.fontSize.small,
    color: '#888',
    marginTop: 4,
  },
  empty: {
    padding: s.xl,
    alignItems: 'center',
  },
  emptyText: {
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
  transitItem: {
    paddingHorizontal: s.md,
    paddingVertical: s.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fffdf5',
  },
  transitAuthor: {
    fontSize: theme.fontSize.small,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flag: {
    fontSize: 22,
  },
  progressTrack: {
    flex: 1,
    height: 28,
    backgroundColor: '#bbb',
    borderRadius: 14,
    overflow: 'visible',
  },
  progressFill: {
    height: 28,
    backgroundColor: '#000',
    borderRadius: 14,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  progressRemaining: {
    fontSize: theme.fontSize.small,
    color: '#888',
  },
});
