import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener('change', () => setNow(Date.now()));
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return now;
}
export function countdown(deadline: number, now: number) {
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((n) =>
    String(n).padStart(2, '0'),
  );
}
