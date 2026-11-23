import { View, type ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { Category } from '../lib/types';

/** Original, minimal stroke icons on a 24×24 grid. Decorative by default. */
export type IconName =
  | 'wallet'
  | 'spark'
  | 'activity'
  | 'settings'
  | 'plus'
  | 'minus'
  | 'chart'
  | 'code'
  | 'search'
  | 'close'
  | 'tap'
  | 'receipt'
  | 'chevronRight'
  | 'arrowLeft'
  | 'arrowRight'
  | 'grid'
  | 'user'
  | 'info'
  | 'shield'
  | 'card'
  | 'trash'
  | 'edit'
  | 'lock'
  | 'refresh'
  | 'check'
  | 'dining'
  | 'groceries'
  | 'fuel'
  | 'travel'
  | 'online'
  | 'utilities'
  | 'entertainment'
  | 'other';

export function Icon({
  name,
  size = 22,
  color = '#E6E4DE',
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}) {
  const p = {
    stroke: color as string,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {renderIcon(name, p, color as string)}
      </Svg>
    </View>
  );
}

type P = { stroke: string; strokeWidth: number; strokeLinecap: 'round'; strokeLinejoin: 'round'; fill: string };

function renderIcon(name: IconName, p: P, color: string) {
  switch (name) {
    case 'wallet':
      return (
        <>
          <Path {...p} d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17a1 1 0 0 1 1 1v2" />
          <Rect {...p} x={3.5} y={7.5} width={17} height={12} rx={2.5} />
          <Path {...p} d="M20.5 11.5h-3.5a2 2 0 0 0 0 4h3.5" />
          <Circle cx={17.2} cy={13.5} r={0.9} fill={color} />
        </>
      );
    case 'spark':
      return (
        <>
          <Path {...p} d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
          <Path {...p} d="M18.5 16v4M16.5 18h4" />
        </>
      );
    case 'activity':
      return (
        <>
          <Rect {...p} x={4} y={3.5} width={16} height={17} rx={3} />
          <Path {...p} d="M8 9h8M8 12.5h8M8 16h5" />
        </>
      );
    case 'settings':
      return (
        <>
          <Path {...p} d="M5 7h9M18 7h1M5 17h1M10 17h9" />
          <Circle {...p} cx={16} cy={7} r={2} />
          <Circle {...p} cx={8} cy={17} r={2} />
          <Path {...p} d="M5 12h5M14 12h5" />
          <Circle {...p} cx={12} cy={12} r={2} />
        </>
      );
    case 'plus':
      return <Path {...p} d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path {...p} d="M5 12h14" />;
    case 'chart':
      return (
        <>
          <Path {...p} d="M4 20h16" />
          <Rect {...p} x={5.5} y={12} width={3.2} height={6} rx={1} />
          <Rect {...p} x={10.4} y={7} width={3.2} height={11} rx={1} />
          <Rect {...p} x={15.3} y={10} width={3.2} height={8} rx={1} />
        </>
      );
    case 'code':
      return <Path {...p} d="M8.5 8L4.5 12l4 4M15.5 8l4 4-4 4M13.5 5.5l-3 13" />;
    case 'search':
      return (
        <>
          <Circle {...p} cx={11} cy={11} r={6.5} />
          <Path {...p} d="M16 16l4 4" />
        </>
      );
    case 'tap':
      return (
        <>
          <Rect {...p} x={3.5} y={6} width={9} height={14} rx={2} />
          <Path {...p} d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7.5a6.5 6.5 0 0 1 0 9M20.5 5.5a9.5 9.5 0 0 1 0 13" />
        </>
      );
    case 'close':
      return <Path {...p} d="M6.5 6.5l11 11M17.5 6.5l-11 11" />;
    case 'receipt':
      return (
        <>
          <Path {...p} d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
          <Path {...p} d="M9 8.5h6M9 12h6M9 15.5h3.5" />
        </>
      );
    case 'chevronRight':
      return <Path {...p} d="M9.5 6l6 6-6 6" />;
    case 'arrowLeft':
      return <Path {...p} d="M19 12H5M11 6l-6 6 6 6" />;
    case 'arrowRight':
      return <Path {...p} d="M5 12h14M13 6l6 6-6 6" />;
    case 'grid':
      return (
        <>
          <Rect {...p} x={4} y={4} width={7} height={7} rx={1.5} />
          <Rect {...p} x={13} y={4} width={7} height={7} rx={1.5} />
          <Rect {...p} x={4} y={13} width={7} height={7} rx={1.5} />
          <Rect {...p} x={13} y={13} width={7} height={7} rx={1.5} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle {...p} cx={12} cy={8.5} r={3.8} />
          <Path {...p} d="M4.5 20c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6" />
        </>
      );
    case 'info':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={8.5} />
          <Path {...p} d="M12 11v5" />
          <Circle cx={12} cy={8} r={1.1} fill={color} />
        </>
      );
    case 'shield':
      return (
        <>
          <Path {...p} d="M12 3.5l7 2.8v5.2c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6.3z" />
          <Path {...p} d="M9 12l2.2 2.2L15.5 10" />
        </>
      );
    case 'card':
      return (
        <>
          <Rect {...p} x={3} y={5.5} width={18} height={13} rx={2.5} />
          <Path {...p} d="M3 10h18M7 14.5h4" />
        </>
      );
    case 'trash':
      return (
        <>
          <Path {...p} d="M4.5 7h15M9.5 7V5h5v2M6.5 7l.8 12h9.4l.8-12" />
          <Path {...p} d="M10.2 10.5v5.5M13.8 10.5v5.5" />
        </>
      );
    case 'edit':
      return (
        <>
          <Path {...p} d="M14.5 5.5l4 4L9 19H5v-4z" />
          <Path {...p} d="M12.5 7.5l4 4" />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect {...p} x={5} y={10.5} width={14} height={9.5} rx={2.5} />
          <Path {...p} d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path {...p} d="M19 12a7 7 0 1 1-2.1-5" />
          <Path {...p} d="M19 4.5V8h-3.5" />
        </>
      );
    case 'check':
      return <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" />;
    case 'dining':
      return (
        <>
          <Path {...p} d="M7 3.5v6a2 2 0 0 0 4 0v-6M9 3.5v17" />
          <Path {...p} d="M16.5 20.5v-17c-2 1.2-3 3.6-3 6.5v3.5h3" />
        </>
      );
    case 'groceries':
      return (
        <>
          <Path {...p} d="M3.5 5h2.2l2 10.5h10l1.8-7.5H7" />
          <Circle {...p} cx={9} cy={19} r={1.4} />
          <Circle {...p} cx={16.5} cy={19} r={1.4} />
        </>
      );
    case 'fuel':
      return (
        <>
          <Rect {...p} x={4.5} y={4} width={9} height={16} rx={1.8} />
          <Path {...p} d="M4.5 10h9M13.5 8l3.5 2.5V17a1.5 1.5 0 0 0 3 0V9l-2-2" />
        </>
      );
    case 'travel':
      return (
        <Path {...p} d="M10.5 20l1.5-6-6.5-1.5L4 13l1-2 7 .5 3.5-6c.6-1 2-1.3 2.6-.7s.3 2-.7 2.6l-6 3.5.5 7-2 1z" />
      );
    case 'online':
      return (
        <>
          <Path {...p} d="M5.5 8h13l-1 12h-11z" />
          <Path {...p} d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
        </>
      );
    case 'utilities':
      return <Path {...p} d="M13 3.5L6 13.5h5.5L10.5 20.5 18 10h-5.5z" />;
    case 'entertainment':
      return (
        <>
          <Rect {...p} x={3.5} y={6} width={17} height={12} rx={2.5} />
          <Path {...p} d="M10 9.5v5l4.5-2.5z" />
        </>
      );
    case 'other':
      return (
        <>
          <Circle cx={6.5} cy={12} r={1.6} fill={color} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
          <Circle cx={17.5} cy={12} r={1.6} fill={color} />
        </>
      );
  }
}

export const CATEGORY_ICON: Record<Category, IconName> = {
  dining: 'dining',
  groceries: 'groceries',
  fuel: 'fuel',
  travel: 'travel',
  online: 'online',
  utilities: 'utilities',
  entertainment: 'entertainment',
  other: 'other',
};

/** Deep tint + light foreground per category for the dark theme (foreground ≥ 4.5:1 on tint). */
export const CATEGORY_TINT: Record<Category, { bg: string; fg: string }> = {
  dining: { bg: '#3A2220', fg: '#FFB4A2' },
  groceries: { bg: '#17301F', fg: '#8FE0AE' },
  fuel: { bg: '#33270F', fg: '#F5C66B' },
  travel: { bg: '#172540', fg: '#9EC2FF' },
  online: { bg: '#2A1F45', fg: '#C7AEFF' },
  utilities: { bg: '#2F2A10', fg: '#F0D86A' },
  entertainment: { bg: '#3A1A2E', fg: '#FF9FD0' },
  other: { bg: '#232838', fg: '#C2C9D8' },
};
