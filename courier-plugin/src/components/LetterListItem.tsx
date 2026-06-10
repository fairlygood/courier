import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { getAssetUrl, getAuthToken } from '../api';
import { countryFlag, countryName } from '../countries';
import { LetterSummary } from '../types';
import { theme } from '../theme';
import { TrashIcon } from './Icons';

interface Props {
  letter: LetterSummary;
  onPress: () => void;
  onDelete?: () => void;
  isUnread?: boolean;
}

export default function LetterListItem({ letter, onPress, onDelete, isUnread }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {letter.thumbnailUrl ? (
        <Image
          source={{ uri: getAssetUrl(letter.thumbnailUrl), headers: { Authorization: `Bearer ${getAuthToken()}` } }}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderText}>{letter.pageCount} page{letter.pageCount !== 1 ? 's' : ''}</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.authorRow}>
          {isUnread ? <View style={styles.unreadDot} /> : null}
          <Text style={styles.authorName} numberOfLines={1}>
            {letter.authorName || letter.authorUsername}
          </Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {letter.description || 'No description'}
        </Text>
        {letter.authorCountry ? (
          <Text style={styles.country}>
            {countryFlag(letter.authorCountry)}  {countryName(letter.authorCountry)}
          </Text>
        ) : null}
      </View>
      {onDelete ? (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <TrashIcon size={22} color="#c00" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  thumb: {
    width: 150,
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  thumbPlaceholderText: {
    fontSize: theme.fontSize.small,
    color: '#999',
  },
  info: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  authorName: {
    fontSize: theme.fontSize.label,
    fontWeight: '700',
    color: '#111',
    flex: 1,
  },
  description: {
    fontSize: theme.fontSize.meta,
    color: '#555',
    lineHeight: theme.fontSize.meta + 6,
    marginBottom: 8,
  },
  country: {
    fontSize: theme.fontSize.small,
    color: '#888',
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
  },
});
