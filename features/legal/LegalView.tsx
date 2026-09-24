import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LegalSection } from '../../content/legal';
import { AppText, colors, PageHeader, Screen, spacing } from '../../ui';

/** A legal text (privacy policy, imprint) as plain, readable sections. */
export function LegalView({ title, sections, onBack }: { title: string; sections: LegalSection[]; onBack?: () => void }) {
  return (
    <Screen scroll ambient={false}>
      {onBack ? (
        <PageHeader title={title} onBack={onBack} />
      ) : (
        <AppText variant="h1" style={styles.webTitle}>
          {title}
        </AppText>
      )}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <AppText variant="title">{section.title}</AppText>
          {section.paragraphs.map((paragraph, i) => (
            <AppText key={i} variant="body" color={colors.textSecondary} style={styles.paragraph}>
              {paragraph}
            </AppText>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  webTitle: { marginTop: spacing.xl, marginBottom: spacing.md },
  section: { marginTop: spacing.xl, gap: spacing.sm, maxWidth: 720 },
  paragraph: { lineHeight: 24 },
});
