import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../components/Icon';
import { useWallet } from '../../lib/wallet';
import { colors, fonts, radius, resolveFont } from '../../theme';

function TabIcon({
  name,
  color,
  focused,
  plain,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
  plain?: boolean;
}) {
  return (
    <View
      style={{
        width: 50,
        height: 26,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused && !plain ? colors.primarySoft : 'transparent',
      }}
    >
      <Icon name={name} color={color} size={21} strokeWidth={focused ? 2.2 : 1.9} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data } = useWallet();
  // Tablets in landscape and desktops get a left sidebar; phones keep the bottom bar.
  const wide = width >= 900;
  const bottom = Math.max(insets.bottom, 8);

  // First launch: show the introduction before the main app.
  if (!data.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
        // Sidebar: highlight the whole row in brand colours (not the library's default blue).
        tabBarActiveBackgroundColor: wide ? colors.primarySoft : 'transparent',
        tabBarItemStyle: wide ? { borderRadius: radius.md, marginHorizontal: 12, marginVertical: 2 } : undefined,
        tabBarStyle: wide
          ? {
              backgroundColor: colors.surfaceSunken,
              borderRightWidth: 1,
              borderRightColor: colors.border,
              width: 220,
              paddingTop: insets.top + 24,
            }
          : {
              backgroundColor: colors.surfaceSunken,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              height: 58 + bottom,
              paddingTop: 6,
              paddingBottom: bottom,
            },
        tabBarLabelStyle: {
          fontFamily: resolveFont(fonts.body, '600'),
          fontSize: 12,
          lineHeight: 15,
        },
        tabBarIconStyle: { overflow: 'visible' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => <TabIcon name="wallet" color={color} focused={focused} plain={wide} />,
        }}
      />
      <Tabs.Screen
        name="recommend"
        options={{
          title: 'Best',
          tabBarAccessibilityLabel: 'Choose the best card',
          tabBarIcon: ({ color, focused }) => <TabIcon name="spark" color={color} focused={focused} plain={wide} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => <TabIcon name="activity" color={color} focused={focused} plain={wide} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => <TabIcon name="chart" color={color} focused={focused} plain={wide} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabIcon name="settings" color={color} focused={focused} plain={wide} />,
        }}
      />
    </Tabs>
  );
}
