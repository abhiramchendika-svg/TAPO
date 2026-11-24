import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardTile, useCardWidth } from '../components/CardTile';
import { Stage } from '../components/Gallery';
import { Icon, type IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { Text } from '../components/Text';
import { Button, Field } from '../components/ui';
import { DISPLAY_NAME_MAX, validateDisplayName } from '../lib/validation';
import { useWallet } from '../lib/wallet';
import { colors, focusRing, fonts, isFocused, radius, space, type } from '../theme';

type Page = {
  key: string;
  icon?: IconName;
  kicker: string;
  title: string;
  body: string;
  points?: string[];
};

const PAGES: Page[] = [
  {
    key: 'welcome',
    kicker: 'Welcome to TAPO',
    title: 'The right card, every time',
    body: 'Keep your cards in one place and see which one earns the most rewards for each purchase.',
  },
  {
    key: 'private',
    icon: 'lock',
    kicker: 'Private by design',
    title: 'Only what you need',
    body: 'TAPO recognises your cards without holding anything sensitive.',
    points: [
      'Just a nickname and the last four digits',
      'Never your full card number, CVV, PIN or OTP',
      'Your account and data stay on this device — no servers, no tracking',
    ],
  },
  {
    key: 'best',
    icon: 'spark',
    kicker: 'Best card, explained',
    title: 'Ask before you pay',
    body: 'Tell TAPO what you’re buying and it compares your cards for you.',
    points: [
      'Pick a category and enter the amount in ₹',
      'See every card ranked, with the maths shown',
      'Set your own reward rates and monthly caps',
    ],
  },
  {
    key: 'honest',
    icon: 'tap',
    kicker: 'Honest about what it is',
    title: 'A demo, not a bank',
    body: 'TAPO is a prototype for exploring rewards.',
    points: [
      'Cards, issuers and activity are sample data',
      'TAPO never moves money or charges a card',
      'The tap-to-pay demo is clearly marked as a simulation',
    ],
  },
];

export default function OnboardingScreen() {
  const { data, setOnboarded, setProfile } = useWallet();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [name, setName] = useState(data.profile?.displayName ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const listRef = useRef<FlatList<Page>>(null);
  const cardW = useCardWidth(280, 120);

  const last = index === PAGES.length - 1;
  const nameError = nameTouched && name.trim() ? validateDisplayName(name) : null;
  const sampleCard = data.cards[0];

  function goTo(i: number) {
    const n = Math.max(0, Math.min(PAGES.length - 1, i));
    listRef.current?.scrollToOffset({ offset: n * width, animated: true });
    setIndex(n);
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index && i >= 0 && i < PAGES.length) setIndex(i);
  }

  function finish() {
    const trimmed = name.trim();
    if (trimmed) {
      if (validateDisplayName(trimmed)) {
        setNameTouched(true);
        return;
      }
      setProfile({ displayName: trimmed });
    }
    setOnboarded(true);
    router.replace('/');
  }

  function skip() {
    setOnboarded(true);
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={styles.top}>
          <Text style={styles.counter} accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`}>
            <Text style={{ color: colors.ink }}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={{ color: colors.borderStrong }}>{'  |  '}</Text>
            {String(PAGES.length).padStart(2, '0')}
          </Text>
          {!last ? (
            <Button label="Skip" variant="ghost" size="sm" onPress={skip} accessibilityHint="Skips the introduction" />
          ) : null}
        </View>

        {/* Pages */}
        <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? (
            <FlatList
              ref={listRef}
              data={PAGES}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(p) => p.key}
              onScroll={onScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              renderItem={({ item, index: i }) => (
                <View
                  style={{ width }}
                  // Only the visible page is exposed to screen readers.
                  accessibilityElementsHidden={i !== index}
                  importantForAccessibility={i === index ? 'auto' : 'no-hide-descendants'}
                >
                  <ScrollView
                    contentContainerStyle={styles.page}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {item.key === 'welcome' ? (
                      <>
                        <Logo size={40} />
                        {sampleCard ? (
                          <View style={{ alignSelf: 'stretch', marginTop: space.xl }}>
                            <Stage caption="Sample card">
                              <CardTile card={sampleCard} width={cardW} />
                            </Stage>
                          </View>
                        ) : null}
                      </>
                    ) : item.icon ? (
                      <View style={styles.iconTile}>
                        <Icon name={item.icon} color={colors.ink} size={34} strokeWidth={1.8} />
                      </View>
                    ) : null}

                    <Text style={[type.mono, { marginTop: space.xl }]}>{item.kicker}</Text>
                    <Text style={[type.display, styles.title]} accessibilityRole="header">
                      {item.title}
                    </Text>
                    <Text style={[type.body, styles.body]}>{item.body}</Text>

                    {item.points ? (
                      <View style={styles.points}>
                        {item.points.map((p) => (
                          <View key={p} style={styles.point}>
                            <View style={styles.pointTick}>
                              <Icon name="check" color={colors.success} size={14} strokeWidth={2.6} />
                            </View>
                            <Text style={[type.body, { flex: 1 }]}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {item.key === 'honest' ? (
                      <View style={{ alignSelf: 'stretch', marginTop: space.xl }}>
                        <Field
                          label="What should we call you? (optional)"
                          value={name}
                          onChangeText={(t) => setName(t.replace(/\d/g, ''))}
                          onBlur={() => setNameTouched(true)}
                          maxLength={DISPLAY_NAME_MAX}
                          placeholder="e.g. Priya"
                          autoCapitalize="words"
                          autoComplete="off"
                          importantForAutofill="no"
                          error={nameError}
                          hint="Used only for your greeting. Stored on this device."
                          returnKeyType="done"
                          onSubmitEditing={finish}
                        />
                      </View>
                    ) : null}
                  </ScrollView>
                </View>
              )}
            />
          ) : null}
        </View>

        {/* Bottom controls */}
        <View style={styles.bottom}>
          <View style={styles.dots} accessibilityRole="tablist">
            {PAGES.map((p, i) => (
              <Pressable
                key={p.key}
                onPress={() => goTo(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: i === index }}
                accessibilityLabel={`Page ${i + 1}: ${p.title}`}
                hitSlop={8}
                style={(state) => [{ padding: 4, borderRadius: 8 }, isFocused(state) && focusRing]}
              >
                <View style={[styles.dot, i === index && styles.dotActive]} />
              </Pressable>
            ))}
          </View>
          <View style={styles.nav}>
            {index > 0 ? (
              <Button
                label="Back"
                variant="outline"
                icon="arrowLeft"
                onPress={() => goTo(index - 1)}
                style={{ flex: 1 }}
              />
            ) : null}
            <Button
              label={last ? 'Get started' : 'Next'}
              iconRight={last ? 'check' : 'arrowRight'}
              onPress={() => (last ? finish() : goTo(index + 1))}
              style={{ flex: index > 0 ? 1.5 : 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg + 4,
    minHeight: 52,
  },
  counter: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textSubtle,
    fontVariant: ['tabular-nums'],
  },
  page: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: space.lg + 4,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    alignItems: 'flex-start',
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: space.xs },
  body: { color: colors.textMuted, marginTop: space.md },
  points: { gap: space.md, marginTop: space.xl, alignSelf: 'stretch' },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  pointTick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bottom: { paddingHorizontal: space.lg + 4, paddingBottom: space.md, gap: space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotActive: { width: 22, backgroundColor: colors.primary },
  nav: { flexDirection: 'row', gap: space.md, width: '100%', maxWidth: 520, alignSelf: 'center' },
});
