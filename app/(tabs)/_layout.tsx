// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { TabBar } from '../../ui/components/TabBar';
import { colors } from '../../ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Status' }} />
      <Tabs.Screen name="contacts" options={{ title: 'Kontakte' }} />
      <Tabs.Screen name="callmoments" options={{ title: 'Moments' }} />
      <Tabs.Screen name="settings" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
