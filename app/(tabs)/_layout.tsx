// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const { colors, fonts } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      index: 'person-circle',
      contacts: 'people',
      callmoments: 'camera',
      settings: 'settings',
      videocall: 'videocam', // 🔧 neues Icon
    };

    return {
      tabBarIcon: ({ color, size }) => (
        <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />
      ),
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray,
      headerTitleAlign: 'center',
      headerTitleStyle: {
        fontFamily: fonts.semibold,
        fontSize: 20,
        color: colors.text,
      },
      headerStyle: {
        backgroundColor: colors.background,
      },
    };
  }}
    >
      <Tabs.Screen name="index" options={{ title: 'Status' }} />
      <Tabs.Screen name="contacts" options={{ title: 'Kontakte' }} />
      <Tabs.Screen name="callmoments" options={{ title: 'CallMoments' }} />
      <Tabs.Screen name="settings" options={{ title: 'Einstellungen' }} />
      <Tabs.Screen name="videocall" options={{ title: 'Video' }} />
    </Tabs>
  );
}
