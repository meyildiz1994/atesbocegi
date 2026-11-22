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

## Faz 4

31. **Onboarding 5 adım** (`src/game/tutorial.ts`, saf ve test edilmiş): tek böcek + "Sürükle ve topla" → ilk toplamada 6 böceğe çıkar → kavanoz dolunca "Kavanoza dokun" → ilk Işık'ta alt çubuk belirir → ilk yükseltme alınabilir olunca "Güçlen" ipucu → ilk satın almada biter. Bölge okları ve Işık/sn göstergesi onboarding bitince görünür. Daha önce yükseltme almış ya da Şafak yapmış kayıtlar onboarding görmez.
32. **İpucu parmağı şimdilik emoji (👆).** Faz 5'te ChatGPT ile üretilen görselle değişecek.
33. **`START.spawnRate` 1.5 → 2.5.** Erken oyun doğma hızıyla sınırlı; 1.5 ile Bölge 2 ~10. dakikada açılıyordu. 2.5 ile simülasyonda: ilk yükseltme 0:07, Bölge 2 6:15, ilk Işık Ruhu 6:34, Otomatik Boşaltma 7:02.
34. **Denge simülasyonu (`npm run simulate`) Faz 4'te yazıldı**, çünkü onboarding zaman çizelgesi onunla doğrulanıyor. Gerçek simülasyon kodunu çizimsiz çalıştırır; sanal oyuncu en yakın böceğe sürükler, 0.8 sn gecikmeyle kavanozu boşaltır, Işık/sn artışı / maliyet oranı en iyi yükseltmeyi alır.
35. **Bilinen denge sorunu (Faz 10'da çözülecek):** Bölge 2'den sonra ekonomi çok hızlanıyor; simülasyonda Bölge 3 ~9. dk, Şafak ~10. dk, Bölge 5 ~14. dk (hedef: Bölge 3 25–35 dk, ilk Şafak 3–5 saat). Ana sebep Kalabalık Orman'ın doğma hızını katlaması ile bölge çarpanlarının birleşmesi.

## Faz 5

36. **Görseller ChatGPT ile üretildi** (Emre'nin isteği): app ikonu (cam kavanoz + ateşböcekleri), 9 arayüz ikonu (7 yükseltme, Şafak, Mağaza) ve onboarding eli. `assets/ui/` altında; ikon `assets/icon.png`, Android adaptif ikon ve favicon ondan türetildi. Ateşböcekleri, hale, iz ve sahne performans için kodla çizilmeye devam ediyor.
37. **Splash:** siyah zemin + tek parlayan ateşböceği (kodla üretilmiş PNG, `expo-splash-screen`).
38. **Sesler ElevenLabs ile üretildi** (toplama çanı, gece ambiyansı); `scripts/import-audio.sh` ile normalize edilip 6 perdeye (pentatonik) bölündü, ambiyans çapraz geçişle döngüye çevrildi. Kavanoz "vuuş" sesi şimdilik kodla üretildi (`scripts/synth-sfx.py`); ElevenLabs sürümü sonra eklenecek. Müzik yok: bağlı ElevenLabs bağlantısı müzik üretemiyor. Tüm bölgeler aynı ambiyansı kullanıyor.
39. **Combo yalnızca his içindir**, kazancı artırmaz: 0.7 sn içinde art arda toplamalar sayılır, 3'ten itibaren "×N" görünür, toplama sesi her adımda yarım ton yükselir (en fazla 12).
40. **Böcek iki katman:** çekirdek + 2.6 kat büyük, %20 saydam hale (ikinci Atlas). Uçuş izi en fazla 96 böcek × 4 nokta (üçüncü Atlas).
41. **Bölge açılınca** başarı titreşimi ve "Yeni bölge açıldı" bildirimi çıkar; dokununca o bölgeye geçilir ve orman bir anda böcekle dolar.
42. **Ambiyans ayarlardaki "müzik" anahtarına bağlı**, efektler "ses" anahtarına. iOS sessiz modda ses çalmaz.

## Faz 6

43. **Uzaysal ızgara** (`SIM.gridCell` 48 px): parmak yakalama/mıknatıs ve Işık Ruhu hedef arama her adımda yeniden kurulan ızgara üzerinden yapılır. 1.500 böcekte simülasyon adımı ~0.22 ms (`npm run bench`).
44. **Işık Ruhu her yakalamadan sonra 1.2 sn bekler** (`SPIRIT.catchCooldown`). Izgarayla en yakın böceği anında bulmak ruhu saniyede ~2.6 yakalamaya çıkarıyordu; bekleme ile ~0.6–0.75'e, yani ekonomi hesabındaki 0.6'ya döndü.
45. **400 böceğin üstünde hale katmanı kapanır** (`FX.haloMaxFireflies`); çizim yükü yarıya iner, kalabalıkta fark edilmiyor.
46. **Atlas boyutu kademeli** (128 / 512 / 1.600): yalnızca gereken kadar sprite çizilir.
47. **Stres testi:** FPS göstergesine (test build'lerinde) dokunmak ekrandaki böcek sayısını 500 → 1.000 → 1.500 → normal arasında değiştirir. Kayda ve ekonomiye etkisi yoktur.
48. **Gerçek FPS ölçümü cihazda yapılmalı.** Web önizlemesinde (yazılımsal WebGL) 1.500 böcekte 29 FPS görüldü; bu telefonu temsil etmez. Android cihaz testi henüz yok.

## Faz 7

49. **Kayıt zamanları:** her 10 sn, uygulama arka plana geçerken ve geri dönünce, ayrıca Şafak, yetenek alımı ve offline kazancı alma anında hemen.
50. **Yedek kayıt:** her yazmada bir önceki okunabilir kayıt `atesbocegi.save.bak` anahtarına taşınır. Ana kayıt bozulursa yedekten yüklenir (en fazla ~10 sn kayıp).
51. **Kayıt sürümü 2:** alınmamış offline kazanç artık kayda giriyor. Panel açıkken uygulama kapanırsa kazanç kaybolmaz; sonraki açılışta yeni yokluk süresi üstüne eklenir. Sürüm 1 kayıtlar migrasyonla yükselir.
52. **Saat oynatma:** geri alınırsa offline süre 0 sayılır ve `lastSeen` şimdiye çekilir; ileri alınırsa normal üst sınır (2 saat, Uzun Gece ile 8 saat) uygulanır. Saati tekrar tekrar ileri alarak üst sınır kadar kazanç toplanabilir; tek oyunculu oyunda bunu kabul ettim (sunucu saati gerekmez).
53. **"İlerlemeyi sıfırla" iki adımlı onay** ile ayarlar panelinde (oyun içi onay, sistem uyarısı değil). Ayarlar (ses, ortam sesi, titreşim) korunur; kayıt ve yedek silinir.
54. **Ayarlar paneli şimdilik:** ses efektleri, ortam sesi (müzik henüz yok), titreşim, sıfırlama. Dil (Faz 11), satın alımları geri yükle ve gizlilik (Faz 8) sonra eklenecek. Dişli simgesi şimdilik yazı karakteri; Faz 11'de ChatGPT ile üretilen arayüz görselleriyle değişecek.

## Faz 8

55. **Reklam akışı:** onboarding bitince Google UMP rıza formu (yalnızca gereken bölgelerde, ör. AB) → iOS ATT istemi → AdMob başlar. Hiçbir reklam teklifi ilk 10 dakikada (oyun süresi) görünmez.
56. **Ödüllü yerleşimler:** sağ üstte "▶ ×2 Işık" (2 dakika, üst üste eklenir, kayıtta kalır), "Sen yokken" panelinde ×2, ve Altın Ateşböceği.
57. **Altın Ateşböceği** simülasyonun değil arayüzün parçası: 2,5–5 dakikada bir ekranı 9 saniyede dalgalanarak geçer, dokununca kart açılır. Ödül = son Işık/sn × 180 sn (en az 10 dolu kavanoz). Reklamsız da alınabilir (%20), reklamla tamamı. Fırsat kaçırılsa da ceza yok.
58. **Geçiş reklamı** yalnızca oyuncu bölge değiştirdiğinde, 15. dakikadan sonra ve en fazla 5 dakikada bir. Şafak sırasındaki bölge sıfırlaması sayılmaz.
59. **"Reklamları Kaldır" sahipleri** geçiş reklamı görmez; ödüllü teklifleri (×2 Işık, offline ×2, Altın Ateşböceği tam ödülü) reklam izlemeden alır. Bu, satın almayı daha değerli kılıyor; ×2 Işık sonsuza dek elle yenilenebilir hale geliyor, bunu kabul ettim.
60. **Başlangıç Paketi:** kalıcı ×2 Işık (böcek değerine çarpan). İlk 48 saatte ayrı, indirimli bir ürün (`starter_pack_launch`) gösterilir; ikisi de aynı `starter` yetkisini açar. **Kozmetik kavanoz** ve diğer kozmetikler görseller ChatGPT ile üretildikten sonra (Faz 11) eklenecek.
61. **Satın alımlar kayda yazılır** ve RevenueCat'ten her açılışta tazelenir; çevrimdışıyken son bilinen durum geçerli. "İlerlemeyi sıfırla" ve Şafak satın alımları silmez.
62. **Kimlikler build ortamından gelir** (`src/config/app.ts`, `EXPO_PUBLIC_*`). AdMob kimliği yoksa Google'ın resmi test reklamları gösterilir; RevenueCat anahtarı yoksa mağaza "şu an kullanılamıyor" der. `app.json`'daki AdMob uygulama kimlikleri şimdilik Google'ın test kimlikleri; gerçekleri gelince değiştirilecek.
63. **Web ve testlerde** reklam ve satın alma modülleri yüklenmez (`ads.ts`/`iap.ts` boş sürümler, gerçekleri `*.native.ts`).
64. **Gizlilik politikası** bağlantısı `EXPO_PUBLIC_PRIVACY_URL` ile gelir; sayfa Faz 12'de Hostinger sunucusunda yayınlanacak. Ayarlarda boşsa satır gizli.

## Faz 9

65. **Sağlayıcı PostHog** (Firebase yerine): yerel yapılandırma dosyası (GoogleService-Info.plist) ve ek yerel modül gerektirmiyor; elde retention (D1/D7/D30), huni ve oturum süresi raporları hazır. SDK yerine PostHog'un `/batch/` HTTP uç noktasına doğrudan `fetch` ile gönderiyoruz, böylece yeni yerel bağımlılık yok.
66. **Olaylar cihazda kuyruğa alınır** (MMKV), 20 olayda, 30 saniyede bir ya da arka plana geçerken gönderilir. Çevrimdışıyken en fazla 500 olay bekler. Anahtar yoksa gönderim yapılmaz, kuyruk birikir.
67. **Kimlik:** rastgele cihaz kimliği (UUID); kişisel bilgi, reklam kimliği ya da konum gönderilmez. Her olaya platform ve uygulama sürümü eklenir.
68. **Olay listesi:** `tutorial_step`, `tutorial_complete`, `upgrade_purchased` (id, seviye, oyun süresi), `skill_purchased`, `zone_unlocked`, `prestige` (kaçıncı, Yıldız Tozu, oyun süresi), `ad_offer_shown` / `ad_watched` (yer), `golden_caught`, `iap_view` / `iap_purchase`, `session_start` / `session_end` (süre).
69. **Debug görünümü:** test build'lerinde FPS yazısına basılı tutunca son 60 olay ve gönderim durumu listelenir.

## Faz 10

70. **Sonuç (`npm run simulate`, aktif oynayan sanal oyuncu):** Bölge 2 7:39, Bölge 3 24:46, Bölge 4 2s 01dk, ilk Şafak 3s 50dk. Dördü de ±%20 içinde, üçü tam hedefte. #35'teki kaçak ekonomi çözüldü.
71. **Bölge çarpanları ×4 / ×15 / ×60 / ×250 → ×3 / ×8 / ×20 / ×50.** Spec'teki eşiklerle (5K, 150K, 5M, 200M) spec çarpanları birlikte hedeflere matematiksel olarak ulaşamıyordu: Bölge 2'yi 23 dakikada geçecek gelir ×15'le çarpılınca 5M'e yükseltme almadan bile ~3 saatten kısa sürede varılıyor. Eşikleri oyuncu ekranda gördüğü için onları korudum, çarpanları düşürdüm.
72. **Kalabalık Orman'ın doğma hızı artık katlanmıyor**, toplanıyor (seviye başına tabanın +%10'u). ×1.1^seviye, 80 seviyede doğma hızını 2.000 katına çıkarıp ekonomiyi kaçırıyordu.
73. **Maliyet büyümeleri:** Parlak Böcekler 1.35 → 2.1, Kalabalık Orman 1.25 → 1.8, Işık Ruhu 1.5 → 2.4 (taban 500 → 300, ilk ruh ~5. dk). Başlangıç doğma hızı 2.5 → 3. Halka, Kavanoz ve Mıknatıs aynı.
74. **"İlk Şafak" tanımı:** Şafak 1M'de açılır (spec), ama sanal oyuncu 5 Yıldız Tozu kazanacakken (koşuda 25M Işık) yapar. 1M'de yapmak yalnızca 1 Toz verdiği için gerçek oyuncu için de mantıklı an budur. Şafak düğmesi 47. dakikada belirir.
75. **Sınırlar:** sanal oyuncu hiç durmadan, kusursuz oynuyor. Gerçek oyuncu daha yavaş ilerler ama offline kazanç, ×2 Işık ve Altın Ateşböceği bunu kısmen dengeler. Soft launch'ta gerçek verilerle (analitik) yeniden ayarlanmalı. Bot Mıknatıs'ı hiç almıyor (tahmin fonksiyonu değerini düşük görüyor); oyuncular için faydalı, değiştirmedim.
76. **Ayar denemesi:** `BALANCE_OVERRIDES='{"UPGRADES":{"bright":{"growth":2}}}' SIM_QUIET=1 npm run simulate` ile balance.ts'e dokunmadan değerler denenebilir.
