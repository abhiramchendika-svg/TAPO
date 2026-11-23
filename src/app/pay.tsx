import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Text } from '../components/Text';
import { CardTile, useCardWidth } from '../components/CardTile';
import { Stage } from '../components/Gallery';
import { Icon } from '../components/Icon';
import { Button, Notice, Screen } from '../components/ui';
import { useWallet } from '../lib/wallet';
import { colors, radius, space, type } from '../theme';

/**
 * Real tap to pay: intentionally non-functional. There is no host card
 * emulation, tokenisation or provisioning. A clearly labelled simulation
 * lives separately in /demo-pay.
 */
export default function PayScreen() {
  const { cardId } = useLocalSearchParams<{ cardId?: string }>();
  const { getCard } = useWallet();
  const card = cardId ? getCard(cardId) : undefined;
  const cardW = useCardWidth(300, 72);

  return (
    <Screen edges={['bottom']}>
      {card ? (
        <View style={{ paddingTop: space.sm, marginBottom: space.xl }}>
          <Stage dim caption="Display only · no payment capability">
            <CardTile card={card} width={cardW} elevated={false} />
          </Stage>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: colors.warningBg,
          borderColor: colors.warningBorder,
          borderWidth: 1,
          borderRadius: radius.xl,
          padding: space.xl,
          alignItems: 'center',
          gap: space.sm,
        }}
        accessible
        accessibilityRole="alert"
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.pill,
            backgroundColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space.xs,
          }}
        >
          <Icon name="lock" color={colors.warningText} size={26} />
        </View>
        <Text style={[type.title, { color: colors.warningText, textAlign: 'center' }]}>
          Tap to pay is not available in this prototype.
        </Text>
        <Text style={[type.body, { color: colors.warningText, textAlign: 'center' }]}>
          No payment has been made and none can be made from this app.
        </Text>
      </View>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        <Notice title="To pay for real">
          Use your bank’s official app, a card network–approved wallet, or your physical card. This prototype only
          helps you decide which card to use.
        </Notice>
        <Button
          label="Try the tap-to-pay demo"
          icon="tap"
          onPress={() => router.replace(cardId ? `/demo-pay?cardId=${cardId}` : '/demo-pay')}
          accessibilityHint="Opens a clearly labelled simulation with dummy data. No money is charged."
        />
        <Button
          label="Close"
          variant="outline"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </View>
    </Screen>
  );
}
