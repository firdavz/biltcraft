import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, View } from 'react-native';
import { useState } from 'react';
import { HabbitButton as Button } from './HabbitButton';
import { colors } from '@/lib/habbit-theme';
export type TimePickerProps = {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
};
export function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return (
    <View>
      {Platform.OS === 'android' && (
        <Button variant="primary" onPress={() => setOpen(true)}>
          <Button.Label>
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Button.Label>
        </Button>
      )}
      {(Platform.OS === 'ios' || open) && (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          textColor={colors.foreground}
          onChange={(_, value) => {
            setOpen(false);
            if (value) onChange(value.getHours(), value.getMinutes());
          }}
        />
      )}
    </View>
  );
}
