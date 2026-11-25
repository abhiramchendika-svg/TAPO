import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { DemoModeBanner, DemoReceipt } from '../../components/DemoReceipt';
import { Button, EmptyState, Screen } from '../../components/ui';
import { useWallet } from '../../lib/wallet';
import { space } from '../../theme';

export default function DemoReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, getCard } = useWallet();
  const payment = data.demoPayments?.find((p) => p.id === id);
  // The card may have been removed since; only offer card actions while it still exists.
  const card = payment ? getCard(payment.cardId) : undefined;

  return (
    <Screen edges={['bottom']}>
      <DemoModeBanner />
      <View style={{ height: space.md }} />
      {payment ? (
        <>
          <DemoReceipt payment={payment} />
          <View style={{ marginTop: space.xl, gap: space.md }}>
            {card ? (
              <Button
                label="Run again with this card"
                icon="tap"
                onPress={() => router.replace({ pathname: '/demo-pay', params: { cardId: card.id } })}
                accessibilityHint={`Starts a new simulated payment with ${card.nickname}. No money is charged.`}
              />
            ) : null}
            <View style={{ flexDirection: 'row', gap: space.md }}>
              {card ? (
                <Button
                  label="View card"
                  variant="outline"
                  iconRight="arrowRight"
                  onPress={() => router.push(`/card/${card.id}`)}
                  style={{ flex: 1 }}
                />
              ) : null}
              <Button
                label={card ? 'New demo' : 'Run a demo payment'}
                variant="outline"
                icon={card ? undefined : 'tap'}
                onPress={() => router.replace('/demo-pay')}
                accessibilityHint="Starts a new simulated payment and lets you choose the card"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </>
      ) : (
        <EmptyState
          icon="receipt"
          title="Demo receipt not found"
          message="It may have been cleared, or the demo data was reset."
          action={<Button label="Open tap-to-pay demo" onPress={() => router.replace('/demo-pay')} />}
        />
      )}
    </Screen>
  );
}
