import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DemoModeBanner, DemoReceipt } from '../components/DemoReceipt';
import { Icon } from '../components/Icon';
import { Amount, DetailList, DetailRow, StatusBadge } from '../components/payments';
import { NumberedHeading, StepCounter } from '../components/Steps';
import { Text } from '../components/Text';
import { Button, Chip, ChipGroup, EmptyState, Field, Notice, Screen } from '../components/ui';
import {
  checkNfcSupport,
  isLikelyIOS,
  makeDemoTransactionId,
  NfcDemoError,
  openNfcSettings,
  scanDemoTag,
  type NfcErrorKind,
  type NfcSupport,
} from '../lib/demoNfc';
import { formatDate, formatRupees } from '../lib/format';
import { rankCards } from '../lib/rewards';
import type { Category, DemoPayment } from '../lib/types';
import { looksLikeCardNumber, parseNumber, validateAmount } from '../lib/validation';
import { useWallet } from '../lib/wallet';
import { colors, focusRing, isFocused, radius, space, type } from '../theme';

/** Dummy merchants for the demo. */
const MERCHANTS: { id: string; name: string; category: Category; amount: string }[] = [
  { id: 'chai', name: 'Sample Chai Stall', category: 'dining', amount: '40' },
  { id: 'mart', name: 'Demo Fresh Mart', category: 'groceries', amount: '845' },
  { id: 'metro', name: 'Example Metro Kiosk', category: 'travel', amount: '60' },
  { id: 'cinema', name: 'Placeholder Cinema', category: 'entertainment', amount: '350' },
];
const QUICK_AMOUNTS = ['50', '250', '1200'];
const STEPS = ['Set up', 'Tap', 'Review', 'Result'] as const;

type Step = 'setup' | 'tap' | 'review' | 'processing' | 'result';
type Outcome = 'approved' | 'declined';
type Trigger = { method: 'nfc-tag'; tagCode: string } | { method: 'simulated' };

const PROCESSING_STAGES = ['Reading demo session', 'Checking card label', 'Simulating authorisation'];

function validateMerchant(v: string): string | null {
  const t = v.trim();
  if (t.length < 2) return 'Enter a merchant name (at least 2 characters).';
  if (t.length > 40) return 'Keep the merchant name to 40 characters or fewer.';
  if (looksLikeCardNumber(t)) return 'That looks like a card number. Use a merchant name instead.';
  return null;
}

export default function DemoPayScreen() {
  const { cardId: cardParam } = useLocalSearchParams<{ cardId?: string }>();
  const { data, addDemoPayment, clearDemoPayments } = useWallet();

  const [step, setStep] = useState<Step>('setup');
  const [merchantId, setMerchantId] = useState<string>(MERCHANTS[0]!.id);
  const [customName, setCustomName] = useState('');
  const [amountText, setAmountText] = useState(MERCHANTS[0]!.amount);
  const [chosenCardId, setChosenCardId] = useState<string | null>(cardParam ?? null);
  // The demo result is a developer setting (Settings → tap the version 7 times).
  const outcome: Outcome = data.devSettings?.demoOutcome ?? 'approved';
  const [attempted, setAttempted] = useState(false);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [result, setResult] = useState<DemoPayment | null>(null);

  const preset = MERCHANTS.find((m) => m.id === merchantId);
  const merchantName = preset ? preset.name : customName.trim();
  const category: Category = preset?.category ?? 'other';
  const amountValid = !validateAmount(amountText);
  const amount = amountValid ? parseNumber(amountText) : 0;

  // Suggest the best-rewards card for this purchase unless the user picked one.
  const suggestedId = data.cards.length
    ? rankCards(data.cards, category, amount || 1, data.transactions)[0]?.card.id
    : undefined;
  const cardId = chosenCardId && data.cards.some((c) => c.id === chosenCardId) ? chosenCardId : suggestedId;
  const card = data.cards.find((c) => c.id === cardId);

  const merchantError = attempted && !preset ? validateMerchant(customName) : null;
  const amountError = attempted ? validateAmount(amountText) : null;

  function goToTap() {
    if ((!preset && validateMerchant(customName)) || validateAmount(amountText) || !card) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    setTrigger(null);
    setStep('tap');
  }

  function onTriggered(t: Trigger) {
    setTrigger(t);
    setStep('review');
  }

  function confirm() {
    setStep('processing');
  }

  function restart() {
    setResult(null);
    setTrigger(null);
    setStep('setup');
  }

  // Processing: a short, clearly simulated sequence, then save the demo receipt.
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (step !== 'processing' || !card || !trigger) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(0), 0));
    PROCESSING_STAGES.forEach((_, i) => timers.push(setTimeout(() => setStage(i + 1), 650 * (i + 1))));
    timers.push(
      setTimeout(() => {
        const payment: DemoPayment = {
          id: makeDemoTransactionId(),
          createdAt: new Date().toISOString(),
          merchant: merchantName,
          amountRupees: amount,
          cardId: card.id,
          cardLabel: `${card.nickname} •• ${card.last4}`,
          method: trigger.method,
          tagCode: trigger.method === 'nfc-tag' ? trigger.tagCode : undefined,
          outcome,
          isDemo: true,
        };
        addDemoPayment(payment);
        setResult(payment);
        setStep('result');
        AccessibilityInfo.announceForAccessibility(
          `Demo payment ${outcome === 'approved' ? 'approved' : 'declined'}. Simulated, no money moved.`,
        );
      }, 650 * (PROCESSING_STAGES.length + 1)),
    );
    return () => timers.forEach(clearTimeout);
    // Run once per entry into the processing step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const stepNumber = step === 'setup' ? 1 : step === 'tap' ? 2 : step === 'review' ? 3 : 4;

  if (data.cards.length === 0) {
    return (
      <Screen edges={['bottom']}>
        <DemoModeBanner />
        <View style={{ height: space.lg }} />
        <EmptyState
          title="Add a card first"
          message="The demo uses one of your cards by its label only: the nickname and last four digits. Nothing is charged."
          action={<Button label="Add a card" icon="plus" onPress={() => router.push('/card/add')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <DemoModeBanner />
      <View style={{ height: space.lg }} />
      <StepCounter label={STEPS[stepNumber - 1]} step={stepNumber} total={STEPS.length} />
      <View style={{ height: space.xl }} />

      {step === 'setup' ? (
        <>
          <NumberedHeading n={1} title="Set up the demo payment" />

          <ChipGroup label="Merchant (dummy)">
            {MERCHANTS.map((m) => (
              <Chip
                key={m.id}
                label={m.name}
                selected={merchantId === m.id}
                onPress={() => {
                  setMerchantId(m.id);
                  setAmountText(m.amount);
                }}
              />
            ))}
            <Chip label="Other…" icon="edit" selected={!preset} onPress={() => setMerchantId('custom')} />
          </ChipGroup>
          {!preset ? (
            <Field
              label="Merchant name"
              placeholder="e.g. Campus Canteen"
              value={customName}
              onChangeText={setCustomName}
              maxLength={40}
              error={merchantError}
              autoCapitalize="words"
            />
          ) : null}

          <Field
            label="Amount"
            prefix="₹"
            value={amountText}
            onChangeText={(t) => setAmountText(t.replace(/[^\d.]/g, ''))}
            keyboardType="decimal-pad"
            inputMode="decimal"
            error={amountError}
            hint="Dummy amount — nothing is charged"
          />
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((a) => (
              <Chip key={a} label={formatRupees(Number(a))} selected={amountText === a} onPress={() => setAmountText(a)} />
            ))}
          </View>

          <ChipGroup label="Pay with (card label only)">
            {data.cards.map((c) => (
              <Chip
                key={c.id}
                label={`${c.nickname} •• ${c.last4}`}
                icon={c.id === suggestedId ? 'spark' : 'card'}
                selected={c.id === cardId}
                onPress={() => setChosenCardId(c.id)}
              />
            ))}
          </ChipGroup>
          {suggestedId && cardId === suggestedId ? (
            <Text style={[type.caption, { color: colors.success, marginTop: -space.sm, marginBottom: space.lg }]}>
              ✦ Best rewards for this purchase, based on your sample rules
            </Text>
          ) : null}

          <View style={{ height: space.md }} />
          <Button label="Continue to tap" iconRight="arrowRight" onPress={goToTap} />

          <RecentDemoReceipts payments={data.demoPayments ?? []} onClear={clearDemoPayments} />
        </>
      ) : null}

      {step === 'tap' ? (
        <TapStep
          amount={amount}
          merchant={merchantName}
          onTriggered={onTriggered}
          onBack={() => setStep('setup')}
        />
      ) : null}

      {step === 'review' && card && trigger ? (
        <>
          <NumberedHeading n={3} title="Review before you confirm" />
          <View style={{ alignItems: 'center', marginBottom: space.lg, gap: space.xs }}>
            <Text style={type.small}>You’re about to run a demo payment of</Text>
            <Amount value={amount} size="xl" style={{ textAlign: 'center' }} />
            <Text style={type.small}>to {merchantName}</Text>
          </View>
          <DetailList>
            <DetailRow label="Merchant" value={merchantName} />
            <DetailRow label="Pay with" value={`${card.nickname} •• ${card.last4}`} hint="Card label only; nothing is charged" />
            <DetailRow
              label="Trigger"
              value={trigger.method === 'nfc-tag' ? 'NFC demo tag' : 'Simulated tap'}
              hint={trigger.method === 'nfc-tag' ? `Tag code ${trigger.tagCode}` : undefined}
            />
            <DetailRow label="Fees" value="None (demo)" />
            <DetailRow
              label="Demo result"
              value={outcome === 'approved' ? 'Will approve' : 'Will decline'}
              hint="Set in the developer screen"
            />
            <DetailRow label="Amount" emphasis last>
              <Amount value={amount} size="md" />
            </DetailRow>
          </DetailList>

          <View style={{ height: space.lg }} />
          <Notice tone="warning" title="This is a simulation">
            Confirming runs a pretend authorisation on this device. No money moves and nothing is sent anywhere.
          </Notice>

          <View style={styles.nav}>
            <Button label="Back" variant="outline" icon="arrowLeft" onPress={() => setStep('tap')} style={{ flex: 1 }} />
            <Button label="Confirm demo payment" iconRight="check" onPress={confirm} style={{ flex: 1.6 }} />
          </View>
        </>
      ) : null}

      {step === 'processing' ? (
        <View style={styles.processing} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Processing demo payment" />
          <Text style={[type.title, { textAlign: 'center' }]}>Processing demo payment…</Text>
          <Text style={[type.small, { textAlign: 'center' }]}>Simulated on this device — nothing is sent.</Text>
          <View style={{ gap: space.sm, marginTop: space.md, alignSelf: 'stretch' }}>
            {PROCESSING_STAGES.map((s, i) => {
              const done = stage > i;
              return (
                <View key={s} style={styles.stageRow}>
                  <View style={[styles.stageDot, done && { backgroundColor: colors.success, borderColor: colors.success }]}>
                    {done ? <Icon name="check" color={colors.bg} size={14} strokeWidth={3} /> : null}
                  </View>
                  <Text style={[type.body, !done && { color: colors.textSubtle }]}>{s}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 'result' && result ? (
        <>
          <DemoReceipt payment={result} />
          <View style={[styles.nav, { flexDirection: 'column' }]}>
            <Button label="Run another demo" icon="refresh" onPress={restart} />
            <Button
              label="Done"
              variant="outline"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

/* ------------------------------------------------------------------------ */
/* Step 2: NFC scan or simulated tap                                         */
/* ------------------------------------------------------------------------ */

const ERROR_TITLES: Record<NfcErrorKind, string> = {
  'permission-denied': 'NFC permission denied',
  unsupported: 'NFC isn’t available',
  'invalid-tag': 'Not a TAPO demo tag',
  unreadable: 'Couldn’t read the tag',
  timeout: 'Scan timed out',
  cancelled: 'Scan cancelled',
  unknown: 'Scan didn’t start',
};

function TapStep({
  amount,
  merchant,
  onTriggered,
  onBack,
}: {
  amount: number;
  merchant: string;
  onTriggered: (t: Trigger) => void;
  onBack: () => void;
}) {
  const [support, setSupport] = useState<NfcSupport | 'checking'>('checking');
  const [checkCount, setCheckCount] = useState(0);
  const [scanning, setScanning] = useState(false);

  // Native support needs an async check (device NFC, Android NFC on/off, Expo Go).
  useEffect(() => {
    let alive = true;
    checkNfcSupport()
      .then((s) => alive && setSupport(s))
      .catch(() => alive && setSupport(Platform.OS === 'web' ? 'unsupported-browser' : 'unsupported-device'));
    return () => {
      alive = false;
    };
  }, [checkCount]);

  const recheck = () => {
    setSupport('checking');
    setCheckCount((n) => n + 1);
  };
  const [error, setError] = useState<NfcDemoError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stop scanning if the user leaves this step.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function startScan() {
    setError(null);
    setScanning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const code = await scanDemoTag(controller.signal);
      onTriggered({ method: 'nfc-tag', tagCode: code });
    } catch (e) {
      setError(e instanceof NfcDemoError ? e : new NfcDemoError('unknown', 'Something went wrong. Use Simulate tap.'));
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  }

  function cancelScan() {
    abortRef.current?.abort();
  }

  const unsupportedCopy =
    support === 'needs-dev-build'
      ? 'You’re running TAPO in Expo Go, which can’t load the NFC module. Install a development build (see the README) to scan real demo tags. Use Simulate tap for now.'
      : support === 'nfc-disabled'
        ? 'NFC is turned off on this phone. Turn it on, then tap Check again — or use Simulate tap.'
        : support === 'unsupported-device'
          ? 'This device doesn’t have NFC, or it isn’t available to apps. Use Simulate tap to run the demo.'
          : support === 'insecure-context'
            ? 'Chrome only allows NFC on secure pages (HTTPS or localhost). Open the demo over HTTPS — see the README — or use Simulate tap.'
            : isLikelyIOS()
              ? 'NFC scanning isn’t available in this browser. iPhone and iPad browsers don’t support Web NFC — use the TAPO app instead, or Simulate tap.'
              : 'NFC scanning isn’t available in this browser. Web NFC works in Chrome on Android. Use Simulate tap to run the demo.';
  const holdHint = Platform.OS === 'ios' || isLikelyIOS() ? 'near the top of your iPhone' : 'near the back of your phone';

  return (
    <>
      <NumberedHeading n={2} title="Tap to start" />

      <View style={styles.tapZone}>
        <View style={[styles.tapRing, scanning && { borderColor: colors.primary }]}>
          <Icon name="tap" color={colors.ink} size={44} strokeWidth={1.8} />
        </View>
        <Amount value={amount} size="lg" style={{ textAlign: 'center' }} />
        <Text style={type.small}>to {merchant}</Text>
        <View style={{ height: space.sm }} />
        {support === 'supported' ? (
          <Text style={[type.body, { textAlign: 'center' }]} accessibilityLiveRegion="polite">
            {scanning ? `Hold a TAPO demo tag ${holdHint}…` : 'Scan a TAPO demo NFC tag, or simulate the tap.'}
          </Text>
        ) : null}
      </View>

      {support === 'checking' ? (
        <View style={styles.waiting} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <Text style={type.body}>Checking NFC…</Text>
        </View>
      ) : support === 'supported' ? (
        scanning ? (
          <View style={{ gap: space.md }}>
            <View style={styles.waiting}>
              <ActivityIndicator color={colors.primary} />
              <Text style={type.body}>Waiting for tag…</Text>
            </View>
            <Button label="Cancel scan" variant="outline" icon="close" onPress={cancelScan} />
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            <Button label={error ? 'Try scanning again' : 'Scan demo NFC tag'} icon="tap" onPress={startScan} />
            <Button label="Simulate tap" variant="outline" onPress={() => onTriggered({ method: 'simulated' })} />
          </View>
        )
      ) : (
        <View style={{ gap: space.md }}>
          <Notice title={support === 'nfc-disabled' ? 'NFC is off' : 'NFC scanning isn’t available here'} icon="info">
            {unsupportedCopy}
          </Notice>
          {support === 'nfc-disabled' ? (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button
                label="Open NFC settings"
                variant="secondary"
                size="sm"
                onPress={() => openNfcSettings().catch(() => {})}
                style={{ flex: 1 }}
              />
              <Button label="Check again" variant="outline" size="sm" icon="refresh" onPress={recheck} style={{ flex: 1 }} />
            </View>
          ) : null}
          <Button label="Simulate tap" icon="tap" onPress={() => onTriggered({ method: 'simulated' })} />
        </View>
      )}

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Icon name={error.kind === 'cancelled' ? 'info' : 'close'} color={colors.danger} size={18} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.label, { color: colors.danger }]}>{ERROR_TITLES[error.kind]}</Text>
            <Text style={[type.small, { color: colors.text }]}>{error.message}</Text>
          </View>
        </View>
      ) : null}

      <Text style={[type.caption, { fontWeight: '500', marginTop: space.lg }]}>
        The demo tag only holds a harmless code like “TAPO-DEMO:CAPSTONE-01”. A website can’t read or charge a
        contactless bank card, and this app never writes to tags.
      </Text>

      <Button
        label="Back"
        variant="ghost"
        icon="arrowLeft"
        onPress={() => {
          abortRef.current?.abort();
          onBack();
        }}
        style={{ marginTop: space.md, alignSelf: 'flex-start' }}
      />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Recent demo receipts                                                      */
/* ------------------------------------------------------------------------ */

function RecentDemoReceipts({ payments, onClear }: { payments: DemoPayment[]; onClear: () => void }) {
  const [confirmClear, setConfirmClear] = useState(false);
  if (payments.length === 0) return null;
  const recent = payments.slice(0, 5);
  return (
    <View style={{ marginTop: space.xxl }}>
      <Text style={[type.mono, { marginBottom: space.sm }]}>Recent demo receipts</Text>
      <View style={styles.receiptList}>
        {recent.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/demo-receipt/${p.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${p.merchant}, ${formatRupees(p.amountRupees)}, ${
              p.outcome === 'approved' ? 'approved' : 'declined'
            }, simulated. ${p.id}`}
            accessibilityHint="Opens the demo receipt"
            style={(state) => [
              styles.receiptRow,
              i > 0 && styles.receiptDivider,
              state.pressed && { backgroundColor: colors.surfaceAlt },
              isFocused(state) && focusRing,
            ]}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>
                {p.merchant}
              </Text>
              <StatusBadge status={p.outcome === 'approved' ? 'demo-approved' : 'demo-declined'} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Amount value={p.amountRupees} size="sm" />
              <Text style={type.caption}>{formatDate(p.createdAt)}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {confirmClear ? (
        <View style={[styles.nav, { marginTop: space.md }]}>
          <Button label="Cancel" variant="outline" size="sm" onPress={() => setConfirmClear(false)} style={{ flex: 1 }} />
          <Button
            label="Clear all"
            variant="danger"
            size="sm"
            onPress={() => {
              onClear();
              setConfirmClear(false);
            }}
            style={{ flex: 1 }}
          />
        </View>
      ) : (
        <Button
          label="Clear demo receipts"
          variant="ghost"
          size="sm"
          icon="trash"
          onPress={() => setConfirmClear(true)}
          style={{ alignSelf: 'flex-start', marginTop: space.sm }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: -space.sm, marginBottom: space.lg },
  nav: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  tapZone: { alignItems: 'center', gap: space.xs, paddingVertical: space.lg, marginBottom: space.md },
  tapRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
    backgroundColor: colors.surfaceSunken,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.lg,
    padding: space.md + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerBg,
  },
  processing: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptList: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 64 },
  receiptDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
