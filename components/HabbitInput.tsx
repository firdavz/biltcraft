import { useState, type ComponentProps } from 'react';
import { Input } from 'heroui-native';
import { colors } from '@/lib/habbit-theme';

export function HabbitInput({ style, onFocus, onBlur, ...props }: ComponentProps<typeof Input>) {
  const [focused, setFocused] = useState(false);
  return (
    <Input
      {...props}
      background={null}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        style,
        {
          borderRadius: 10,
          borderWidth: 1,
          borderColor: focused ? colors.accent : colors.border,
          backgroundColor: colors.inputBackground,
          color: colors.foreground,
          shadowColor: colors.accent,
          shadowOpacity: focused ? 0.35 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 1 },
          elevation: 0,
        },
      ]}
    />
  );
}
