import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { CardTile, useCardWidth } from '../../components/CardTile';
import { Stage } from '../../components/Gallery';
import { CATEGORY_ICON } from '../../components/Icon';
import { Amount, DetailList, DetailRow, StatusBadge } from '../../components/payments';
import { NumberedHeading, StepCounter } from '../../components/Steps';
import { Button, Chip, ChipGroup, EmptyState, Field, Notice, Panel, Screen, SectionHeader, Title } from '../../components/ui';
import { formatPercent, formatRupees } from '../../lib/format';
import { explainWinner, rankCards } from '../../lib/rewards';
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../../lib/types';
import { parseNumber, validateAmount } from '../../lib/validation';
import { useWallet } from '../../lib/wallet';
import { colors, fonts, radius, space, type } from '../../theme';

const STAGES = ['Category', 'Amount', 'Result'] as const;

export default function RecommendScreen() {
  const { data } = useWallet();
  const [category, setCategory] = useState<Category | null>(null);
  const [amountText, setAmountText] = useState('');
  const [submitted, setSubmitted] = useState<{ category: Category; amount: number } | null>(null);
  const [touched, setTouched] = useState(false);

  // Prefill from links such as "Compare cards for this" on a transaction.
  const params = useLocalSearchParams<{ category?: string; amount?: string }>();
  const paramKey = `${params.category ?? ''}|${params.amount ?? ''}`;
  const [seenParams, setSeenParams] = useState<string | null>(null);
  if (paramKey !== seenParams) {
    setSeenParams(paramKey);
    const pc = CATEGORIES.find((c) => c === params.category);
    if (pc && params.amount && !validateAmount(params.amount)) {
      setCategory(pc);
      setAmountText(params.amount);
      setTouched(false);
      setSubmitted({ category: pc, amount: parseNumber(params.amount) });
    }
  }

  const cardW = useCardWidth(300, 80);

  const amountError = touched ? validateAmount(amountText) : null;
  const amountValid = !validateAmount(amountText);
  /** 1 = choosing category, 2 = entering amount, 3 = viewing result. */
  const stage = submitted ? 3 : category ? 2 : 1;
  const categoryError = touched && !category ? 'Pick a merchant category.' : null;

  const ranked = useMemo(
    () => (submitted ? rankCards(data.cards, submitted.category, submitted.amount, data.transactions) : []),
    [submitted, data.cards, data.transactions],
  );

  function onRecommend() {
    setTouched(true);
    if (!category || validateAmount(amountText)) {
      setSubmitted(null);
      return;
    }
    setSubmitted({ category, amount: parseNumber(amountText) });
  }

  if (data.cards.length === 0) {
    return (
      <Screen>
        <Title>Choose a card</Title>
        <EmptyState
          title="Add a card first"
          message="Recommendations compare the reward rules of cards in your wallet."
          action={<Button label="Add a card" onPress={() => router.push('/card/add')} />}
        />
      </Screen>
    );
  }

  const best = ranked[0];

  return (
    <Screen>
      <Title kicker="Rewards guide" subtitle="We compare each card’s sample reward rules. Nothing is charged.">
        Choose a card
      </Title>

      <StepCounter label={STAGES[stage - 1]} step={stage} total={STAGES.length} />

      <View style={{ height: space.xl }} />
      <NumberedHeading n={1} title="Merchant category" state={category ? 'done' : 'active'} />
      <ChipGroup label="Choose one">
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABELS[c]}
            icon={CATEGORY_ICON[c]}
            selected={category === c}
            onPress={() => {
              setCategory(c);
              setSubmitted(null);
            }}
          />
        ))}
      </ChipGroup>
      {categoryError ? (
        <Text style={styles.error} accessibilityRole="alert">
          {categoryError}
        </Text>
      ) : null}

      <View style={{ height: space.md }} />
      <NumberedHeading
        n={2}
        title="Purchase amount"
        state={amountValid && (submitted || category) ? 'done' : category ? 'active' : 'todo'}
      />
      <Field
        label="Amount in rupees"
        prefix="₹"
        placeholder="e.g. 2500"
        keyboardType="decimal-pad"
        inputMode="decimal"
        value={amountText}
        onChangeText={(t) => {
          setAmountText(t.replace(/[^\d.,]/g, ''));
          setSubmitted(null);
        }}
        error={amountError}
        hint="Up to ₹10,00,000"
        returnKeyType="done"
        onSubmitEditing={onRecommend}
      />

      <Button label="Recommend a card" icon="spark" onPress={onRecommend} />

      {submitted && best ? (
        <>
          <View style={{ height: space.xxl }} />
          <NumberedHeading n={3} title="Result" state="done" />
          <Panel style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <StatusBadge status="best" />
              <StatusBadge status="estimate" />
            </View>
            <Stage caption={`${best.card.issuer} · sample · •• ${best.card.last4}`}>
              <CardTile card={best.card} width={cardW} onPress={() => router.push(`/card/${best.card.id}`)} />
            </Stage>
            <View>
              <Text style={type.mono}>Use this card</Text>
              <Text style={type.title} accessibilityRole="header">
                {best.card.nickname}
              </Text>
              <Text style={type.small}>
                {best.card.issuer} · {best.card.network} •• {best.card.last4}
              </Text>
            </View>
            <Text style={type.body}>{explainWinner(ranked, submitted.amount)}</Text>
          </Panel>

          <Text style={[type.mono, { marginTop: space.lg, marginBottom: space.sm }]}>Review</Text>
          <DetailList>
            <DetailRow label="Purchase" value={CATEGORY_LABELS[submitted.category]} />
            <DetailRow label="Amount">
              <Amount value={submitted.amount} size="md" />
            </DetailRow>
            <DetailRow label="Rate applied" value={formatPercent(best.ratePercent)} hint={best.reasons[0]} />
            {best.capRupees !== undefined && best.capRemaining !== undefined ? (
              <DetailRow
                label="Monthly cap left"
                value={formatRupees(best.capRemaining, { decimals: true })}
                hint={
                  best.capLimited
                    ? 'Reward limited by the cap this month'
                    : `of ${formatRupees(best.capRupees)} · based on this month’s sample spend`
                }
              />
            ) : null}
            <DetailRow label="Estimated reward" emphasis last>
              <Amount value={best.rewardRupees} size="lg" kind="reward" decimals />
            </DetailRow>
          </DetailList>
          <Text style={[type.caption, { fontWeight: '500', marginTop: space.sm }]}>
            An estimate from your sample rules, not an issuer quote. TAPO doesn’t make the payment — pay with your card as
            usual.
          </Text>
          <Button
            label="View this card"
            variant="outline"
            iconRight="arrowRight"
            onPress={() => router.push(`/card/${best.card.id}`)}
            style={{ marginTop: space.md }}
          />

          {ranked.length > 1 ? (
            <>
              <SectionHeader title="How every card compares" />
              <Panel style={{ paddingVertical: space.xs }}>
                {ranked.map((e, i) => (
                  <View
                    key={e.card.id}
                    style={[styles.rankRow, i === ranked.length - 1 && { borderBottomWidth: 0 }]}
                    accessible
                    accessibilityLabel={`Rank ${i + 1}: ${e.card.nickname}, ${formatPercent(e.ratePercent)}, estimated ${formatRupees(
                      e.rewardRupees,
                      { decimals: true },
                    )}. ${e.reasons.join(' ')}`}
                  >
                    <View style={[styles.rankBadge, i === 0 && { backgroundColor: colors.successBg }]}>
                      <Text style={[styles.rankNum, { color: i === 0 ? colors.success : colors.textMuted }]}>
                        {String(i + 1).padStart(2, '0')}
                      </Text>
                    </View>
                    <View style={[styles.swatch, { backgroundColor: e.card.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { fontWeight: '600' }]}>{e.card.nickname}</Text>
                      <Text style={type.small}>{e.reasons.join(' ')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 72 }}>
                      <Amount value={e.rewardRupees} size="sm" kind={i === 0 ? 'reward' : 'plain'} decimals />
                      <Text style={type.caption}>{formatPercent(e.ratePercent)}</Text>
                    </View>
                  </View>
                ))}
              </Panel>
            </>
          ) : null}

          <View style={{ marginTop: space.lg }}>
            <Notice title="How this is calculated">
              Reward = amount × the card’s rate for this category (or its base rate if there’s no category rule),
              limited by any monthly cap minus rewards already earned this month from sample transactions. Ties go
              to the higher headline rate, then alphabetical order. These are illustrative sample rules, not real
              card terms.
            </Notice>
            <Button
              label="How TAPO works"
              variant="ghost"
              size="sm"
              iconRight="arrowRight"
              onPress={() => router.push('/how-it-works')}
              style={{ marginTop: space.sm, alignSelf: 'center' }}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 14, fontWeight: '600', marginTop: -space.sm, marginBottom: space.lg },
  rankNum: { fontFamily: fonts.body, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rankBadge: {
    width: 34,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 8, height: 32, borderRadius: 3 },
  rankRow: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
