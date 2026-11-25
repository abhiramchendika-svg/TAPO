import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CATEGORY_ICON, Icon } from '../../components/Icon';
import { Amount } from '../../components/payments';
import { Text } from '../../components/Text';
import { TransactionRow } from '../../components/TransactionRow';
import { Button, Chip, EmptyState, Panel, Screen, Title } from '../../components/ui';
import { dayKey, formatDayLabel } from '../../lib/format';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Transaction } from '../../lib/types';
import { useWallet } from '../../lib/wallet';
import { colors, radius, resolveFont, space, type } from '../../theme';

export default function TransactionsScreen() {
  const { data } = useWallet();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [cardId, setCardId] = useState<string | 'all'>('all');
  const cardsById = useMemo(() => new Map(data.cards.map((c) => [c.id, c])), [data.cards]);

  // Links such as "See all" on a card open Activity filtered to that card (applied once per link).
  const params = useLocalSearchParams<{ cardId?: string }>();
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);
  if (params.cardId !== seenParam) {
    setSeenParam(params.cardId);
    if (params.cardId && cardsById.has(params.cardId)) {
      setCardId(params.cardId);
      setCategory('all');
      setQuery('');
    }
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...data.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((t) => category === 'all' || t.category === category)
      .filter((t) => cardId === 'all' || t.cardId === cardId)
      .filter((t) => {
        if (!q) return true;
        const card = cardsById.get(t.cardId);
        return [t.merchant, CATEGORY_LABELS[t.category], card?.nickname ?? '', card?.last4 ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      });
  }, [data.transactions, category, cardId, query, cardsById]);

  // Group by calendar day, newest first.
  const groups = useMemo(() => {
    const out: { key: string; label: string; total: number; items: Transaction[] }[] = [];
    for (const t of shown) {
      const k = dayKey(t.date);
      let g = out[out.length - 1];
      if (!g || g.key !== k) {
        g = { key: k, label: formatDayLabel(t.date), total: 0, items: [] };
        out.push(g);
      }
      g.items.push(t);
      g.total += t.amountRupees;
    }
    return out;
  }, [shown]);

  const total = shown.reduce((s, t) => s + t.amountRupees, 0);
  const filtered = query.trim() !== '' || category !== 'all' || cardId !== 'all';
  const clear = () => {
    setQuery('');
    setCategory('all');
    setCardId('all');
  };

  return (
    <Screen>
      <Title kicker="Sample ledger" subtitle="Demo activity only — no real purchases or payments are recorded.">
        Activity
      </Title>

      {/* Search */}
      <View style={styles.search}>
        <Icon name="search" color={colors.textSubtle} size={20} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search merchant, card or category"
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          accessibilityLabel="Search activity"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
            style={styles.clearBtn}
          >
            <Icon name="close" color={colors.textMuted} size={18} />
          </Pressable>
        ) : null}
      </View>

      {/* Filters */}
      <FilterRow label="Filter by category">
        <Chip label="All categories" selected={category === 'all'} onPress={() => setCategory('all')} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={CATEGORY_LABELS[c]}
            icon={CATEGORY_ICON[c]}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </FilterRow>
      {data.cards.length > 1 ? (
        <FilterRow label="Filter by card">
          <Chip label="All cards" icon="card" selected={cardId === 'all'} onPress={() => setCardId('all')} />
          {data.cards.map((c) => (
            <Chip
              key={c.id}
              label={`${c.nickname} •• ${c.last4}`}
              selected={cardId === c.id}
              onPress={() => setCardId(c.id)}
            />
          ))}
        </FilterRow>
      ) : null}

      {shown.length === 0 ? (
        data.transactions.length === 0 ? (
          <EmptyState
            icon="activity"
            title="No activity yet"
            message="Reset demo data in Settings to load sample transactions."
          />
        ) : (
          <EmptyState
            icon="search"
            title="No matching transactions"
            message="Try a different search, or clear the filters to see everything."
            action={<Button label="Clear search and filters" variant="outline" size="sm" onPress={clear} />}
          />
        )
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={type.small} accessibilityLiveRegion="polite">
              {shown.length} {shown.length === 1 ? 'transaction' : 'transactions'}
              {filtered ? ' match' : ''}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={type.caption}>Total spent</Text>
              <Amount value={total} size="lg" />
            </View>
          </View>
          {filtered ? (
            <Button
              label="Clear filters"
              variant="ghost"
              size="sm"
              icon="close"
              onPress={clear}
              style={{ alignSelf: 'flex-start', marginBottom: space.sm }}
            />
          ) : null}

          {groups.map((g) => (
            <View key={g.key} style={{ marginBottom: space.lg }}>
              <View style={styles.dayHeader} accessibilityRole="header">
                <Text style={type.mono}>{g.label}</Text>
                <Amount value={g.total} size="sm" kind="muted" />
              </View>
              <Panel style={{ paddingVertical: space.xs }}>
                {g.items.map((t, i) => (
                  <TransactionRow
                    key={t.id}
                    txn={t}
                    card={cardsById.get(t.cardId)}
                    last={i === g.items.length - 1}
                    when="time"
                  />
                ))}
              </Panel>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -(space.lg + 4), marginBottom: space.sm, flexGrow: 0 }}
      contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg + 4, paddingVertical: 3 }}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: space.md,
    fontFamily: resolveFont('body', '500'),
  },
  clearBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: space.md,
    marginBottom: space.md,
    paddingHorizontal: space.xs,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    marginBottom: space.sm,
  },
});
