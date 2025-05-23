import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme'; // falls du "export const theme" verwendest

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
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: theme.colors.muted,
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTitleStyle: {
                        fontFamily: theme.fonts.semibold,
                        fontSize: 20,
                        color: theme.colors.text,
                    },
                    headerTitleAlign: 'center',
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