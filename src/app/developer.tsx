import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { DetailList, DetailRow, StatusBadge } from '../components/payments';
import { Text } from '../components/Text';
import { Button, Field, Notice, Panel, Screen, SectionHeader, Segmented } from '../components/ui';
import { checkNfcSupport, NfcDemoError, parseDemoTagText, scanDemoTag, type NfcSupport } from '../lib/demoNfc';
import { useWallet } from '../lib/wallet';
import { colors, fonts, radius, space, type } from '../theme';

/**
 * Hidden developer tools (Settings → tap the version number 7 times).
 * Demo-only controls live here so the user-facing screens stay clean.
 * This is a convenience screen for the prototype, not a security boundary.
 */
export default function DeveloperScreen() {
  const { data, resetDemo, clearDemoPayments, setOnboarded, setDemoOutcome, setDevUnlocked, wipeAll } = useWallet();
  const [message, setMessage] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const say = (m: string) => setMessage(m);
  const runtime = runtimeLabel();
  const raw = JSON.stringify(data, null, 2);

  return (
    <Screen edges={['bottom']}>
      <Notice tone="warning" title="Developer tools" icon="code">
        For testing the prototype. Changes affect only this device.
      </Notice>

      {/* Link back to the user-facing app */}
      <SectionHeader title="User view" />
      <View style={styles.switchRow}>
        <Button
          label="Wallet"
          variant="secondary"
          size="sm"
          icon="wallet"
          onPress={() => router.navigate('/')}
          accessibilityHint="Returns to the user-facing wallet"
          style={{ flex: 1 }}
        />
        <Button
          label="Settings"
          variant="secondary"
          size="sm"
          icon="settings"
          onPress={() => router.navigate('/settings')}
          accessibilityHint="Returns to the user-facing settings"
          style={{ flex: 1 }}
        />
      </View>
      <Text style={[type.caption, { marginTop: space.sm }]}>
        Settings keeps a Developer tools link so you can switch back at any time.
      </Text>

      {message ? (
        <Text style={styles.message} accessibilityRole="alert">
          {message}
        </Text>
      ) : null}

      {/* Build info */}
      <SectionHeader title="Build" />
      <DetailList>
        <DetailRow label="App" value={`${Constants.expoConfig?.name ?? 'TAPO'} ${Constants.expoConfig?.version ?? ''}`} />
        <DetailRow label="Platform" value={`${Platform.OS} ${String(Platform.Version ?? '')}`.trim()} />
        <DetailRow label="Running in" value={runtime} />
        <DetailRow label="Expo SDK" value={Constants.expoConfig?.sdkVersion ?? 'Unknown'} />
        <DetailRow label="Dev mode" value={__DEV__ ? 'On' : 'Off'} last />
      </DetailList>

      {/* Demo controls */}
      <SectionHeader title="Demo controls" />
      <Panel style={{ gap: space.md }}>
        <Text style={type.label}>Tap-to-pay demo result</Text>
        <Segmented
          label="Tap-to-pay demo result"
          value={data.devSettings?.demoOutcome ?? 'approved'}
          onChange={(v) => {
            setDemoOutcome(v);
            say(`Demo payments will now be ${v === 'approved' ? 'approved' : 'declined'} (simulated).`);
          }}
          options={[
            { value: 'approved', label: 'Approve' },
            { value: 'declined', label: 'Decline' },
          ]}
        />
        <Text style={type.caption}>Lets you demonstrate both outcomes. No money ever moves.</Text>
        <View style={styles.divider} />
        <Button
          label="Reload sample data"
          variant="secondary"
          size="sm"
          icon="refresh"
          onPress={async () => {
            await resetDemo();
            say('Sample cards and transactions reloaded.');
          }}
        />
        <Button
          label={`Clear demo receipts (${data.demoPayments?.length ?? 0})`}
          variant="secondary"
          size="sm"
          icon="receipt"
          disabled={!data.demoPayments?.length}
          onPress={() => {
            clearDemoPayments();
            say('Demo receipts cleared.');
          }}
        />
        <Button
          label="Replay introduction"
          variant="secondary"
          size="sm"
          icon="arrowRight"
          onPress={() => {
            setOnboarded(false);
            router.replace('/onboarding');
          }}
        />
      </Panel>

      {/* NFC tester */}
      <SectionHeader title="NFC tester" />
      <NfcTester />

      {/* Storage */}
      <SectionHeader title="Local storage" />
      <DetailList>
        <DetailRow label="Cards" value={String(data.cards.length)} />
        <DetailRow label="Sample transactions" value={String(data.transactions.length)} />
        <DetailRow label="Demo receipts" value={String(data.demoPayments?.length ?? 0)} />
        <DetailRow label="Display name" value={data.profile ? 'Set' : 'Not set'} />
        <DetailRow label="Introduction" value={data.onboarded ? 'Completed' : 'Not yet'} />
        <DetailRow label="Size" value={`${(raw.length / 1024).toFixed(1)} KB`} last />
      </DetailList>
      <Button
        label={showRaw ? 'Hide raw data' : 'Show raw data'}
        variant="ghost"
        size="sm"
        icon="code"
        onPress={() => setShowRaw((s) => !s)}
        style={{ alignSelf: 'flex-start', marginTop: space.sm }}
      />
      {showRaw ? (
        <View style={styles.rawBox}>
          <Text style={styles.raw} selectable>
            {raw.length > 6000 ? `${raw.slice(0, 6000)}\n…` : raw}
          </Text>
        </View>
      ) : null}
      <Text style={[type.caption, { fontWeight: '500', marginTop: space.sm }]}>
        Stored with AsyncStorage on this device only. Contains no card numbers, CVV, PIN, OTP or credentials.
      </Text>

      {/* Danger zone */}
      <SectionHeader title="Danger zone" />
      <Panel style={{ gap: space.md, borderColor: colors.dangerBorder }}>
        <Text style={type.small}>
          Deletes everything TAPO saved on this device — cards, name, receipts and settings — and restarts from the
          introduction with fresh sample data.
        </Text>
        {confirmWipe ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              label="Cancel"
              variant="outline"
              size="sm"
              onPress={() => setConfirmWipe(false)}
              style={{ flex: 1 }}
            />
            <Button
              label="Yes, wipe"
              variant="danger"
              size="sm"
              onPress={async () => {
                await wipeAll();
                router.replace('/onboarding');
              }}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <Button label="Wipe all local data" variant="danger" icon="trash" onPress={() => setConfirmWipe(true)} />
        )}
      </Panel>

      <Button
        label="Hide developer tools"
        variant="ghost"
        size="sm"
        icon="close"
        onPress={() => {
          setDevUnlocked(false);
          router.navigate('/settings');
        }}
        accessibilityHint="Removes the Developer tools link from Settings. Tap the version 7 times to unlock it again."
        style={{ alignSelf: 'center', marginTop: space.lg }}
      />
    </Screen>
  );
}

function runtimeLabel(): string {
  if (Platform.OS === 'web') return 'Web browser';
  switch (Constants.executionEnvironment) {
    case ExecutionEnvironment.StoreClient:
      return 'Expo Go';
    case ExecutionEnvironment.Bare:
      return 'Development build';
    case ExecutionEnvironment.Standalone:
      return 'Release build';
    default:
      return 'Unknown';
  }
}

const SUPPORT_LABELS: Record<NfcSupport, string> = {
  supported: 'Available',
  'needs-dev-build': 'Needs a development build',
  'nfc-disabled': 'NFC turned off',
  'unsupported-device': 'No NFC on this device',
  'insecure-context': 'Needs HTTPS or localhost',
  'unsupported-browser': 'Not supported in this browser',
};

/** Checks NFC support and tag parsing without starting a payment. */
function NfcTester() {
  const [support, setSupport] = useState<NfcSupport | 'checking'>('checking');
  const [checks, setChecks] = useState(0);
  const [text, setText] = useState('TAPO-DEMO:CAPSTONE-01');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    checkNfcSupport()
      .then((s) => alive && setSupport(s))
      .catch(() => alive && setSupport('unsupported-device'));
    return () => {
      alive = false;
    };
  }, [checks]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function validate() {
    try {
      const code = parseDemoTagText(text);
      setResult({ ok: true, message: `Valid demo tag. Code: ${code}` });
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : 'Invalid tag text.' });
    }
  }

  async function scan() {
    setResult(null);
    setScanning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const code = await scanDemoTag(controller.signal);
      setResult({ ok: true, message: `Read a valid demo tag. Code: ${code}` });
    } catch (e) {
      setResult({ ok: false, message: e instanceof NfcDemoError ? e.message : 'Scan failed.' });
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  }

  return (
    <Panel style={{ gap: space.md }}>
      <View style={styles.supportRow}>
        <Text style={type.label}>Status</Text>
        {support === 'checking' ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <StatusBadge status={support === 'supported' ? 'best' : 'unavailable'} label={SUPPORT_LABELS[support]} />
        )}
      </View>
      <Button
        label="Check again"
        variant="ghost"
        size="sm"
        icon="refresh"
        onPress={() => {
          setSupport('checking');
          setChecks((n) => n + 1);
        }}
        style={{ alignSelf: 'flex-start' }}
      />

      <Field
        label="Test tag text"
        value={text}
        onChangeText={setText}
        autoCapitalize="characters"
        hint="Checks the text exactly as the demo would, without scanning."
        style={{ marginBottom: 0 }}
      />
      <Button label="Validate text" variant="secondary" size="sm" onPress={validate} />

      {support === 'supported' ? (
        scanning ? (
          <Button label="Cancel scan" variant="outline" size="sm" icon="close" onPress={() => abortRef.current?.abort()} />
        ) : (
          <Button label="Scan a tag (no payment)" size="sm" icon="tap" onPress={scan} />
        )
      ) : null}

      {result ? (
        <View
          style={[styles.result, { borderColor: result.ok ? '#1F4A3A' : colors.dangerBorder }]}
          accessibilityRole="alert"
        >
          <Text style={[type.small, { color: result.ok ? colors.success : colors.danger }]}>{result.message}</Text>
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  message: {
    color: colors.success,
    fontWeight: '600',
    marginTop: space.md,
  },
  switchRow: { flexDirection: 'row', gap: space.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  rawBox: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  raw: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, color: colors.textMuted },
  supportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  result: { padding: space.md, borderRadius: radius.md, borderWidth: 1 },
});
