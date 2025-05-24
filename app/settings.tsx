import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export default function SettingsScreen() {
  const { colors, fonts } = useTheme();

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text, fontFamily: fonts.regular }]}>
          ⚙️ Einstellungen (bald verfügbar)
        </Text>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});