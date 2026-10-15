import { Text, type TextStyle } from 'react-native';
import type { GradientTitleProps } from './GradientTitle';
import { colors, headingFont } from '@/lib/habbit-theme';
export function GradientTitle({ children, size = 38, style }: GradientTitleProps) {
  const gradient: TextStyle & {
    backgroundImage: string;
    backgroundClip: string;
    WebkitTextFillColor: string;
  } = {
    fontFamily: headingFont,
    fontSize: size,
    lineHeight: size * 1.25,
    letterSpacing: -size * 0.03,
    color: colors.foreground,
    backgroundImage: `linear-gradient(120deg, ${colors.foreground}, ${colors.accent})`,
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    ...style,
  };
  return <Text style={gradient}>{children}</Text>;
}
