import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LogoMark } from '../components/Logo';
import { useWallet, WalletProvider } from '../lib/wallet';
import { useFonts } from 'expo-font';

import { colors, FONT_FILES, fonts, resolveFont } from '../theme';

function RootStack() {
  const { ready } = useWallet();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  // If fonts fail to load, carry on with system fonts rather than blocking the app.
  if (!ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.bg }}>
        {/* Symbol only: it's an SVG, so it never shows in a fallback font while fonts load. */}
        <LogoMark size={64} />
        <ActivityIndicator color={colors.primary} accessibilityLabel="Loading TAPO" />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.ink, fontSize: 17, fontFamily: resolveFont(fonts.body, '700') },
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="card/add" options={{ title: 'Add card', presentation: 'modal' }} />
      <Stack.Screen name="card/[id]" options={{ title: 'Card details' }} />
      <Stack.Screen name="pay" options={{ title: 'Pay', presentation: 'modal' }} />
      <Stack.Screen name="how-it-works" options={{ title: 'How TAPO works' }} />
      <Stack.Screen name="transaction/[id]" options={{ title: 'Transaction' }} />
      <Stack.Screen name="demo-pay" options={{ title: 'Tap-to-pay demo' }} />
      <Stack.Screen name="demo-receipt/[id]" options={{ title: 'Demo receipt' }} />
      <Stack.Screen name="developer" options={{ title: 'Developer' }} />
      <Stack.Screen name="import" options={{ title: 'Import statement' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <StatusBar style="light" />
        <RootStack />
      </WalletProvider>
    </SafeAreaProvider>
  );
}
