/** ChatGPT ile üretilmiş arayüz görselleri (assets/ui). */
import type { UpgradeId } from '../config/balance';

export const UPGRADE_ICONS: Record<UpgradeId, number> = {
  ring: require('../../assets/ui/icon_ring.png'),
  jar: require('../../assets/ui/icon_jar.png'),
  bright: require('../../assets/ui/icon_bright.png'),
  crowd: require('../../assets/ui/icon_crowd.png'),
  spirit: require('../../assets/ui/icon_spirit.png'),
  autoEmpty: require('../../assets/ui/icon_autoEmpty.png'),
  magnet: require('../../assets/ui/icon_magnet.png'),
};

export const UI_ICONS = {
  dawn: require('../../assets/ui/icon_dawn.png') as number,
  store: require('../../assets/ui/icon_store.png') as number,
  upgrades: require('../../assets/ui/icon_jar.png') as number,
  finger: require('../../assets/ui/finger.png') as number,
};
