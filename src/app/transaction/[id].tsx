import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_ICON, CATEGORY_TINT, Icon } from '../../components/Icon';
import { Amount, DetailList, DetailRow, StatusBadge } from '../../components/payments';
import { Text } from '../../components/Text';
import { Button, EmptyState, Screen, SectionHeader } from '../../components/ui';
import { formatDate, formatPercent, formatTime } from '../../lib/format';
import { effectiveRule, rawReward } from '../../lib/rewards';
import { CATEGORY_LABELS } from '../../lib/types';
import { useWallet } from '../../lib/wallet';
import { colors, radius, space, type } from '../../theme';

/**
 * Details for one activity record. Everything shown comes from existing app
 * data; TAPO has no payment status, fees or settlement information, so those
 * are explained as unavailable rather than invented.
 */
export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, getCard } = useWallet();
  const txn = data.transactions.find((t) => t.id === id);

  if (!txn) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="receipt"
          title="Transaction not found"
          message="It may have been removed when its card was deleted or the demo data was reset."
          action={<Button label="Back to activity" variant="outline" onPress={() => router.replace('/transactions')} />}
        />
      </Screen>
    );
  }

  const card = getCard(txn.cardId);
  const tint = CATEGORY_TINT[txn.category];
  const rule = card ? effectiveRule(card, txn.category) : undefined;
  const reward = rule ? rawReward(txn.amountRupees, rule.ratePercent) : undefined;

  return (
    <Screen edges={['bottom']}>
      {/* Summary */}
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: tint.bg }]}>
          <Icon name={CATEGORY_ICON[txn.category]} color={tint.fg} size={26} />
        </View>
        <Text style={[type.h2, { textAlign: 'center' }]} accessibilityRole="header">
          {txn.merchant}
        </Text>
        <Amount value={txn.amountRupees} size="xl" kind="spend" style={{ textAlign: 'center' }} />
        <Text style={type.small}>
          {formatDate(txn.date)} · {formatTime(txn.date)}
        </Text>
        <StatusBadge status="sample" />
      </View>

      <View style={styles.explain}>
        <Icon name="info" color={colors.textMuted} size={18} />
        <Text style={[type.small, { flex: 1 }]}>
          This is demo activity, not a real payment. TAPO doesn’t process payments, so there’s no payment status, fee
          or settlement information for it.
        </Text>
      </View>

      <SectionHeader title="Details" />
      <DetailList>
        <DetailRow label="Merchant" value={txn.merchant} />
        <DetailRow label="Category" value={CATEGORY_LABELS[txn.category]} />
        <DetailRow label="Date" value={formatDate(txn.date)} />
        <DetailRow label="Time" value={formatTime(txn.date)} />
        <DetailRow label="Card" value={card ? `${card.nickname} •• ${card.last4}` : 'Card removed'} />
        <DetailRow label="Amount" emphasis last>
          <Amount value={txn.amountRupees} size="md" />
        </DetailRow>
      </DetailList>

      <SectionHeader title="Rewards" />
      {card && rule && reward !== undefined ? (
        <DetailList>
          <DetailRow
            label="Rate applied"
            value={formatPercent(rule.ratePercent)}
            hint={
              rule.source === 'category'
                ? `${CATEGORY_LABELS[txn.category]} rule on ${card.nickname}`
                : `No ${CATEGORY_LABELS[txn.category]} rule — base rate`
            }
          />
          <DetailRow
            label="Estimated reward"
            emphasis
            last
            hint={rule.capRupees !== undefined ? 'Before the monthly cap is applied' : 'From your sample rules'}
          >
            <Amount value={reward} size="md" kind="reward" decimals />
          </DetailRow>
        </DetailList>
      ) : (
        <View style={styles.explain}>
          <Icon name="info" color={colors.textMuted} size={18} />
          <Text style={[type.small, { flex: 1 }]}>
            The card used for this transaction has been removed, so its reward can’t be estimated.
          </Text>
        </View>
      )}

      {/* Follow-up actions the app actually supports */}
      <View style={styles.actions}>
        <Button
          label="Compare cards for this"
          icon="spark"
          onPress={() =>
            router.push({
              pathname: '/recommend',
              params: { category: txn.category, amount: String(txn.amountRupees) },
            })
          }
          accessibilityHint="Opens Best card with this category and amount filled in"
        />
        {card ? (
          <Button
            label="View card"
            variant="outline"
            iconRight="arrowRight"
            onPress={() => router.push(`/card/${card.id}`)}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: space.md, paddingBottom: space.lg },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  explain: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  actions: { gap: space.md, marginTop: space.xl },
});
