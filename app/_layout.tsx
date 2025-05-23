import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName = 'ellipse';
        if (route.name === 'index') iconName = 'person-circle';
        if (route.name === 'contacts') iconName = 'people';
        if (route.name === 'settings') iconName = 'settings';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007aff',
      tabBarInactiveTintColor: 'gray',
      headerTitle: 'Call Me Maybe',
      headerShown: true
    })}>
      <Tabs.Screen name="index" options={{ title: 'Status' }} />
      <Tabs.Screen name="contacts" options={{ title: 'Kontakte' }} />
      <Tabs.Screen name="settings" options={{ title: 'Einstellungen' }} />
    </Tabs>
  );
}