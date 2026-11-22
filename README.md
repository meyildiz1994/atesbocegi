# Ateşböceği

2D idle/incremental ateşböceği toplama oyunu. Expo + React Native + Skia.

## Kurulum

```bash
npm install
npm run ios       # iOS simülatör (macOS + Xcode gerekir), native development build alır
npm run android   # Android emülatör (Android Studio gerekir)
npm start         # yalnızca Metro; önceden kurulmuş dev build ile bağlanır
```

Expo Go **desteklenmez** (MMKV ve ileride reklam/satın alma native modülleri yüzünden). Mac yoksa: `npx eas build --profile development --platform ios` (simülatör build'i) ya da `--platform android`.

## TestFlight (Codemagic)

`main` dalına her push'ta `codemagic.yaml` içindeki `ios-testflight` iş akışı çalışır ve build'i TestFlight'a yükler. İlk kurulum adımları dosyanın başında.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run typecheck` | TypeScript kontrolü (strict) |
| `npm test` | Jest birim testleri |
| `npm run lint` | ESLint |

## Yapı

- `src/config/balance.ts`: tüm denge sayıları
- `src/game/`: saf oyun mantığı (ekonomi, simülasyon, kayıt, sayılar)
- `src/render/`: Skia sahnesi
- `src/ui/`: HUD ve paneller
- `src/services/`: reklam, satın alma, analitik, haptic, ses
- `scripts/simulate-economy.ts`: başsız denge simülasyonu
- `DECISIONS.md`: alınan tasarım kararları
