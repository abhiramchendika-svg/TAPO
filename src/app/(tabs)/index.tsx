import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../components/Text';
import { BestNow } from '../../components/BestNow';
import { CardStack } from '../../components/CardStack';
import { bestFor, CardList, GalleryWall } from '../../components/Gallery';
import { Icon } from '../../components/Icon';
import { Logo } from '../../components/Logo';
import { Amount } from '../../components/payments';
import { TransactionRow } from '../../components/TransactionRow';
import {
  Button,
  DemoBanner,
  EmptyState,
  IconButton,
  Panel,
  Screen,
  SectionHeader,
  Segmented,
} from '../../components/ui';
import { formatRupees, initials, isSameMonth } from '../../lib/format';
import { buildInsights } from '../../lib/insights';
import { monthSummary } from '../../lib/rewards';
import type { Card } from '../../lib/types';
import { useWallet } from '../../lib/wallet';
import { colors, fonts, radius, space, type } from '../../theme';

type Mode = 'gallery' | 'stack' | 'list';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function HomeScreen() {
  const { data } = useWallet();
  const [mode, setMode] = useState<Mode>('gallery');
  const [active, setActive] = useState(0);
  const cardsById = new Map(data.cards.map((c) => [c.id, c]));
  const recent = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const monthSpend = data.transactions.filter((t) => isSameMonth(t.date)).reduce((s, t) => s + t.amountRupees, 0);
  const monthRewards = data.cards.reduce((s, c) => s + monthSummary(c, data.transactions).totalReward, 0);
  const insights = useMemo(() => buildInsights(data.cards, data.transactions, new Date()), [data]);
  const missed = Math.round(insights.tips.reduce((s, t) => s + t.extra, 0) * 100) / 100;
  const hasImported = data.transactions.some((t) => t.source === 'imported');
  const activeCard: Card | undefined = data.cards[active];
  const open = (c: Card) => router.push(`/card/${c.id}`);
  const add = () => router.push('/card/add');
  const name = data.profile?.displayName;

  return (
    <Screen>
      {/* Brand app bar */}
      <View style={styles.appBar}>
        <Logo size={34} />
        <View style={{ flex: 1 }} />
        <IconButton icon="plus" label="Add card" onPress={add} />
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={name ? `Profile, ${name}` : 'Profile'}
          accessibilityHint="Opens settings and your profile"
          hitSlop={4}
          style={({ pressed }) => [styles.avatar, pressed && { backgroundColor: colors.primaryPressed }]}
        >
          {name ? (
            <Text style={styles.avatarText}>{initials(name)}</Text>
          ) : (
            <Icon name="user" color={colors.onPrimary} size={22} />
          )}
        </Pressable>
      </View>

      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={type.mono}>{greeting()}</Text>
        <Text style={type.display} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
          {name ?? 'Your wallet'}
        </Text>
      </View>
      <DemoBanner />

      {data.cards.length === 0 ? (
        <View style={{ marginTop: space.xl }}>
          <EmptyState
            title="The gallery is empty"
            message="Add a sample card, or restore the demo cards from Settings."
            action={<Button label="Add a card" icon="plus" onPress={add} />}
          />
        </View>
      ) : (
        <>
          <BestNow cards={data.cards} txns={data.transactions} />

          <View style={styles.collectionRow}>
            <Text style={[type.mono, { flex: 1 }]} numberOfLines={1}>
              {data.cards.length} card{data.cards.length === 1 ? '' : 's'}
            </Text>
            <Segmented
              label="Card view"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'gallery', label: 'Gallery' },
                { value: 'stack', label: 'Stack' },
                { value: 'list', label: 'List' },
              ]}
            />
          </View>

          {mode === 'gallery' ? (
            <>
              <View style={styles.bleed}>
                <GalleryWall cards={data.cards} onOpen={open} onAdd={add} onIndexChange={setActive} />
              </View>

              <View style={styles.viewing}>
                <Text style={type.mono} accessibilityLiveRegion="polite">
                  {activeCard ? `You are viewing · ${active + 1} of ${data.cards.length}` : 'An empty frame'}
                </Text>
                <Text style={[type.title, { textAlign: 'center' }]} numberOfLines={2}>
                  {activeCard ? activeCard.nickname : 'Add a sample card'}
                </Text>
                {activeCard ? (
                  <View style={styles.bestRow}>
                    <Icon name="spark" size={14} color={colors.success} strokeWidth={2.2} />
                    <Text style={[type.caption, { color: colors.success }]}>Best: {bestFor(activeCard)}</Text>
                  </View>
                ) : null}
                <Button
                  label={activeCard ? 'View card' : 'Add a card'}
                  variant="ghost"
                  size="sm"
                  iconRight="arrowRight"
                  onPress={() => (activeCard ? open(activeCard) : add())}
                  style={styles.underlined}
                />
              </View>
            </>
          ) : mode === 'stack' ? (
            <CardStack cards={data.cards} txns={data.transactions} />
          ) : (
            <View style={{ marginTop: space.md }}>
              <CardList cards={data.cards} onOpen={open} onAdd={add} />
            </View>
          )}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={type.mono}>Spent · month</Text>
              <Amount value={monthSpend} size="lg" style={styles.statValue} />
              <Text style={[type.caption, { fontWeight: '500' }]}>
                {hasImported ? 'From your statement' : 'Sample activity'}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[type.mono, { color: colors.success }]}>Est. rewards</Text>
              <Amount value={monthRewards} size="lg" kind="reward" decimals style={styles.statValue} />
              <Text style={[type.caption, { fontWeight: '500' }]}>Using your rules</Text>
            </View>
          </View>

          {/* The core metric: rewards left on the table by using the wrong card */}
          <Pressable
            onPress={() => router.push('/insights')}
            accessibilityRole="button"
            accessibilityLabel={
              missed > 0
                ? `Missed rewards this month: about ${formatRupees(missed, { decimals: true })}. Opens insights.`
                : 'No missed rewards this month. Opens insights.'
            }
            style={({ pressed }) => [styles.missed, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.mono, { color: missed > 0 ? colors.warningText : colors.success }]}>
                Missed rewards · month
              </Text>
              <Text style={[type.title, { fontSize: 26 }]}>
                {missed > 0 ? formatRupees(missed, { decimals: true }) : '₹0'}
              </Text>
              <Text style={type.caption}>
                {missed > 0
                  ? `Could have earned this by using your best card for ${insights.tips.length} ${
                      insights.tips.length === 1 ? 'category' : 'categories'
                    }.`
                  : 'Every purchase used your best card.'}
              </Text>
            </View>
            <Icon name="arrowRight" color={colors.ink} size={20} />
          </Pressable>

          <View style={styles.quickRow}>
            <Button
              label="See insights"
              variant="ghost"
              size="sm"
              icon="chart"
              onPress={() => router.push('/insights')}
              accessibilityHint="Opens spending and rewards insights"
              style={{ flex: 1 }}
            />
            <Button
              label={hasImported ? 'Import more' : 'Import statement'}
              variant="ghost"
              size="sm"
              icon="receipt"
              onPress={() => router.push('/import')}
              accessibilityHint="Load real spending from a bank or card statement CSV"
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}

      <View style={styles.hero}>
        <Text style={[styles.heroKicker]}>Rewards guide</Text>
        <Text style={styles.heroTitle}>Which card should I use?</Text>
        <Text style={styles.heroBody}>
          Tap a category for the card to use. Add the amount for the exact reward, and see how every card compares.
        </Text>
        <Button
          label="Choose a card"
          variant="inverse"
          iconRight="arrowRight"
          onPress={() => router.push('/recommend')}
          disabled={data.cards.length === 0}
          accessibilityHint="Opens the card recommendation tool"
          style={{ marginTop: space.lg, alignSelf: 'stretch' }}
        />
        <Pressable
          onPress={() => router.push('/how-it-works')}
          accessibilityRole="link"
          accessibilityLabel="How TAPO works"
          hitSlop={8}
          style={styles.heroLink}
        >
          <Text style={styles.heroLinkText}>How TAPO works</Text>
          <Icon name="arrowRight" color={colors.heroText} size={16} />
        </Pressable>
      </View>

      <SectionHeader
        title="Recent activity"
        action={
          data.transactions.length > 0 ? (
            <Button
              label="See all"
              variant="ghost"
              size="sm"
              iconRight="arrowRight"
              onPress={() => router.push('/transactions')}
            />
          ) : undefined
        }
      />
      {recent.length === 0 ? (
        <EmptyState
          icon="activity"
          title="No activity yet"
          message="Import a statement, or reset the sample data in Settings."
        />
      ) : (
        <Panel style={{ paddingVertical: space.xs }}>
          {recent.map((t, i) => (
            <TransactionRow key={t.id} txn={t} card={cardsById.get(t.cardId)} last={i === recent.length - 1} />
          ))}
        </Panel>
      )}

      {/* Tap-to-pay demo entry (simulation only) — a showcase, kept below the core rewards flow */}
      <Panel style={styles.demoEntry}>
        <View style={styles.demoIcon}>
          <Icon name="tap" color={colors.ink} size={24} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={type.h2}>Tap-to-pay demo</Text>
          <Text style={type.small}>Simulated NFC payment with dummy data. No real money is charged.</Text>
        </View>
        <Button label="Open" size="sm" variant="secondary" onPress={() => router.push('/demo-pay')} />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingBottom: space.md,
    marginBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.condensed, fontSize: 19, fontWeight: '800', color: colors.onPrimary, letterSpacing: 0.5 },
  welcome: { marginBottom: space.md, gap: space.xs },
  collectionRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  bleed: { marginHorizontal: -(space.lg + 4), marginTop: space.lg },
  viewing: { alignItems: 'center', gap: space.xs, marginTop: space.lg },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  underlined: { marginTop: space.xs },
  stats: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 4,
  },
  statValue: { textAlign: 'left', fontSize: 22 },
  missed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  hero: {
    marginTop: space.lg,
    backgroundColor: colors.hero,
    borderRadius: radius.xxl,
    padding: space.xl,
  },
  heroKicker: {
    fontFamily: fonts.body,
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
    color: colors.heroMuted,
    fontWeight: '500',
  },
  heroTitle: { ...type.title, color: colors.heroText, marginTop: space.xs },
  heroBody: { fontSize: 15, lineHeight: 21, color: colors.heroMuted, marginTop: space.sm },
  demoEntry: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  demoIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    marginTop: space.sm,
  },
  heroLinkText: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: colors.heroText,
    textDecorationLine: 'underline',
  },
});
