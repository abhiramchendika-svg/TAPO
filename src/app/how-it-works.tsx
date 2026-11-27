import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '../components/Text';
import { Accordion, BlueprintArt } from '../components/Steps';
import { Button, Screen } from '../components/ui';
import { colors, space, type } from '../theme';

const PRINCIPLES = [
  { word: 'Transparent', line: 'Every recommendation shows its working — rate, cap and the reason it won.' },
  { word: 'Private', line: 'Everything stays on this device. Your account lives here too: no servers, no tracking.' },
  { word: 'Honest', line: 'Sample data is labelled as sample. TAPO never moves money or pretends to.' },
];

export default function HowItWorksScreen() {
  const [artW, setArtW] = useState(0);

  return (
    <Screen edges={['bottom']}>
      <View style={styles.frame} onLayout={(e) => setArtW(e.nativeEvent.layout.width)}>
        {artW > 0 ? <BlueprintArt width={artW} height={Math.round(artW * 0.55)} /> : null}
      </View>

      <Text style={[type.mono, { marginTop: space.xl }]}>How TAPO works</Text>
      <Text style={styles.statement} accessibilityRole="header">
        Clarity before you pay.
      </Text>
      <Text style={[type.body, { color: colors.textMuted, marginTop: space.md }]}>
        TAPO compares the reward rules you enter for each card and explains which one to use. It never makes a
        payment.
      </Text>

      <View style={styles.principles}>
        {PRINCIPLES.map((p, i) => (
          <View key={p.word} style={[styles.principle, i > 0 && styles.principleDivider]}>
            <Text style={styles.principleWord}>{p.word}</Text>
            <Text style={[type.small, { flex: 1 }]}>{p.line}</Text>
          </View>
        ))}
      </View>

      <Text style={[type.mono, { marginTop: space.xxl, marginBottom: space.sm }]}>The process</Text>
      <Accordion
        n={1}
        title="Add your cards"
        summary="Only what you need to recognise a card."
        initiallyOpen
        scope={['A nickname', 'A fictional sample issuer', 'Network and card type', 'The last four digits only']}
      >
        <Text style={type.body}>
          Each card is added in four short steps. TAPO stores just enough to tell your cards apart — never a full card
          number, CVV, PIN or OTP.
        </Text>
      </Accordion>
      <Accordion
        n={2}
        title="Set reward rules"
        summary="Your own estimates, per category."
        scope={['A base rate for everyday spends', 'Higher rates for chosen categories', 'Optional monthly caps in ₹']}
      >
        <Text style={type.body}>
          Rules are yours to edit at any time from the card’s details. They are sample estimates, not issuer terms.
        </Text>
      </Accordion>
      <Accordion
        n={3}
        title="Ask for the best card"
        summary="Tap a category; the amount is optional."
        scope={[
          'One tap ranks cards by the rate they pay now',
          'Reward = amount × the card’s rate for that category',
          'No category rule? The base rate applies',
          'Caps limit the reward to what’s left this month',
          'Ties go to the higher rate, then the name',
        ]}
      >
        <Text style={type.body}>
          TAPO ranks every card and shows its working, so you can see exactly why one card beats another.
        </Text>
      </Accordion>
      <Accordion
        n={4}
        title="What TAPO never does"
        summary="No payments, no sensitive data."
        scope={[
          'No real tap to pay, card emulation or provisioning — the tap-to-pay demo is a labelled simulation',
          'NFC is only used to read a harmless demo code from a sticker',
          'No full card numbers, CVV, PIN or OTP',
          'No bank logins or payment tokens',
          'No analytics, ads or tracking',
        ]}
      >
        <Text style={type.body}>
          TAPO is a prototype. To pay, use your bank’s official app, an approved wallet or your physical card.
        </Text>
      </Accordion>
      <View style={styles.endRule} />

      <Button
        label="Choose a card"
        iconRight="arrowRight"
        onPress={() => router.push('/recommend')}
        style={{ marginTop: space.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    marginTop: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  statement: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '300',
    color: colors.ink,
    letterSpacing: -0.6,
    marginTop: space.sm,
  },
  principles: {
    marginTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  principle: { paddingVertical: space.lg, gap: space.xs },
  principleDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  principleWord: { fontSize: 22, fontWeight: '300', color: colors.ink, letterSpacing: -0.3 },
  endRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
});
