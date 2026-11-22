/**
 * Android release imzalama: Codemagic'in keystore ortam değişkenleri (CM_KEYSTORE_PATH,
 * CM_KEYSTORE_PASSWORD, CM_KEY_ALIAS, CM_KEY_PASSWORD) varsa release build onlarla imzalanır,
 * yoksa (yerel denemeler) debug anahtarı kullanılır. Gizli bilgi depoda tutulmaz.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            if (System.getenv("CM_KEYSTORE_PATH")) {
                storeFile file(System.getenv("CM_KEYSTORE_PATH"))
                storePassword System.getenv("CM_KEYSTORE_PASSWORD")
                keyAlias System.getenv("CM_KEY_ALIAS")
                keyPassword System.getenv("CM_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes('CM_KEYSTORE_PATH')) {
      src = src.replace(/signingConfigs \{\n(\s*debug \{[\s\S]*?\n\s*\})/, (m) => `${m}${RELEASE_CONFIG}`);
      src = src.replace(
        /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
        '$1signingConfig System.getenv("CM_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug',
      );
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
