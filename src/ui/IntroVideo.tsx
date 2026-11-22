import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../config/balance';
import { useGame } from '../game/state';
import { t } from '../i18n';

const INTRO = require('../../assets/video/intro.mp4');
const LOGO = require('../../assets/ui/logo.png');
/** Video takılırsa (yüklenemezse) en geç bu sürede oyuna geçilir. */
const FAILSAFE_MS = 14_000;
/** Logonun belirdiği an (sn). */
const LOGO_AT = 5.5;

/** Açılış videosu (Gemini ile üretildi): her açılışta oynar, dokununca geçilir. */
export function IntroVideo({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const sound = useGame((s) => s.settings.sound);
  const [logo, setLogo] = useState(false);
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  const player = useVideoPlayer(INTRO, (p) => {
    p.loop = false;
    p.muted = !sound;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });

  useEventListener(player, 'playToEnd', finish);
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (currentTime >= LOGO_AT) setLogo(true);
  });
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error') finish();
  });

  useEffect(() => {
    const id = setTimeout(finish, FAILSAFE_MS);
    // Video olayları gecikse de logo zamanında gelsin.
    const logoId = setTimeout(() => setLogo(true), LOGO_AT * 1000 + 400);
    return () => {
      clearTimeout(id);
      clearTimeout(logoId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View exiting={FadeOut.duration(600)} style={[StyleSheet.absoluteFill, styles.root]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {logo ? (
        <Animated.View entering={FadeIn.duration(900)} pointerEvents="none" style={[styles.logoWrap, { top: insets.top + 40 }]}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </Animated.View>
      ) : null}
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel={t('intro.skip')}>
        <Text style={[styles.skip, { bottom: insets.bottom + 24 }]}>{t('intro.skip')}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#000' },
  logoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  logo: { width: '86%', aspectRatio: 900 / 478 },
  skip: {
    position: 'absolute',
    alignSelf: 'center',
    color: COLORS.hudSubText,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
