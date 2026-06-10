import React, { useState } from 'react';
import { View, Text, Pressable, Image, Modal, StyleSheet } from 'react-native';
import { getAssetUrl, getAuthToken, downloadLetterPdf } from '../api';
import { LetterSummary } from '../types';
import { theme } from '../theme';
import { formatDate } from '../utils';

const DOWNLOAD_DIR = '/storage/emulated/0/Inbox/Courier';

interface Props {
  letter: LetterSummary | null;
  onClose: () => void;
}

export default function LetterDetailModal({ letter, onClose }: Props) {
  const [dlLoading, setDlLoading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  if (!letter) return null;

  const handleDownload = async () => {
    setDlLoading(true);
    try {
      const safeName = (letter.description || 'letter').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const filename = `${safeName}_${letter.id.slice(0, 8)}.pdf`;
      await downloadLetterPdf(letter.id, `${DOWNLOAD_DIR}/${filename}`);
      setDownloaded(true);
      setDownloadedFile(filename);
    } catch (err: any) {
      console.error('Download failed:', err.message);
    } finally {
      setDlLoading(false);
    }
  };

  const previewUrl = letter.thumbnailUrl ? getAssetUrl(letter.thumbnailUrl) : null;

  return (
    <Modal visible={!!letter} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          {previewUrl ? (
            <Image
              source={{ uri: previewUrl, headers: { Authorization: `Bearer ${getAuthToken()}` } }}
              style={styles.preview}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.preview, styles.previewPlaceholder]}>
              <Text style={styles.previewPlaceholderText}>{letter.pageCount} page{letter.pageCount !== 1 ? 's' : ''}</Text>
            </View>
          )}

          <Text style={styles.title}>
            {letter.description || 'No description'}
          </Text>
          <Text style={styles.meta}>
            From: {letter.authorUsername || 'anonymous'}
          </Text>
          <Text style={styles.meta}>
            {letter.pageCount} page{letter.pageCount !== 1 ? 's' : ''} · {formatDate(letter.createdAt)}
          </Text>

          <Pressable
            style={[styles.dlBtn, downloaded && styles.dlBtnDone]}
            onPress={handleDownload}
            disabled={dlLoading || downloaded}
          >
            <Text style={styles.dlBtnText}>
              {dlLoading ? 'Downloading...' : downloaded ? '✓ Downloaded' : 'Download PDF'}
            </Text>
          </Pressable>
          {downloadedFile ? (
            <Text style={styles.dlNote}>
              Saved to Inbox → Courier → {downloadedFile}
            </Text>
          ) : null}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: theme.spacing.md,
  },
  content: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: theme.spacing.md,
    backgroundColor: '#fafafa',
  },
  previewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  previewPlaceholderText: {
    fontSize: theme.fontSize.body,
    color: '#999',
  },
  title: {
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    lineHeight: theme.fontSize.body + 8,
    marginBottom: theme.spacing.sm,
  },
  meta: {
    fontSize: theme.fontSize.meta,
    color: '#555',
    marginBottom: theme.spacing.xs,
  },
  dlBtn: {
    width: '100%',
    paddingVertical: theme.buttonPaddingV,
    backgroundColor: '#333',
    borderRadius: theme.borderRadius,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  dlBtnDone: { opacity: 0.5 },
  dlBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.button,
    fontWeight: '700',
  },
  dlNote: {
    fontSize: theme.fontSize.small,
    color: '#888',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: theme.fontSize.small + 6,
  },
  closeBtn: { marginTop: theme.spacing.md },
  closeText: { fontSize: theme.fontSize.meta, color: '#666' },
});
