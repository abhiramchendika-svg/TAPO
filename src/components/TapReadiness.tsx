import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { checkNfcSupport, NFC_SUPPORT_LABELS, openNfcSettings, type NfcSupport } from '../lib/demoNfc';
import type { Card } from '../lib/types';
import { colors, radius, space, type } from '../theme';
import { Icon } from './Icon';
import { StatusBadge } from './payments';
import { Text } from './Text';
import { Button, Panel } from './ui';

/**
 * Whether this device can scan a TAPO demo NFC tag, with a shortcut into the tap-to-pay
 * simulation for one card. It only reports NFC availability (the same check the demo uses);
 * it never reads the card, and nothing here moves money.
 */
export function TapReadiness({ card }: { card: Card }) {
  const [support, setSupport] = useState<NfcSupport | 'checking'>('checking');
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    let alive = true;
    checkNfcSupport()
      .then((s) => alive && setSupport(s))
      .catch(() => alive && setSupport(Platform.OS === 'web' ? 'unsupported-browser' : 'unsupported-device'));
    return () => {
      alive = false;
    };
  }, [checks]);

  const ready = support === 'supported';
  const recheck = () => {
    setSupport('checking');
    setChecks((n) => n + 1);
  };
  const detail =
    support === 'checking'
      ? 'Checking this device…'
      : ready
        ? `Hold a TAPO demo tag near your phone to start a simulated payment with ${card.nickname}.`
        : support === 'nfc-disabled'
          ? 'Turn NFC on to scan demo tags, or run the demo with Simulate tap.'
          : 'Demo tags can’t be scanned here. You can still run the demo with Simulate tap.';

  return (
    <Panel style={styles.panel}>
      <View style={styles.head}>
        <View style={[styles.icon, ready && { backgroundColor: colors.successBg }]}>
          <Icon name="tap" color={ready ? colors.success : colors.textMuted} size={22} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text style={type.h2}>Tap demo readiness</Text>
          {/* Status sits under the title so long labels never squeeze the explanation. */}
          <View style={{ alignSelf: 'flex-start' }}>
            {support === 'checking' ? (
              <ActivityIndicator color={colors.primary} accessibilityLabel="Checking NFC" />
            ) : (
              <StatusBadge status={ready ? 'best' : 'unavailable'} label={ready ? 'Ready' : NFC_SUPPORT_LABELS[support]} />
            )}
          </View>
        </View>
      </View>
      <Text style={type.small} accessibilityLiveRegion="polite">
        {detail}
      </Text>

      <View style={styles.actions}>
        <Button
          label="Demo tap with this card"
          icon="tap"
          size="sm"
          onPress={() => router.push({ pathname: '/demo-pay', params: { cardId: card.id } })}
          accessibilityHint="Opens the tap-to-pay simulation with this card selected. No money is charged."
          style={{ flexGrow: 1 }}
        />
        {support === 'nfc-disabled' ? (
          <Button
            label="Open NFC settings"
            variant="secondary"
            size="sm"
            onPress={() => openNfcSettings().catch(() => {})}
            style={{ flexGrow: 1 }}
          />
        ) : null}
        {support !== 'checking' && !ready ? (
          <Button label="Check again" variant="ghost" size="sm" icon="refresh" onPress={recheck} />
        ) : null}
      </View>
      <Text style={type.caption}>Simulation only. TAPO never reads card details and no money moves.</Text>
    </Panel>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
