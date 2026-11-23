import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { DemoModeBanner, DemoReceipt } from '../../components/DemoReceipt';
import { Button, EmptyState, Screen } from '../../components/ui';
import { useWallet } from '../../lib/wallet';
import { space } from '../../theme';

export default function DemoReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useWallet();
  const payment = data.demoPayments?.find((p) => p.id === id);

  return (
    <Screen edges={['bottom']}>
      <DemoModeBanner />
      <View style={{ height: space.md }} />
      {payment ? (
        <>
          <DemoReceipt payment={payment} />
          <Button
            label="Run a demo payment"
            variant="outline"
            icon="tap"
            onPress={() => router.replace('/demo-pay')}
            style={{ marginTop: space.xl }}
          />
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
