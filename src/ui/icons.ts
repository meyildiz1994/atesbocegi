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
  gear: require('../../assets/ui/icon_gear.png') as number,
  ad: require('../../assets/ui/icon_ad.png') as number,
  golden: require('../../assets/ui/icon_golden.png') as number,
  lock: require('../../assets/ui/icon_lock.png') as number,
  left: require('../../assets/ui/icon_left.png') as number,
  right: require('../../assets/ui/icon_right.png') as number,
  close: require('../../assets/ui/icon_close.png') as number,
  boost: require('../../assets/ui/icon_boost.png') as number,
  restore: require('../../assets/ui/icon_restore.png') as number,
};
