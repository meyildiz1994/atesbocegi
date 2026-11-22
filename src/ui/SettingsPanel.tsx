import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { COLORS, UI } from '../config/balance';
import { resetAll } from '../game/persistence';
import type { Settings } from '../game/save';
import { useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';
import { hapticSuccess } from '../services/haptics';
import { Sheet } from './Sheet';

type Toggle = Exclude<keyof Settings, 'language'>;
const TOGGLES: Toggle[] = ['sound', 'music', 'haptics'];

/** Ayarlar. Dil, satın alımları geri yükle ve gizlilik Faz 8 ve 11'de eklenecek. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const [confirming, setConfirming] = useState(false);

  const onReset = () => {
    resetAll();
    hapticSuccess();
    onClose();
  };

  return (
    <Sheet title={t('ui.settings')} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.body}>
        {TOGGLES.map((key) => (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{t(`settings.${key}` as I18nKey)}</Text>
            <Switch
              value={settings[key]}
              onValueChange={(v) => setSettings({ [key]: v })}
              trackColor={{ true: COLORS.accent, false: COLORS.panelBorder }}
              thumbColor={COLORS.hudText}
              accessibilityLabel={t(`settings.${key}` as I18nKey)}
            />
          </View>
        ))}

        <View style={styles.danger}>
          {confirming ? (
            <>
              <Text style={styles.confirmText}>{t('settings.resetConfirm')}</Text>
              <View style={styles.confirmButtons}>
                <Pressable
                  onPress={() => setConfirming(false)}
                  style={[styles.button, styles.cancel]}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>{t('ui.cancel')}</Text>
                </Pressable>
                <Pressable onPress={onReset} style={[styles.button, styles.resetYes]} accessibilityRole="button">
                  <Text style={styles.resetYesText}>{t('settings.resetYes')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable
              onPress={() => setConfirming(true)}
              style={[styles.button, styles.reset]}
              accessibilityRole="button"
            >
              <Text style={styles.resetText}>{t('settings.reset')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingBottom: 8, gap: 6 },
  row: {
    minHeight: UI.minTouch + 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.panelBorder,
  },
  label: { color: COLORS.hudText, fontSize: 16 },
  danger: { marginTop: 18, gap: 10 },
  button: {
    minHeight: UI.minTouch,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  reset: { borderWidth: 1, borderColor: COLORS.danger },
  resetText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  confirmText: { color: COLORS.hudText, fontSize: 15, textAlign: 'center' },
  confirmButtons: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1, backgroundColor: COLORS.cardBg },
  cancelText: { color: COLORS.hudText, fontWeight: '700', fontSize: 15 },
  resetYes: { flex: 1, backgroundColor: COLORS.danger },
  resetYesText: { color: '#1a0505', fontWeight: '800', fontSize: 15 },
});
