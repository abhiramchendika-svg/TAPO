import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { CardTile, useCardWidth } from '../../components/CardTile';
import { Stage } from '../../components/Gallery';
import { CATEGORY_ICON } from '../../components/Icon';
import { NumberedHeading, StepCounter } from '../../components/Steps';
import { Button, Chip, ChipGroup, Field, Notice, Panel, Screen } from '../../components/ui';
import { makeId } from '../../lib/format';
import { CARD_COLORS } from '../../lib/sampleData';
import {
  CARD_TYPES,
  CATEGORIES,
  CATEGORY_LABELS,
  NETWORKS,
  SAMPLE_ISSUERS,
  type Card,
  type CardType,
  type Category,
  type Network,
  type SampleIssuer,
} from '../../lib/types';
import {
  LIMITS,
  looksLikeCardNumber,
  parseNumber,
  validateCap,
  validateLast4,
  validateNickname,
  validateRate,
} from '../../lib/validation';
import { useWallet } from '../../lib/wallet';
import { colors, radius, space, type } from '../../theme';

interface RuleDraft {
  id: string;
  category: Category;
  rate: string;
  cap: string;
}

const STEPS = ['Name & issuer', 'Network & type', 'Last four digits', 'Reward rules'] as const;

/** Add a new card, or edit an existing one when `?id=` is given, as a 4-step flow. */
export default function AddCardScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, getCard, upsertCard } = useWallet();
  const existing = id ? getCard(id) : undefined;
  const cardW = useCardWidth(280, 96);

  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false);

  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [issuer, setIssuer] = useState<SampleIssuer>(existing?.issuer ?? SAMPLE_ISSUERS[0]);
  const [network, setNetwork] = useState<Network>(existing?.network ?? 'RuPay');
  const [cardType, setCardType] = useState<CardType>(existing?.type ?? 'Credit');
  const [last4, setLast4] = useState(existing?.last4 ?? '');
  const [baseRate, setBaseRate] = useState(existing ? String(existing.baseRatePercent) : '1');
  const [rules, setRules] = useState<RuleDraft[]>(
    existing?.rules.map((r) => ({
      id: r.id,
      category: r.category,
      rate: String(r.ratePercent),
      cap: r.monthlyCapRupees !== undefined ? String(r.monthlyCapRupees) : '',
    })) ?? [],
  );

  const nicknameProblem = looksLikeCardNumber(nickname)
    ? 'This looks like a card number. Please use a nickname instead — never enter full card numbers.'
    : validateNickname(nickname);

  /** Validation for one step; returns true when it has errors. */
  function stepHasErrors(s: number): boolean {
    if (s === 0) return !!nicknameProblem;
    if (s === 2) return !!validateLast4(last4);
    if (s === 3) return !!validateRate(baseRate) || rules.some((r) => validateRate(r.rate) || validateCap(r.cap));
    return false;
  }

  const show = attempted; // errors only appear after trying to continue
  const nicknameError = show && step === 0 ? nicknameProblem : null;
  const last4Error = show && step === 2 ? validateLast4(last4) : null;
  const baseRateError = show && step === 3 ? validateRate(baseRate) : null;
  const ruleErrors = rules.map((r) => ({
    rate: show && step === 3 ? validateRate(r.rate) : null,
    cap: show && step === 3 ? validateCap(r.cap) : null,
  }));
  const unusedCategories = CATEGORIES.filter((c) => !rules.some((r) => r.category === c));

  const preview: Card = {
    id: existing?.id ?? 'preview',
    // Never echo something that looks like a card number onto the card visual.
    nickname: looksLikeCardNumber(nickname) ? 'Card nickname' : nickname.trim() || 'Card nickname',
    issuer,
    network,
    type: cardType,
    last4: /^\d{4}$/.test(last4) ? last4 : '0000',
    baseRatePercent: 0,
    rules: [],
    color: existing?.color ?? CARD_COLORS[data.cards.length % CARD_COLORS.length],
    isSample: existing?.isSample ?? false,
  };

  function updateRule(ruleId: string, patch: Partial<RuleDraft>) {
    setRules((rs) => rs.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)));
  }

  function next() {
    if (stepHasErrors(step)) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    if (step < STEPS.length - 1) setStep(step + 1);
    else save();
  }

  function back() {
    setAttempted(false);
    if (step > 0) setStep(step - 1);
    else if (router.canGoBack()) router.back();
  }

  function save() {
    // Re-check every step in case earlier values changed.
    const bad = [0, 1, 2, 3].find((s) => stepHasErrors(s));
    if (bad !== undefined) {
      setStep(bad);
      setAttempted(true);
      return;
    }
    const card: Card = {
      ...preview,
      id: existing?.id ?? makeId('card'),
      nickname: nickname.trim(),
      last4,
      baseRatePercent: parseNumber(baseRate),
      rules: rules.map((r) => ({
        id: r.id,
        category: r.category,
        ratePercent: parseNumber(r.rate),
        monthlyCapRupees: r.cap.trim() ? parseNumber(r.cap) : undefined,
      })),
    };
    upsertCard(card);
    if (router.canGoBack()) router.back();
    else router.replace(`/card/${card.id}`);
  }

  const isLast = step === STEPS.length - 1;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Edit card' : 'Add card' }} />
      <Screen edges={['bottom']}>
        <View style={{ paddingTop: space.sm, marginBottom: space.lg }}>
          <Stage caption={preview.isSample ? 'Live preview · sample card' : 'Live preview'}>
            <CardTile card={preview} width={cardW} />
          </Stage>
        </View>

        <StepCounter label={STEPS[step]} step={step + 1} total={STEPS.length} />

        {/* Step list: completed steps can be revisited */}
        <View style={styles.stepList}>
          {STEPS.map((s, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'todo';
            // New cards: revisit completed steps only. Editing: every step is already filled in.
            const locked = i === step || (!existing && i > step);
            return (
              <Pressable
                key={s}
                disabled={locked}
                onPress={() => {
                  if (i > step && stepHasErrors(step)) {
                    setAttempted(true);
                    return;
                  }
                  setAttempted(false);
                  setStep(i);
                }}
                accessibilityRole="button"
                accessibilityState={{ disabled: locked, selected: i === step }}
                accessibilityLabel={`Step ${i + 1}, ${s}${state === 'done' ? ', completed' : ''}`}
                style={[styles.stepPill, state === 'active' && styles.stepPillActive]}
              >
                <Text
                  style={[
                    styles.stepPillText,
                    state === 'active' && { color: colors.onPrimary },
                    state === 'todo' && { color: colors.textSubtle },
                  ]}
                >
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: space.xl }}>
          <NumberedHeading n={step + 1} title={STEPS[step]} />

          {step === 0 ? (
            <>
              <Field
                label="Nickname"
                placeholder="e.g. Groceries card"
                value={nickname}
                onChangeText={setNickname}
                maxLength={LIMITS.nicknameMax}
                error={nicknameError}
                hint={`${nickname.length}/${LIMITS.nicknameMax} characters`}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={next}
              />
              <ChipGroup label="Issuer (sample names only)">
                {SAMPLE_ISSUERS.map((i) => (
                  <Chip key={i} label={i} selected={issuer === i} onPress={() => setIssuer(i)} />
                ))}
              </ChipGroup>
              <Text style={[type.caption, { marginTop: -space.sm, marginBottom: space.lg }]}>
                TAPO doesn’t list real banks. Any name here is fine; put your card’s real name in the nickname.
              </Text>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <ChipGroup label="Network">
                {NETWORKS.map((n) => (
                  <Chip key={n} label={n} selected={network === n} onPress={() => setNetwork(n)} />
                ))}
              </ChipGroup>
              <ChipGroup label="Card type">
                {CARD_TYPES.map((t) => (
                  <Chip key={t} label={t} selected={cardType === t} onPress={() => setCardType(t)} />
                ))}
              </ChipGroup>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Notice title="Only safe details" icon="lock">
                Never enter your full card number, CVV, PIN, OTP or bank login. TAPO only needs the last four digits
                to help you recognise the card.
              </Notice>
              <View style={{ height: space.lg }} />
              <Field
                label="Last four digits"
                placeholder="1234"
                value={last4}
                onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={4}
                error={last4Error}
                hint="Only the last 4 digits — used as a label, nothing more."
                autoComplete="off"
                importantForAutofill="no"
                textContentType="none"
                returnKeyType="next"
                onSubmitEditing={next}
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Text style={[type.small, { marginBottom: space.md }]}>
                Enter the rules you want to compare. These are your own estimates, not issuer terms.
              </Text>
              <Field
                label="Base reward rate (all other spends)"
                value={baseRate}
                onChangeText={(t) => setBaseRate(t.replace(/[^\d.]/g, ''))}
                keyboardType="decimal-pad"
                inputMode="decimal"
                suffix="%"
                error={baseRateError}
                hint={`0–${LIMITS.rateMax}%`}
              />

              {rules.length === 0 ? (
                <Text style={[type.small, { marginBottom: space.md }]}>
                  No category rules yet. Every category will earn the base rate.
                </Text>
              ) : null}

              {rules.map((r, i) => (
                <Panel key={r.id} style={{ marginBottom: space.md }}>
                  <View style={styles.ruleHeader}>
                    <Text style={type.h2}>{CATEGORY_LABELS[r.category]}</Text>
                    <Pressable
                      onPress={() => setRules((rs) => rs.filter((x) => x.id !== r.id))}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${CATEGORY_LABELS[r.category]} rule`}
                      hitSlop={8}
                      style={styles.remove}
                    >
                      <Text style={{ color: colors.danger, fontWeight: '700' }}>Remove</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', gap: space.md }}>
                    <Field
                      style={{ flex: 1, marginBottom: 0 }}
                      label="Rate"
                      value={r.rate}
                      onChangeText={(t) => updateRule(r.id, { rate: t.replace(/[^\d.]/g, '') })}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      suffix="%"
                      error={ruleErrors[i]?.rate}
                    />
                    <Field
                      style={{ flex: 1, marginBottom: 0 }}
                      label="Cap / month"
                      value={r.cap}
                      onChangeText={(t) => updateRule(r.id, { cap: t.replace(/[^\d.]/g, '') })}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      prefix="₹"
                      placeholder="None"
                      error={ruleErrors[i]?.cap}
                    />
                  </View>
                </Panel>
              ))}

              {unusedCategories.length > 0 ? (
                <ChipGroup label="Add a category rule">
                  {unusedCategories.map((c) => (
                    <Chip
                      key={c}
                      label={`+ ${CATEGORY_LABELS[c]}`}
                      icon={CATEGORY_ICON[c]}
                      selected={false}
                      onPress={() =>
                        setRules((rs) => [...rs, { id: makeId('rule'), category: c, rate: '2', cap: '' }])
                      }
                    />
                  ))}
                </ChipGroup>
              ) : null}
            </>
          ) : null}
        </View>

        {attempted && stepHasErrors(step) ? (
          <View style={styles.summaryError} accessibilityRole="alert">
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Please fix the highlighted field to continue.</Text>
          </View>
        ) : null}

        <View style={styles.nav}>
          <Button
            label={step === 0 ? 'Cancel' : 'Back'}
            variant="outline"
            icon={step === 0 ? undefined : 'arrowLeft'}
            onPress={back}
            style={{ flex: 1 }}
          />
          <Button
            label={isLast ? (existing ? 'Save' : 'Add card') : 'Next'}
            iconRight={isLast ? 'check' : 'arrowRight'}
            onPress={next}
            style={{ flex: 1.4 }}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  stepList: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  stepPill: {
    minWidth: 44,
    minHeight: 32,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepPillText: { fontSize: 12, fontWeight: '700', color: colors.ink, letterSpacing: 1 },
  ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  summaryError: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  nav: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
});
