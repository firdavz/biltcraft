import { useState } from 'react';
import type { TimePickerProps } from './TimePicker';
import { colors, headingFont } from '@/lib/habbit-theme';
export function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label="Daily alarm time"
      type="time"
      value={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
      onChange={(event) => {
        const [h, m] = event.target.value.split(':').map(Number);
        if (Number.isFinite(h) && Number.isFinite(m)) onChange(h, m);
      }}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        colorScheme: 'dark',
        background: colors.inputBackground,
        color: colors.foreground,
        border: `1px solid ${focused ? colors.accent : colors.border}`,
        borderRadius: 10,
        boxShadow: focused ? `0 1px 8px ${colors.buttonBorder}` : 'none',
        padding: '18px 20px',
        fontSize: 32,
        fontFamily: headingFont,
        outlineColor: colors.accent,
      }}
    />
  );
}
