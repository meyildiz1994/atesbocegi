import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../config/balance';
import { t } from '../i18n';
import { Sheet } from './Sheet';

/** Mağaza: Faz 8'e kadar yer tutucu. */
export function StorePanel({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={t('ui.store')} onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.text}>{t('ui.comingSoon')}</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { padding: 32, alignItems: 'center' },
  text: { color: COLORS.hudSubText, fontSize: 16 },
});
