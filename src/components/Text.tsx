import { Children, createContext, useContext, type ReactNode } from 'react';
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

import { isFontRole, resolveFont, resolveRupeeFont } from '../theme';

type Inherited = { family: string; weight: TextStyle['fontWeight'] };

/** Lets nested <Text> inherit the parent's font role and weight, like native text does. */
const FontContext = createContext<Inherited>({ family: 'body', weight: '400' });

/**
 * Drop-in replacement for React Native's <Text> that applies the app fonts.
 * Styles keep using `fontWeight` and a role token in `fontFamily`
 * ('body' | 'display' | 'mono'); this maps them to the matching font file,
 * because custom fonts on iOS/Android need one family per weight.
 */
export function Text({ style, children, ...rest }: TextProps) {
  const parent = useContext(FontContext);
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;

  const family = flat.fontFamily ?? parent.family;
  const weight = flat.fontWeight ?? parent.weight;
  const fontFamily = isFontRole(family) ? resolveFont(family, weight) : family;
  // Satoshi and JetBrains Mono have no ₹ glyph; draw it in Inter at a matching weight.
  const needsRupeeFallback = isFontRole(family);

  return (
    <FontContext.Provider value={{ family, weight }}>
      <RNText {...rest} style={{ ...flat, fontFamily, fontWeight: 'normal' }}>
        {needsRupeeFallback ? withRupeeFallback(children, resolveRupeeFont(weight)) : children}
      </RNText>
    </FontContext.Provider>
  );
}

const RUPEE = '₹';

function withRupeeFallback(children: ReactNode, rupeeFont: string): ReactNode {
  const parts = Children.toArray(children);
  if (!parts.some((c) => typeof c === 'string' && c.includes(RUPEE))) return children;
  return parts.flatMap((c, i) => {
    if (typeof c !== 'string' || !c.includes(RUPEE)) return [c];
    return c.split(RUPEE).flatMap((seg, j) =>
      j === 0
        ? [seg]
        : [
            <RNText key={`r${i}-${j}`} style={{ fontFamily: rupeeFont, fontWeight: 'normal' }}>
              {RUPEE}
            </RNText>,
            seg,
          ],
    );
  });
}
