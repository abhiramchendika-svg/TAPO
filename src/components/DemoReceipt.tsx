import { StyleSheet, View } from 'react-native';

import { formatDate, formatTime } from '../lib/format';
import type { DemoPayment } from '../lib/types';
import { colors, fonts, radius, space, type } from '../theme';
import { Icon } from './Icon';
import { Amount, DetailList, DetailRow, StatusBadge } from './payments';
import { Text } from './Text';

/** Banner shown on every step of the demo and on receipts. */
export function DemoModeBanner() {
  return (
    <View style={styles.banner} accessible accessibilityRole="alert" accessibilityLabel="Demo mode. No real money is charged.">
      <Icon name="info" color={colors.warningText} size={20} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>Demo mode — no real money is charged</Text>
        <Text style={[type.caption, { color: colors.warningText, fontWeight: '500' }]}>
          Dummy data only. No card details are read, stored or sent.
        </Text>
      </View>
    </View>
  );
}

/** Outcome header + receipt details for a demo payment. */
export function DemoReceipt({ payment }: { payment: DemoPayment }) {
  const approved = payment.outcome === 'approved';
  return (
    <View>
      <View style={styles.hero} accessibilityLiveRegion="polite">
        <View style={[styles.heroIcon, { backgroundColor: approved ? colors.successBg : colors.dangerBg }]}>
          <Icon name={approved ? 'check' : 'close'} color={approved ? colors.success : colors.danger} size={34} strokeWidth={2.4} />
        </View>
        <Text style={[type.title, { textAlign: 'center' }]} accessibilityRole="header">
          {approved ? 'Payment approved' : 'Payment declined'}
        </Text>
        <StatusBadge status={approved ? 'demo-approved' : 'demo-declined'} />
        <Amount value={payment.amountRupees} size="xl" style={{ textAlign: 'center', marginTop: space.sm }} />
        <Text style={type.small}>to {payment.merchant}</Text>
      </View>

      <Text style={[type.small, { textAlign: 'center', marginBottom: space.lg }]}>
        {approved
          ? 'This approval is simulated. No money moved and no card was charged.'
          : 'This decline was chosen in the demo settings. No money moved. In a real payment, a declined card isn’t charged.'}
      </Text>

      <Text style={[type.mono, { marginBottom: space.sm }]}>Demo receipt</Text>
      <DetailList>
        <DetailRow label="Transaction ID">
          <Text style={styles.mono} selectable>
            {payment.id}
          </Text>
        </DetailRow>
        <DetailRow label="Date" value={formatDate(payment.createdAt)} />
        <DetailRow label="Time" value={formatTime(payment.createdAt)} />
        <DetailRow label="Merchant" value={payment.merchant} />
        <DetailRow label="Card" value={payment.cardLabel} hint="Sample card label only" />
        <DetailRow
          label="Trigger"
          value={payment.method === 'nfc-tag' ? 'NFC demo tag' : 'Simulated tap'}
          hint={payment.tagCode ? `Tag code ${payment.tagCode}` : undefined}
        />
        <DetailRow label="Fees" value="None (demo)" />
        <DetailRow label="Result" value={approved ? 'Approved (simulated)' : 'Declined (simulated)'} />
        <DetailRow label="Amount" emphasis last>
          <Amount value={payment.amountRupees} size="md" />
        </DetailRow>
      </DetailList>
      <View style={{ marginTop: space.md, alignItems: 'center' }}>
        <StatusBadge status="demo" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBg,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: colors.warningText },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  mono: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: colors.ink, letterSpacing: 0.5 },
});
