import { Text, type TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from '@/components/ui/primitives/LinearGradient';
import { colors, headingFont } from '@/lib/habbit-theme';
export type GradientTitleProps = { children: string; size?: number; style?: TextStyle };
export function GradientTitle({ children, size = 38, style }: GradientTitleProps) {
  const text = {
    fontFamily: headingFont,
    fontSize: size,
    lineHeight: size * 1.25,
    letterSpacing: -size * 0.03,
    ...style,
  };
  return (
    <MaskedView maskElement={<Text style={text}>{children}</Text>}>
      <LinearGradient
        colors={[colors.foreground, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[text, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
