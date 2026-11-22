import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { APP_CONFIG } from '../config/app';

import { COLORS, UI } from '../config/balance';
import { resetAll } from '../game/persistence';
import type { Settings } from '../game/save';
import { useGame } from '../game/state';
import { t, type I18nKey } from '../i18n';
import { privacyOptionsRequired, showPrivacyOptions } from '../services/ads';
import { hapticSuccess } from '../services/haptics';
import { iapAvailable, restore } from '../services/iap';
import { UI_ICONS } from './icons';
import { Sheet } from './Sheet';

type Toggle = Exclude<keyof Settings, 'language'>;
const TOGGLES: Toggle[] = ['sound', 'music', 'haptics'];
const LANGS: Settings['language'][] = ['system', 'en', 'tr'];

/** Ayarlar: sesler, titreşim, dil, satın alımlar, gizlilik, sıfırlama. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const [confirming, setConfirming] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);

  const onRestore = async () => {
    setRestoreNote(null);
    const ok = await restore();
    setRestoreNote(ok ? t('store.restored') : t('store.nothingToRestore'));
  };

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

        <View style={styles.langBlock}>
          <Text style={styles.label}>{t('settings.language')}</Text>
          <View style={styles.segments}>
            {LANGS.map((l) => (
              <Pressable
                key={l}
                onPress={() => setSettings({ language: l })}
                style={[styles.segment, settings.language === l && styles.segmentActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: settings.language === l }}
              >
                <Text style={[styles.segmentText, settings.language === l && styles.segmentTextActive]}>
                  {t(`settings.lang.${l}` as I18nKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {iapAvailable() ? (
          <LinkRow label={t('store.restore')} onPress={onRestore} note={restoreNote} icon={UI_ICONS.restore} />
        ) : null}
        {privacyOptionsRequired() ? <LinkRow label={t('settings.adPrivacy')} onPress={showPrivacyOptions} /> : null}
        {APP_CONFIG.privacyPolicyUrl ? (
          <LinkRow label={t('settings.privacyPolicy')} onPress={() => Linking.openURL(APP_CONFIG.privacyPolicyUrl)} />
        ) : null}

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

function LinkRow({
  label,
  onPress,
  note,
  icon,
}: {
  label: string;
  onPress: () => void;
  note?: string | null;
  icon?: number;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <View style={styles.labelRow}>
        {icon ? <Image source={icon} style={styles.rowIcon} /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.chevron}>{note ?? '›'}</Text>
    </Pressable>
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowIcon: { width: 24, height: 24 },
  chevron: { color: COLORS.hudSubText, fontSize: 14, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  danger: { marginTop: 18, gap: 10 },
  langBlock: {
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.panelBorder,
  },
  segments: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    minHeight: UI.minTouch,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  segmentText: { color: COLORS.hudSubText, fontWeight: '700', fontSize: 14 },
  segmentTextActive: { color: COLORS.accentText },
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
