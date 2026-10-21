import { HabbitButton } from '@/components/HabbitButton';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useThemeColor } from 'heroui-native';
import * as Haptics from 'expo-haptics';
import { useHabbit } from '@/lib/habbit-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const started = useHabbit((s) => s.started);
  const insets = useSafeAreaInsets();
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
            height: 64 + insets.bottom,
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
            tabBarShowLabel: false,
            title: 'TODAY',
            tabBarButton: ({ children: _children, ...props }) => (
              <HabbitButton {...props} variant="tab">
                Today
              </HabbitButton>
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            tabBarShowLabel: false,
            title: 'PROGRESS',
            tabBarItemStyle: started ? undefined : { display: 'none' },
            tabBarButton: ({ children: _children, ...props }) =>
              started ? (
                <HabbitButton {...props} variant="tab">
                  Progress
                </HabbitButton>
              ) : null,
          }}
        />
      </Tabs>
    </>
  );
}
