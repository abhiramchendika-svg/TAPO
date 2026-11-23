import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDate, formatTime, rupeesA11y } from '../lib/format';
import { CATEGORY_LABELS, type Card, type Transaction } from '../lib/types';
import { colors, focusRing, isFocused, radius, space, type } from '../theme';
import { CATEGORY_ICON, CATEGORY_TINT, Icon } from './Icon';
import { Amount } from './payments';
import { Text } from './Text';

/**
 * One activity row. Tapping opens the transaction's details.
 * `when="time"` is used inside day-grouped lists; `"date"` elsewhere.
 */
export function TransactionRow({
  txn,
  card,
  last,
  when = 'date',
}: {
  txn: Transaction;
  card?: Card;
  last?: boolean;
  when?: 'date' | 'time';
}) {
  const cardLabel = card ? `${card.nickname} •• ${card.last4}` : 'Removed card';
  const tint = CATEGORY_TINT[txn.category];
  const whenText = when === 'time' ? formatTime(txn.date) : formatDate(txn.date);
  return (
    <Pressable
      onPress={() => router.push(`/transaction/${txn.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${txn.merchant}, ${rupeesA11y(txn.amountRupees)}, ${CATEGORY_LABELS[txn.category]}, ${
        when === 'time' ? 'at ' : 'on '
      }${whenText}, ${cardLabel}. ${txn.source === 'imported' ? 'Imported from your statement' : 'Sample transaction'}.`}
      accessibilityHint="Opens transaction details"
      style={(state) => [
        styles.row,
        !last && styles.divider,
        state.pressed && { backgroundColor: colors.surfaceAlt },
        isFocused(state) && focusRing,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: tint.bg }]}>
        <Icon name={CATEGORY_ICON[txn.category]} color={tint.fg} size={20} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.merchant} numberOfLines={1}>
          {txn.merchant}
        </Text>
        <View style={styles.metaRow}>
          {card ? <View style={[styles.cardDot, { backgroundColor: card.color }]} /> : null}
          <Text style={[type.caption, { fontWeight: '500', flexShrink: 1 }]} numberOfLines={1}>
            {CATEGORY_LABELS[txn.category]} · {cardLabel}
            {txn.source === 'imported' ? ' · Imported' : ''}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Amount value={txn.amountRupees} kind="spend" />
        <Text style={[type.caption, { fontWeight: '500', textAlign: 'right' }]}>{whenText}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    marginHorizontal: -space.sm,
    borderRadius: radius.sm,
    minHeight: 64,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: 42, height: 42, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  merchant: { fontSize: 16, fontWeight: '600', color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardDot: { width: 8, height: 8, borderRadius: 2 },
  right: { alignItems: 'flex-end', minWidth: 84, gap: 2 },
});
