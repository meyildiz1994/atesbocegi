/** ChatGPT ile üretilmiş arayüz görselleri (assets/ui). */
import type { ContainerId, UpgradeId } from '../config/balance';

export const UPGRADE_ICONS: Record<UpgradeId, number> = {
  ring: require('../../assets/ui/icon_ring.png'),
  jar: require('../../assets/ui/icon_jar.png'),
  bright: require('../../assets/ui/icon_bright.png'),
  crowd: require('../../assets/ui/icon_crowd.png'),
  spirit: require('../../assets/ui/icon_spirit.png'),
  autoEmpty: require('../../assets/ui/icon_autoEmpty.png'),
  magnet: require('../../assets/ui/icon_magnet.png'),
};

export const GARDEN_ICONS = {
  lantern: require('../../assets/ui/garden_lantern.png') as number,
  mushroomHouse: require('../../assets/ui/garden_mushroomHouse.png') as number,
  bridge: require('../../assets/ui/garden_bridge.png') as number,
  well: require('../../assets/ui/garden_well.png') as number,
  tree: require('../../assets/ui/garden_tree.png') as number,
};

export const UI_ICONS = {
  garden: require('../../assets/ui/icon_garden.png') as number,
  quests: require('../../assets/ui/icon_quests.png') as number,
  collection: require('../../assets/ui/icon_collection.png') as number,
  chest: require('../../assets/ui/icon_chest.png') as number,
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

/** Kapların görselleri (şişe ve fener için Gemini görselleri gelene kadar kavanoz). */
export const CONTAINER_ART: Record<ContainerId, number> = {
  jar: require('../../assets/ui/jar.png') as number,
  bottle: require('../../assets/ui/jar.png') as number,
  lantern: require('../../assets/ui/jar.png') as number,
};
