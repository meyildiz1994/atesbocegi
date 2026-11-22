# Tasarım ve teknik kararlar

Belirsiz kalan konularda en basit makul seçenek uygulandı. Değiştirmek istediğin her madde için not düşmen yeterli.

## Faz 1

1. **Expo SDK 58 (RN 0.88, React 19.3), yeni mimari.** `create-expo-app` blank-typescript şablonundan başlandı. Expo Router kullanılmadı: oyun tek ekran, paneller modal/sheet olacak. Gerekirse ayarlar/mağaza için sonra eklenir.
2. **Expo Go yerine development build (`expo-dev-client`).** MMKV v4 (Nitro Modules) Expo Go'da çalışmıyor; ileride AdMob, RevenueCat ve Firebase de native modül istiyor. `npm run ios` / `npm run android` artık `expo run:*` ile yerel native build alır; alternatif `eas build --profile development`.
3. **Reklam, satın alma ve analitik paketleri henüz kurulmadı.** Config plugin'leri ve uygulama kimlikleri (AdMob app id, RevenueCat key, Firebase dosyaları) istiyorlar; boş değerle eklemek build'i bozar. Faz 8 ve 9'da kurulacak.
4. **Analitik için varsayılan seçim henüz yapılmadı** (Firebase vs PostHog), Faz 9'a kadar açık soru.
5. **Bundle id / package:** `com.atesbocegi.game` (yer tutucu). Mağazaya çıkmadan önce kesinleşmeli.
6. **Uygulama adı:** `Ateşböceği` (cihazda görünen). İngilizce ad için `Firefly Grove` yer tutucu olarak i18n'de.
7. **FPS sayacı** UI thread'de `useFrameCallback` ile kare sayar, React state'i 500 ms'de bir (`DEV.fpsOverlayUpdateMs`) günceller. Yalnızca `__DEV__` iken görünür.
8. **TypeScript:** `strict` + `noUncheckedIndexedAccess`.
9. **Sayı biçimlendirme (`numbers.ts`) Faz 1'de yazıldı** çünkü Jest kurulumunu doğrulamak için saf ve küçük bir modüldü. Biçim: aşağı yuvarlama, 1 ondalık (`999999 → 999.9K`), T'den sonra `aa, ab … az, ba …`.
10. **Görsel/ses/video üretimi:** Oyun içi grafikler kodla (Skia) çizilecek. İkon, splash ve mağaza görselleri için Asset GPT, tanıtım videosu için Gemini, sesler için ElevenLabs kullanılacak (Emre'nin tercihi).
11. **Test dağıtımı Codemagic + TestFlight** (Emre'de Xcode/Android Studio yok). `codemagic.yaml` her `main` push'unda typecheck/test/lint çalıştırır, `expo prebuild` ile iOS projesini üretir, IPA'yı imzalayıp TestFlight'a yükler. `ios/` ve `android/` klasörleri depoya girmez (CNG). Build numarası Codemagic'in `BUILD_NUMBER`'ı.
12. **FPS sayacı test build'lerinde de açık**: `EXPO_PUBLIC_SHOW_FPS=1` (Codemagic'te ayarlı). Mağaza sürümünde kapatılacak.
13. **Görsel stil: yumuşak ışık** (Emre seçti). Kodla çizilen gradyan ve additive glow; piksel-art yok. Referanslar (bataklık sahnesi, amber orman fotoğrafı) yalnızca atmosfer ve palet için.
