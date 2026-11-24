import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LogoMark } from '../components/Logo';
import { AuthProvider, useAuth } from '../lib/auth';
import { useWallet, WalletProvider } from '../lib/wallet';
import { colors, FONT_FILES, fonts, resolveFont } from '../theme';

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.bg }}>
      {/* Symbol only: it's an SVG, so it never shows in a fallback font while fonts load. */}
      <LogoMark size={64} />
      <ActivityIndicator color={colors.primary} accessibilityLabel="Loading TAPO" />
    </View>
  );
}

function RootStack({ signedIn }: { signedIn: boolean }) {
  const { ready, data } = useWallet();
  const needsIntro = signedIn && ready && !data.onboarded;
  // A brand-new account goes to the welcome screens once its wallet has loaded.
  useEffect(() => {
    if (needsIntro) router.replace('/onboarding');
  }, [needsIntro]);
  if (!ready) return <Loading />;
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
      {/* Signed out: only the sign-in screen exists. Every restart or reload starts here. */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
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
      </Stack.Protected>
    </Stack>
  );
}

function Shell() {
  const { ready, session } = useAuth();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  // If fonts fail to load, carry on with system fonts rather than blocking the app.
  if (!ready || (!fontsLoaded && !fontError)) return <Loading />;
  return (
    // Keyed by account, so signing in as someone else loads their own wallet from scratch.
    <WalletProvider
      key={session?.userId ?? 'signed-out'}
      userId={session?.userId ?? null}
      adoptLegacy={session?.adoptLegacy}
      defaultName={session?.name}
    >
      <RootStack signedIn={!!session} />
    </WalletProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Shell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
