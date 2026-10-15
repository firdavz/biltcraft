import { CircleDot, LayoutGrid } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useThemeColor } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { useHabbit } from '@/lib/habbit-store';

export default function TabLayout() {
  const started = useHabbit((s) => s.started);
  const [background, border, accent, muted] = useThemeColor([
    'background',
    'border',
    'accent',
    'muted',
  ]);
  return (
    <>
      {/* eslint-disable-next-line react/style-prop-object -- Expo StatusBar uses a string style enum, not a React Native style object. */}
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: background },
          tabBarStyle: {
            display: started ? 'flex' : 'none',
            backgroundColor: background,
            borderTopColor: border,
            shadowColor: background,
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          },
          tabBarActiveTintColor: accent,
          tabBarInactiveTintColor: muted,
          tabBarLabelStyle: {
            fontFamily: 'Inter_700Bold',
            fontSize: 11,
            letterSpacing: 1.1,
            marginTop: 4,
          },
        }}
        screenListeners={({ navigation, route }) => ({
          tabPress: () => {
            if (navigation.getState().routes[navigation.getState().index]?.key !== route.key)
              void Haptics.selectionAsync();
          },
        })}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'TODAY',
            tabBarIcon: ({ color }) => <CircleDot size={21} strokeWidth={1.8} color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'PROGRESS',
            href: started ? '/progress' : null,
            tabBarIcon: ({ color }) => <LayoutGrid size={21} strokeWidth={1.8} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
