import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { CardTile, useCardWidth } from '../../components/CardTile';
import { Stage } from '../../components/Gallery';
import { CATEGORY_ICON, CATEGORY_TINT, Icon } from '../../components/Icon';
import { TapReadiness } from '../../components/TapReadiness';
import { TransactionRow } from '../../components/TransactionRow';
import { Button, EmptyState, Panel, Screen, SectionHeader } from '../../components/ui';
import { formatPercent, formatRupees } from '../../lib/format';
import { monthSummary } from '../../lib/rewards';
import { CATEGORY_LABELS, type Category } from '../../lib/types';
import { useWallet } from '../../lib/wallet';
import { colors, radius, space, type } from '../../theme';

export default function CardDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCard, data, removeCard } = useWallet();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const cardW = useCardWidth(340, 72);
  const card = id ? getCard(id) : undefined;

  if (!card) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          title="Card not found"
          message="It may have been removed or the demo data was reset."
          action={<Button label="Back to wallet" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }

  const summary = monthSummary(card, data.transactions);
  const allTxns = data.transactions.filter((t) => t.cardId === card.id);
  const txns = [...allTxns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <Screen edges={['bottom']}>
      <View style={{ paddingTop: space.sm, paddingBottom: space.md }}>
        <Stage caption={`${card.issuer} · sample · •• ${card.last4}`}>
          <CardTile card={card} width={cardW} />
        </Stage>
      </View>

      <View style={styles.actions}>
        <Button
          label="Pay"
          icon="lock"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push(`/pay?cardId=${card.id}`)}
          accessibilityHint="Explains that payments are not available in this prototype"
        />
        <Button
          label="Edit"
          icon="edit"
          accessibilityHint="Edit this card and its reward rules"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push(`/card/add?id=${card.id}`)}
        />
      </View>

      <TapReadiness card={card} />

      <Panel style={{ marginTop: space.lg, paddingVertical: space.xs }}>
        <InfoRow label="Nickname" value={card.nickname} />
        <InfoRow label="Issuer" value={`${card.issuer} (fictional)`} />
        <InfoRow label="Network" value={card.network} />
        <InfoRow label="Type" value={card.type} />
        <InfoRow label="Card number" value={`Ends in ${card.last4}`} last />
      </Panel>

      <SectionHeader
        title="Reward rules"
        action={
          <Button label="Edit" variant="ghost" size="sm" onPress={() => router.push(`/card/add?id=${card.id}`)} />
        }
      />
      <Panel style={{ paddingVertical: space.xs }}>
        {card.rules.map((r) => (
          <RuleRow
            key={r.id}
            category={r.category}
            rate={formatPercent(r.ratePercent)}
            cap={r.monthlyCapRupees !== undefined ? `Cap ${formatRupees(r.monthlyCapRupees)}/month` : 'No monthly cap'}
          />
        ))}
        <RuleRow category="other" label="Everything else (base)" rate={formatPercent(card.baseRatePercent)} last />
      </Panel>
      <Text style={[type.small, { marginTop: space.sm }]}>Sample rules for comparison only — not issuer terms.</Text>

      <SectionHeader title="This month (sample spending)" />
      {summary.count === 0 ? (
        <EmptyState title="No sample spend this month" message="Transactions on this card will be summarised here." />
      ) : (
        <Panel style={{ gap: space.md }}>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Stat label="Spent" value={formatRupees(summary.totalSpend)} />
            <Stat label="Est. rewards" value={formatRupees(summary.totalReward, { decimals: true })} accent />
          </View>
          {summary.rows.map((row) => {
            const pct = summary.totalSpend ? row.spend / summary.totalSpend : 0;
            return (
              <View
                key={row.category}
                accessible
                accessibilityLabel={`${CATEGORY_LABELS[row.category]}: spent ${formatRupees(row.spend)}, estimated reward ${formatRupees(
                  row.reward,
                  { decimals: true },
                )}`}
              >
                <View style={styles.barLabel}>
                  <Text style={type.label}>{CATEGORY_LABELS[row.category]}</Text>
                  <Text style={type.small}>
                    {formatRupees(row.spend)} · earns {formatRupees(row.reward, { decimals: true })}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.max(4, pct * 100)}%`, backgroundColor: card.color }]} />
                </View>
              </View>
            );
          })}
        </Panel>
      )}

      <SectionHeader
        title="Recent transactions"
        action={
          allTxns.length > txns.length ? (
            <Button
              label={`See all ${allTxns.length}`}
              variant="ghost"
              size="sm"
              iconRight="arrowRight"
              onPress={() => router.push({ pathname: '/transactions', params: { cardId: card.id } })}
              accessibilityHint="Opens Activity filtered to this card"
            />
          ) : undefined
        }
      />
      {txns.length === 0 ? (
        <EmptyState title="No transactions" message="This card has no sample activity yet." />
      ) : (
        <Panel style={{ paddingVertical: space.xs }}>
          {txns.map((t, i) => (
            <TransactionRow key={t.id} txn={t} card={card} last={i === txns.length - 1} />
          ))}
        </Panel>
      )}

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {confirmRemove ? (
          <Panel style={{ gap: space.sm }}>
            <Text style={[type.body, { fontWeight: '600' }]}>
              Remove “{card.nickname}” and its sample transactions from this device?
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label="Cancel" variant="secondary" onPress={() => setConfirmRemove(false)} style={{ flex: 1 }} />
              <Button
                label="Remove"
                variant="danger"
                style={{ flex: 1 }}
                onPress={() => {
                  removeCard(card.id);
                  router.back();
                }}
              />
            </View>
          </Panel>
        ) : (
          <Button label="Remove card" icon="trash" variant="danger" onPress={() => setConfirmRemove(true)} />
        )}
      </View>
    </Screen>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.divider]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={type.small}>{label}</Text>
      <Text style={[type.body, { fontWeight: '600', flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

function RuleRow({
  category,
  label,
  rate,
  cap,
  last,
}: {
  category: Category;
  label?: string;
  rate: string;
  cap?: string;
  last?: boolean;
}) {
  const tint = CATEGORY_TINT[category];
  const name = label ?? CATEGORY_LABELS[category];
  return (
    <View
      style={[styles.ruleRow, !last && styles.divider]}
      accessible
      accessibilityLabel={`${name}: ${rate}${cap ? `, ${cap}` : ''}`}
    >
      <View style={[styles.ruleIcon, { backgroundColor: tint.bg }]}>
        <Icon name={CATEGORY_ICON[category]} color={tint.fg} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{name}</Text>
        {cap ? <Text style={[type.caption, { fontWeight: '500' }]}>{cap}</Text> : null}
      </View>
      <Text style={styles.rate}>{rate}</Text>
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.stat, accent && { backgroundColor: colors.successBg }]}>
      <Text style={[type.small, accent && { color: colors.success }]}>{label}</Text>
      <Text style={[type.h2, accent && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  actions: { flexDirection: 'row', gap: space.md },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  ruleIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rate: { fontSize: 18, fontWeight: '800', color: colors.success, fontVariant: ['tabular-nums'] },
  stat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: space.xs },
  barTrack: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});
