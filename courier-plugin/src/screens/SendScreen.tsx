import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { PluginManager, PluginCommAPI, PluginFileAPI, NativePluginManager } from 'sn-plugin-lib';
import { sendLetter, lookupUser } from '../api';
import { UserLookup } from '../types';
import { theme } from '../theme';

interface Props {
  onBack: () => void;
  onSent: () => void;
}

type Mode = 'public' | 'direct';

function CardContent({ notePath, pageCount, mode, setMode, description, setDescription, recipient, setRecipient, lookupResult, setLookupResult, lookupError, setLookupError, confirmed, setConfirmed, disclaimerAgreed, setDisclaimerAgreed, handleLookup, handleSend, canSend, error }: {
  notePath: string | null;
  pageCount: number;
  mode: Mode;
  setMode: (m: Mode) => void;
  description: string;
  setDescription: (d: string) => void;
  recipient: string;
  setRecipient: (r: string) => void;
  lookupResult: UserLookup | null;
  setLookupResult: (r: UserLookup | null) => void;
  lookupError: string | null;
  setLookupError: (e: string | null) => void;
  confirmed: boolean;
  setConfirmed: (c: boolean) => void;
  disclaimerAgreed: boolean;
  setDisclaimerAgreed: (a: boolean) => void;
  handleLookup: () => void;
  handleSend: () => void;
  canSend: boolean;
  error: string | null;
}) {
  return (
    <ScrollView style={styles.cardScroll} bounces={false}>
      {notePath && (
        <Text style={styles.fileSubtitle} numberOfLines={1}>
          {notePath} · {pageCount} page{pageCount !== 1 ? 's' : ''}
        </Text>
      )}

      {error ? (
        <Text style={[styles.errorText, { marginBottom: theme.spacing.md }]}>{error}</Text>
      ) : null}

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, mode === 'public' && styles.modeBtnActive]}
          onPress={() => { setMode('public'); setConfirmed(false); setDisclaimerAgreed(false); }}
        >
          <Text style={[styles.modeBtnText, mode === 'public' && styles.modeBtnTextActive]}>Public</Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === 'direct' && styles.modeBtnActive]}
          onPress={() => { setMode('direct'); setConfirmed(false); }}
        >
          <Text style={[styles.modeBtnText, mode === 'direct' && styles.modeBtnTextActive]}>Send to User</Text>
        </Pressable>
      </View>

      {mode === 'public' ? (
        <View style={styles.form}>
          <Text style={styles.infoText}>Visible to everyone on Courier.</Text>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your letter..."
            placeholderTextColor="#999"
            maxLength={200}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerTitle}>Before you publish</Text>
            <Text style={styles.disclaimerText}>
              By publishing this letter publicly, you confirm that:
            </Text>
            <Text style={styles.disclaimerBullet}>{'\u2022'}  This content is your own original work</Text>
            <Text style={styles.disclaimerBullet}>{'\u2022'}  It does not contain private information you wish to keep confidential</Text>
            <Text style={styles.disclaimerBullet}>{'\u2022'}  It is appropriate for public viewing</Text>
            <Text style={styles.disclaimerBullet}>{'\u2022'}  It will be visible to all Courier users and cannot be retracted</Text>
            <Text style={styles.disclaimerFooter}>Don't be a dick. Make sure it's suitable for public consumption.</Text>
            <Pressable style={styles.disclaimerCheck} onPress={() => setDisclaimerAgreed(!disclaimerAgreed)}>
              <View style={[styles.checkbox, disclaimerAgreed && styles.checkboxChecked]}>
                {disclaimerAgreed && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.disclaimerCheckText}>I understand and agree</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.infoText}>Send to another Courier user.</Text>
          <Text style={styles.label}>Recipient username</Text>
          <View style={styles.lookupRow}>
            <TextInput
              style={[styles.input, styles.lookupInput]}
              value={recipient}
              onChangeText={(t) => { setRecipient(t.toLowerCase()); setLookupResult(null); setLookupError(null); setConfirmed(false); }}
              placeholder="brave-crimson-falcon"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.lookupBtn} onPress={handleLookup}>
              <Text style={styles.lookupBtnText}>Look up</Text>
            </Pressable>
          </View>

          {lookupResult && !confirmed && (
            <View style={styles.lookupCard}>
              <Text style={styles.lookupFound}>
                ✓  {lookupResult.displayName || lookupResult.username}
              </Text>
              {lookupResult.bio ? (
                <Text style={styles.lookupBio}>{lookupResult.bio}</Text>
              ) : (
                <Text style={styles.lookupBioNone}>This user has not set a bio.</Text>
              )}
              {lookupResult.country ? (
                <Text style={styles.lookupCountry}>
                  {lookupResult.country === '??' ? 'Location not set' : `📍  ${lookupResult.country}`}
                </Text>
              ) : null}
              {lookupResult.deliveryEstimateHours ? (
                <Text style={styles.lookupEta}>
                  {lookupResult.deliveryEstimateHours === 1
                    ? '📬  Delivery estimate: ~1 hour'
                    : `📬  Delivery estimate: ~${lookupResult.deliveryEstimateHours} hours`}
                </Text>
              ) : null}
              <Text style={styles.lookupConfirmPrompt}>Is this the right person?</Text>
              <View style={styles.confirmRow}>
                <Pressable style={styles.confirmBtn} onPress={() => setConfirmed(true)}>
                  <Text style={styles.confirmBtnText}>That's them!</Text>
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={() => { setLookupResult(null); setRecipient(''); }}>
                  <Text style={styles.cancelBtnText}>Try again.</Text>
                </Pressable>
              </View>
            </View>
          )}

          {lookupError && <Text style={styles.lookupErr}>{lookupError}</Text>}
        </View>
      )}

      <Pressable
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!canSend}
      >
        <Text style={styles.sendBtnText}>
          {mode === 'public' ? 'Publish Publicly' : 'Send Letter'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export default function SendScreen({ onBack, onSent }: Props) {
  const [notePath, setNotePath] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('public');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [lookupResult, setLookupResult] = useState<UserLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState(false);
  const [deliverAt, setDeliverAt] = useState<string | null>(null);

  useEffect(() => { loadCurrentNote(); }, []);

  async function loadCurrentNote() {
    try {
      const fileResp = await PluginCommAPI.getCurrentFilePath();
      const filePath = (fileResp as any)?.result || (fileResp as any);
      if (!filePath || typeof filePath !== 'string') {
        setError('No note file is currently open.');
        setLoading(false);
        return;
      }
      const name = filePath.split('/').pop() || filePath;
      setNotePath(name);
      const totalResp = await PluginFileAPI.getNoteTotalPageNum(filePath);
      const total = (totalResp as any)?.result || 0;
      setPageCount(total);

      // Auto-populate description from on-device handwriting recognition
      if (total > 0) {
        try {
          const [sizeResp, elementsResp] = await Promise.all([
            PluginFileAPI.getPageSize(filePath, 0),
            PluginFileAPI.getElements(filePath as any, 0),
          ]);
          const size = (sizeResp as any)?.result;
          const elements = (elementsResp as any)?.result;
          if (size && elements?.length > 0) {
            const recogResp = await PluginCommAPI.recognizeElements(elements, size);
            if ((recogResp as any)?.success && (recogResp as any)?.result) {
              const text = (recogResp as any).result as string;
              const truncated = text.replace(/\s+/g, ' ').trim().slice(0, 200);
              if (truncated) setDescription(truncated);
            }
          }
        } catch {
          // Recognition is best-effort — fail silently
        }
      }
    } catch (err: any) {
      setError(`Failed to read note: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleLookup = async () => {
    if (!recipient.trim()) return;
    setLookupResult(null);
    setLookupError(null);
    setConfirmed(false);
    try {
      const result = await lookupUser(recipient.trim().toLowerCase());
      if (result.exists) {
        setLookupResult(result);
      } else {
        setLookupError('User not found');
      }
    } catch (err: any) {
      setLookupError(err.message);
    }
  };

  const handleSend = async () => {
    setError(null);
    setSending(true);
    setStatus('Generating pages...');
    try {
      const fileResp = await PluginCommAPI.getCurrentFilePath();
      const filePath = (fileResp as any)?.result || (fileResp as any);
      if (!filePath || typeof filePath !== 'string') throw new Error('No file open');

      const pluginDir = (await NativePluginManager.getPluginDirPath()) || '/storage/emulated/0';
      const batchId = Date.now();
      const pagePaths: string[] = [];

      for (let page = 0; page < pageCount; page++) {
        setStatus(`Generating page ${page + 1} of ${pageCount}...`);
        const pngPath = `${pluginDir}/send_${batchId}_p${page}.png`;
        const pngRes = await PluginFileAPI.generateNotePng({
          notePath: filePath, page, times: 1, pngPath, type: 0,
        });
        if (pngRes && (pngRes as any).success === true) {
          pagePaths.push(pngPath);
        }
      }

      setStatus('Uploading...');
      const result = await sendLetter(
        pagePaths,
        mode === 'public' ? description.trim() : '',
        mode === 'direct' ? recipient.trim().toLowerCase() : null,
      );
      setDeliverAt(result.deliverAt || null);
      setSuccess(true);
      setSending(false);
    } catch (err: any) {
      setError(err.message);
      setSending(false);
    }
  };

  const canSend = !!((mode === 'public' && disclaimerAgreed) || (mode === 'direct' && lookupResult && confirmed));

  return (
    <Pressable style={styles.overlay} onPress={onBack}>
      <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
        {loading ? (
          <View style={styles.innerState}>
            <ActivityIndicator />
            <Text style={styles.statusText}>Reading note...</Text>
          </View>
        ) : success ? (
          <View style={styles.innerState}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>
              {mode === 'public'
                ? 'Public letter published!'
                : `Letter sent to ${lookupResult?.displayName || lookupResult?.username || recipient.trim()}!`}
            </Text>
            <Text style={styles.successSub}>
              {mode === 'public'
                ? 'Your letter is now visible on the public feed.'
                : deliverAt
                  ? `It will arrive in ~${Math.max(1, Math.round((new Date(deliverAt).getTime() - Date.now()) / (1000 * 60 * 60)))} hours.`
                  : 'It is on its way to their inbox.'}
            </Text>
            <Pressable style={styles.successBtn} onPress={onSent}>
              <Text style={styles.successBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : sending ? (
          <View style={styles.innerState}>
            <ActivityIndicator />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : error && !notePath ? (
          <View style={styles.innerState}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={loadCurrentNote}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.handle} />
            <CardContent
              notePath={notePath}
              pageCount={pageCount}
              mode={mode}
              setMode={setMode}
              description={description}
              setDescription={setDescription}
              recipient={recipient}
              setRecipient={setRecipient}
              lookupResult={lookupResult}
              setLookupResult={setLookupResult}
              lookupError={lookupError}
              setLookupError={setLookupError}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              disclaimerAgreed={disclaimerAgreed}
              setDisclaimerAgreed={setDisclaimerAgreed}
              handleLookup={handleLookup}
              handleSend={handleSend}
              canSend={canSend}
              error={error}
            />
          </>
        )}
      </Pressable>
    </Pressable>
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
  card: {
    width: '92%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d0d0d0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  cardScroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  fileSubtitle: {
    fontSize: theme.fontSize.meta,
    color: '#888',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  innerState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: 16,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: theme.borderRadius,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: '#333', borderColor: '#333' },
  modeBtnText: { fontSize: theme.fontSize.button, fontWeight: '600', color: '#333' },
  modeBtnTextActive: { color: '#fff' },
  form: { marginBottom: theme.spacing.md },
  infoText: {
    fontSize: theme.fontSize.small,
    color: '#888',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fontSize.label,
    fontWeight: '600',
    color: '#333',
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: theme.borderRadius,
    paddingHorizontal: theme.inputPadding,
    paddingVertical: 16,
    fontSize: theme.fontSize.input,
    color: '#000',
    minHeight: theme.inputHeight,
  },
  lookupRow: { flexDirection: 'row', gap: 12 },
  lookupInput: { flex: 1 },
  lookupBtn: {
    paddingHorizontal: 20,
    backgroundColor: '#e8e8e8',
    borderRadius: theme.borderRadius,
    justifyContent: 'center',
    height: theme.inputHeight + 8,
  },
  lookupBtnText: { fontSize: theme.fontSize.button, fontWeight: '600', color: '#000' },
  lookupCard: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: '#2a0',
    borderRadius: theme.borderRadius,
    backgroundColor: '#f6fff6',
  },
  lookupFound: {
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: '#2a0',
    marginBottom: theme.spacing.sm,
  },
  lookupBio: {
    fontSize: theme.fontSize.body,
    color: '#333',
    lineHeight: theme.fontSize.body + 6,
    marginBottom: theme.spacing.md,
  },
  lookupBioNone: {
    fontSize: theme.fontSize.meta,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
  lookupConfirmPrompt: {
    fontSize: theme.fontSize.meta,
    color: '#666',
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#2a0',
    borderRadius: theme.borderRadius,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: theme.fontSize.button, fontWeight: '700' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#e8e8e8',
    borderRadius: theme.borderRadius,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontSize: theme.fontSize.button, fontWeight: '600' },
  lookupErr: { fontSize: theme.fontSize.body, color: '#c00', marginTop: theme.spacing.md },
  sendBtn: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.buttonPaddingV,
    backgroundColor: '#333',
    borderRadius: theme.borderRadius,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: theme.fontSize.button, fontWeight: '700' },
  disclaimerBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: '#e0c000',
    borderRadius: theme.borderRadius,
    backgroundColor: '#fffdf0',
  },
  disclaimerTitle: {
    fontSize: theme.fontSize.label,
    fontWeight: '700',
    color: '#333',
    marginBottom: theme.spacing.sm,
  },
  disclaimerText: {
    fontSize: theme.fontSize.small,
    color: '#555',
    marginBottom: theme.spacing.sm,
  },
  disclaimerBullet: {
    fontSize: theme.fontSize.small,
    color: '#555',
    lineHeight: theme.fontSize.small + 10,
    paddingLeft: 4,
  },
  disclaimerFooter: {
    fontSize: theme.fontSize.small,
    color: '#888',
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  disclaimerCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#2a0',
    backgroundColor: '#2a0',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disclaimerCheckText: {
    fontSize: theme.fontSize.meta,
    color: '#333',
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: theme.buttonPaddingV,
    backgroundColor: '#333',
    borderRadius: theme.borderRadius,
  },
  retryBtnText: { color: '#fff', fontSize: theme.fontSize.button, fontWeight: '600' },
  lookupCountry: {
    fontSize: theme.fontSize.small,
    color: '#555',
    marginBottom: theme.spacing.sm,
  },
  lookupEta: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: '#333',
    marginBottom: theme.spacing.sm,
  },
  statusText: { fontSize: theme.fontSize.body, color: '#333' },
  errorText: {
    fontSize: theme.fontSize.body,
    color: '#c00',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 72,
    color: '#2a0',
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  successTitle: {
    fontSize: theme.fontSize.header,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  successSub: {
    fontSize: theme.fontSize.body,
    color: '#666',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  successBtn: {
    paddingHorizontal: 40,
    paddingVertical: theme.buttonPaddingV,
    backgroundColor: '#333',
    borderRadius: theme.borderRadius,
    alignItems: 'center',
    minWidth: 150,
  },
  successBtnText: {
    color: '#fff',
    fontSize: theme.fontSize.button,
    fontWeight: '700',
  },
});
