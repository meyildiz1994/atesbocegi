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

## Faz 2

14. **Simülasyon tek bir `SharedValue<SimState>` içinde, düz sayı dizileriyle** tutulur ve UI thread'de `useFrameCallback` içinde `modify(..., true)` ile yerinde güncellenir. React state her karede değişmez; HUD'a saniyede 10 kez veri gider (`UI.hudUpdatesPerSecond`).
15. **Böcekler tek `Atlas` ile çizilir** (tek draw call). Doku: kodla çizilen radyal glow (parlak çekirdek + soluk hale tek dokuda). Renk ve yanıp sönme `colors` buffer'ı ve `modulate` ile, sahneye `plus` (additive) blend ile basılır. Ayrı iki katmanlı glow Faz 5'te değerlendirilecek.
16. **Buffer kapasitesi 1.600** (`SIM.capacity`). Ölü böcekler ekran dışına, sıfır ölçekle yazılır.
17. **Rastgelelik deterministik LCG** (state içinde tohum). Testlerde tekrarlanabilir; oyunda tohum açılış zamanından gelir.
18. **Uçuştaki böcekler kavanozda yer ayırır**, böylece kavanoz taşmaz. Kavanoz doluyken halka böcek yakalamaz.
19. **Toplama alanı ekranın üst %78'i** (`SIM.playAreaBottom`), kavanozun üstü. Böcekler kenara yaklaşınca merkeze döner.
20. **Ağaç siluetleri prosedürel** (sabit tohumlu çam sıraları, 3 katman + çimen). Aydınlık arttıkça gradyan açılır ve siluetin bir kopyası 1.5 px yukarıda, arkada çizilerek üst kenarlar ışık alır.
21. **Web önizlemesi** (`index.web.ts`, CanvasKit) yalnızca geliştirme ve otomatik ekran görüntüsü testi içindir; mağaza hedefi değil. `package.json` `main` alanı platform uzantısı çözülebilsin diye `index` yapıldı.
22. **i18n** için küçük bir `t()` fonksiyonu yazıldı (bağımlılık yok). Varsayılan dil İngilizce; cihaz dili ve ayar Faz 11'de.

## Faz 3

23. **Prestij bonusu kazanılmış toplam Yıldız Tozu'na göre** (`stardustEarned`) hesaplanır, harcanana göre değil. Yetenek almak bonusu düşürmez; oyuncu "harcarsam zayıflarım" ikilemine girmez.
24. **Bölge değişince kavanoz boşaltılır (içindekiler kaybolur).** Aksi halde ucuz bölgede doldurup pahalı bölgede boşaltma açığı olurdu. Kavanoz küçük olduğu için kayıp önemsiz.
25. **Bölgeler bu koşudaki Işık'la açılır** (`runLight`), Şafak'ta tekrar kilitlenir. Sonraki koşular çarpan sayesinde hızlı geçer.
26. **Offline kazanç kavanozu hesaba katmaz**: (Işık Ruhu kazancı + otomatik boşaltma varsa pasif toplama tahmini) × %50 (Dreamers yeteneğiyle %100), üst sınır 2 saat (Long Night ile 8 saat). 60 saniyeden kısa yokluklarda panel çıkmaz. Cihaz saati geri alınırsa kazanç 0.
27. **Işık Ruhları basitleştirilmiş hedefleme** yapar: rastgele 6 böcekten en yakınına yönelir, yarıçap içine girince yakalar. Ekranda en fazla 40 ruh çizilir; fazlası yakalama yarıçapını büyütür.
28. **Kayıt sistemi Faz 3'te kuruldu** (Faz 7'den öne alındı), çünkü ekonomi test edilirken ilerlemenin kaybolmaması gerekiyordu. MMKV'ye 10 saniyede bir ve arka plana geçerken yazılır; sürüm alanı ve migrasyon zinciri var. Ayarlardan sıfırlama Faz 7/11'de.
29. **Mağaza butonu şimdilik "Yakında" paneli açar** (Faz 8). Şafak butonu eşik (1M Işık) geçildiğinde ya da ilk Şafak'tan sonra görünür.
30. **"×2 reklam izle" butonu** reklam servisi hazır değilken gizlidir (Faz 8).
