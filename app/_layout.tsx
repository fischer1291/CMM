import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
    return (
        <Tabs
            screenOptions={({ route }) => {
                const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                    index: 'person-circle',
                    contacts: 'people',
                    settings: 'settings',
                };

                return {
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />
                    ),
                    tabBarActiveTintColor: '#007aff',
                    tabBarInactiveTintColor: 'gray',
                    headerTitle: 'Call Me Maybe',
                    headerShown: true,
                };
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Status' }} />
            <Tabs.Screen name="contacts" options={{ title: 'Kontakte' }} />
            <Tabs.Screen name="settings" options={{ title: 'Einstellungen' }} />
        </Tabs>
    );
}