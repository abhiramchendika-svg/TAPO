import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_ICON, CATEGORY_TINT, Icon } from '../../components/Icon';
import { Amount } from '../../components/payments';
import { Text } from '../../components/Text';
import { Button, EmptyState, Panel, Screen, SectionHeader, Segmented, Title } from '../../components/ui';
import { formatPercent, formatRupees } from '../../lib/format';
import { buildInsights, monthLabel, previousMonth } from '../../lib/insights';
import { CATEGORY_LABELS } from '../../lib/types';
import { useWallet } from '../../lib/wallet';
import { colors, radius, space, type } from '../../theme';

type Period = 'this' | 'last';

export default function InsightsScreen() {
  const { data } = useWallet();
  const [period, setPeriod] = useState<Period>('this');
  const ref = useMemo(() => (period === 'this' ? new Date() : previousMonth(new Date())), [period]);
  const insights = useMemo(() => buildInsights(data.cards, data.transactions, ref), [data, ref]);
  const totalExtra = insights.tips.reduce((s, t) => s + t.extra, 0);
  const hasImported = data.transactions.some((t) => t.source === 'imported');
  const source = hasImported ? 'your imported statement' : 'sample activity';

  return (
    <Screen>
      <Title kicker="Insights" subtitle={`Based on ${source} and your reward rules.`}>
        {monthLabel(ref)}
      </Title>

      {!hasImported ? (
        <Button
          label="Import your statement"
          variant="secondary"
          size="sm"
          icon="receipt"
          onPress={() => router.push('/import')}
          accessibilityHint="Load real spending from a bank or card statement CSV"
          style={{ alignSelf: 'flex-start', marginBottom: space.md }}
        />
      ) : null}

      <Segmented
        label="Month"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'this', label: 'This Month' },
          { value: 'last', label: 'Last Month' },
        ]}
      />

      {insights.count === 0 ? (
        <View style={{ marginTop: space.xl }}>
          <EmptyState
            icon="chart"
            title="No activity this month"
            message="Insights appear once there is spending in this month. Import a statement or reset the sample data."
          />
        </View>
      ) : (
        <>
          {/* Summary */}
          <View style={styles.tiles}>
            <View style={styles.tile}>
              <Text style={type.mono}>Spent</Text>
              <Amount value={insights.totalSpend} size="lg" style={styles.tileValue} />
              <Text style={type.caption}>
                {insights.count} {insights.count === 1 ? 'purchase' : 'purchases'}
              </Text>
            </View>
            <View style={styles.tile}>
              <Text style={[type.mono, { color: colors.success }]}>Est. rewards</Text>
              <Amount value={insights.totalReward} size="lg" kind="reward" decimals style={styles.tileValue} />
              <Text style={type.caption}>
                {formatPercent(Math.round(insights.rewardRate * 100) / 100)} back overall
              </Text>
            </View>
          </View>

          {/* Spend by category */}
          <SectionHeader title="Where your money went" />
          <Panel style={{ gap: space.lg }}>
            {insights.categories.map((c) => {
              const tint = CATEGORY_TINT[c.category];
              const pct = Math.round(c.share * 100);
              return (
                <View
                  key={c.category}
                  accessible
                  accessibilityLabel={`${CATEGORY_LABELS[c.category]}: ${formatRupees(c.spend)}, ${pct} percent of spend, ${
                    c.count
                  } ${c.count === 1 ? 'purchase' : 'purchases'}`}
                >
                  <View style={styles.catRow}>
                    <View style={[styles.catIcon, { backgroundColor: tint.bg }]}>
                      <Icon name={CATEGORY_ICON[c.category]} color={tint.fg} size={16} />
                    </View>
                    <Text style={[type.label, { flex: 1 }]} numberOfLines={1}>
                      {CATEGORY_LABELS[c.category]}
                    </Text>
                    <Amount value={c.spend} size="sm" />
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(3, pct)}%`, backgroundColor: tint.fg }]} />
                  </View>
                  <Text style={[type.caption, { fontWeight: '500', marginTop: 4 }]}>
                    {pct}% of spend · {c.count} {c.count === 1 ? 'purchase' : 'purchases'}
                  </Text>
                </View>
              );
            })}
          </Panel>

          {/* Rewards by card */}
          <SectionHeader title="Rewards by card" />
          <Panel style={{ paddingVertical: space.xs }}>
            {insights.cards.map((r, i) => (
              <View
                key={r.card.id}
                style={[styles.cardRow, i > 0 && styles.divider]}
                accessible
                accessibilityLabel={`${r.card.nickname}: spent ${formatRupees(r.spend)}, earned an estimated ${formatRupees(
                  r.reward,
                  { decimals: true },
                )}`}
              >
                <View style={[styles.swatch, { backgroundColor: r.card.color }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.body, { fontWeight: '600' }]} numberOfLines={1}>
                    {r.card.nickname}
                  </Text>
                  <Text style={type.caption}>
                    {formatRupees(r.spend)} spent · {r.count} {r.count === 1 ? 'purchase' : 'purchases'}
                  </Text>
                </View>
                <Amount value={r.reward} size="sm" kind="reward" decimals />
              </View>
            ))}
          </Panel>

          {/* Tips */}
          <SectionHeader title="Ways to earn more" />
          {insights.tips.length === 0 ? (
            <Panel style={styles.allGood}>
              <View style={styles.allGoodIcon}>
                <Icon name="check" color={colors.success} size={20} strokeWidth={2.4} />
              </View>
              <Text style={[type.body, { flex: 1 }]}>Every purchase used your best card for its category.</Text>
            </Panel>
          ) : (
            <>
              <Text style={[type.small, { marginBottom: space.md }]}>
                You could have earned about{' '}
                <Text style={{ color: colors.success, fontWeight: '700' }}>
                  {formatRupees(Math.round(totalExtra * 100) / 100, { decimals: true })}
                </Text>{' '}
                more by switching cards.
              </Text>
              <View style={{ gap: space.md }}>
                {insights.tips.slice(0, 4).map((t) => {
                  const tint = CATEGORY_TINT[t.category];
                  return (
                    <Panel key={`${t.category}-${t.bestCard.id}`} style={{ gap: space.md }}>
                      <View style={styles.tipHead}>
                        <View style={[styles.catIcon, { backgroundColor: tint.bg }]}>
                          <Icon name={CATEGORY_ICON[t.category]} color={tint.fg} size={16} />
                        </View>
                        <Text style={[type.h2, { flex: 1 }]}>
                          Use {t.bestCard.nickname} for {CATEGORY_LABELS[t.category]}
                        </Text>
                      </View>
                      <Text style={type.small}>
                        {formatRupees(t.extra, { decimals: true })} more on {t.count}{' '}
                        {t.count === 1 ? 'purchase' : 'purchases'} this month, before any monthly cap.
                      </Text>
                      <Button
                        label="Compare cards"
                        variant="outline"
                        size="sm"
                        iconRight="arrowRight"
                        onPress={() =>
                          router.push({
                            pathname: '/recommend',
                            params: { category: t.category, amount: String(t.averageAmount) },
                          })
                        }
                        accessibilityHint={`Compares cards for a ${CATEGORY_LABELS[t.category]} purchase of ${formatRupees(
                          t.averageAmount,
                        )}`}
                        style={{ alignSelf: 'flex-start' }}
                      />
                    </Panel>
                  );
                })}
              </View>
            </>
          )}

          <Text style={[type.caption, { fontWeight: '500', marginTop: space.lg }]}>
            Estimates from {source} and the reward rules you entered. Not issuer statements.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 4,
  },
  tileValue: { textAlign: 'left', fontSize: 22 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  catIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 60 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  swatch: { width: 10, height: 36, borderRadius: 3 },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  allGood: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  allGoodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
