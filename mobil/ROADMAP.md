# 📱 Xavfsiz Xonadon — Mobil ilova rivojlantirish yo‘l xaritasi

> **Ko‘rinish:** Xodimning ish kuni davomida tarmoq aloqasi bo‘lmasa ham, u xonadonlarni tekshirishni, muammolarni foto va GPS bilan qayd etishni, topshiriqlarni bajarishni va ma'lumotlarni avtomatik sinxronlashni davom ettira oladigan, tez, xavfsiz va qulay mobil ilova.

## ✅ Joriy holat

**1-bosqich yakunlandi.** Kod sifatini oshirish, xavfsizlik va barqarorlikni ta'minlash bo‘yicha ishlar bajarildi.

**2-bosqich yakunlandi.** UX/UI, dizayn tizimi, formalar validatsiyasi, accessibility va animatsiyalar qo‘shildi.

## 🧭 Arxitektura maqsadi

| Qatlam      | Joriy holat                       | Ideal holat                                            |
| ----------- | --------------------------------- | ------------------------------------------------------ |
| Platforma   | Expo SDK 54, React Native 0.81    | Expo SDK 54+ (CNG bilan), EAS Build/Update             |
| Navigatsiya | React Navigation 7 (Stack + Tabs) | Type-safe navigatsiya, deep linking                    |
| State       | Context API                       | Zustand / Redux Toolkit + React Query (TanStack Query) |
| Offline     | SQLite + avto-sinxron             | To‘liq offline-first: ma'lumotlar, media, GPS keshi    |
| Backend     | FastAPI                           | WebSocket + push notifikatsiya + API versioning        |
| Xarita      | Yo‘q                              | React Native Maps + MFY chegaralari                    |
| Test        | Yo‘q                              | Jest + Maestro E2E                                     |
| Monitoring  | Yo‘q                              | Sentry + Analytics                                     |

## 📋 Bosqichlar

### Bosqich 1. Poydevorni mustahkamlash (1 hafta)

**Maqsad:** Kod sifatini oshirish, xavfsizlik va barqarorlikni ta'minlash.

- [x] `mobil/ROADMAP.md` yaratildi
- [x] ESLint + Prettier + Husky pre-commit sozlash
- [x] `tsconfig.json` ga `strict: true` qo‘yish va type xatolarni tuzatish
- [x] Type-safe navigatsiya (`src/navigation/`) ajratish
- [x] React Error Boundary komponenti qo‘shish
- [x] Tokenlarni `expo-secure-store` da saqlash
- [x] Muhit sozlamalari: prod/dev API URL ajratish

**Natija:** Barqaror, xavfsiz va sifatli kod bazasi.

### Bosqich 2. UX/UI va dizayn tizimi (2 hafta)

**Maqsad:** Ilovani professional va foydalanuvchi uchun qulay qilish.

- [x] Dizayn tizimini kengaytirish (dark mode, animatsiya tezliklari)
- [x] Atomic design bo‘yicha komponentlar kutubxonasi
- [x] React Hook Form + Zod bilan formalar validatsiyasi
- [x] Alifbo kontekstini to‘liq tekshirish va ikkala alifboda matnlar
- [x] Accessibility (screen reader, contrast, font scaling)
- [x] Mikro-animatsiyalar (`react-native-reanimated` / `moti`)
- [x] Pull-to-refresh UX ni bir xil qilish

### Bosqich 3. Offline-first va sinxronlashni kuchaytirish (3 hafta)

**Maqsad:** Ilova tarmoqsiz joylarda ham to‘liq ishlashi kerak.

- [x] Xonadonlar, ko‘chalar, MFYlar, topshiriqlarni SQLite ga keshlash
- [x] Ochiq muammolarni offline ko‘rish
- [x] Sinxronlash navbati ekranini kengaytirish (status, qayta urinish)
- [x] Rasmlarni lokal saqlash va internet bo‘lganda yuklash
- [x] Background GPS tracking (`expo-location` background task)
- [x] Conflict resolution va idempotency kuchaytirish
- [x] Sinxronlash progress indicator

### Bosqich 4. Asosiy funksiyalarni kengaytirish (4 hafta)

**Maqsad:** Xodimning kundalik ishini maksimal darajada osonlashtirish.

- [ ] QR/Barcode skaner orqali xonadon ID kiritish
- [ ] Xonadon filtrlari va saralash
- [ ] Har bir uy bo‘yicha muammolar tarixi
- [ ] Tekshiruv rejimi va geofencing
- [ ] Bir nechta foto va foto izohlari
- [ ] Ovozli izoh qo‘shish
- [ ] GPS yaxshilash va mock GPS aniqlash
- [ ] Tezkor muammo shablonlari
- [ ] React Native Maps + MFY chegaralari
- [ ] Optimal tekshiruv marshruti
- [ ] Push notifikatsiyalar topshiriqlar uchun
- [ ] Shaxsiy va jamoaviy statistika

### Bosqich 5. Testlash va sifat nazorati (2 hafta)

- [ ] Jest + React Native Testing Library unit testlar
- [ ] MSW mock API bilan integratsiya testlar
- [ ] Maestro E2E testlar
- [ ] Storybook visual regression
- [ ] Haqiqiy qurilmalarda manual QA
- [ ] Flipper/React DevTools performance profiling

### Bosqich 6. DevOps va chiqarish (2 hafta)

- [ ] `eas.json` sozlash (dev/prod profile)
- [ ] EAS Update OTA yangilanishlar
- [ ] GitHub Actions CI/CD
- [ ] App Store / Play Store submission
- [ ] Code signing va sertifikatlar
- [ ] Semver va changelog

### Bosqich 7. Monitoring va iteratsiya (doimiy)

- [ ] Sentry crash monitoring
- [ ] Analytics integratsiyasi
- [ ] In-app feedback
- [ ] Performance metrics
- [ ] A/B testing

## 🏗 Maqsadli fayl tuzilishi

```
mobil/
├── src/
│   ├── api/                 # TanStack Query hooks + API wrappers
│   ├── assets/              # Rasmlar, fontlar
│   ├── components/          # UI komponentlar (atomic design)
│   ├── constants/           # App config, enums
│   ├── contexts/            # Auth, Theme, Alifbo
│   ├── hooks/               # Custom hooks
│   ├── navigation/          # Type-safe navigatsiya
│   ├── screens/             # Ekranlar
│   ├── services/            # API, DB, sync, location, push
│   ├── stores/              # Zustand store'lar
│   ├── theme/               # Dizayn tizimi
│   ├── types/               # TypeScript turlari
│   ├── utils/               # Helper functions
│   └── validations/         # Zod schemas
├── tests/                   # Jest tests
├── maestro/                 # E2E flows
├── app.json
├── eas.json
├── package.json
└── README.md
```

## ⏳ Jadval

| Bosqich              | Vaqt    |
| -------------------- | ------- |
| 1. Poydevor          | 1 hafta |
| 2. UX/UI             | 2 hafta |
| 3. Offline-first     | 3 hafta |
| 4. Yangi funksiyalar | 4 hafta |
| 5. Testlash          | 2 hafta |
| 6. DevOps            | 2 hafta |
| 7. Monitoring        | doimiy  |

**Jami yakuniy MVP:** ~14 hafta (3.5 oy)

## ✅ Muvaffaqiyat mezonlari

1. 48 soat davomida tarmoqsiz ishlash imkoniyati.
2. 100 ta yozuv + 300 foto sinxronlash → 5 daqiqadan kam.
3. 90% holatlarda GPS aniqligi ±15 m dan yaxshi.
4. 1000 ta sessiyada 1 dan kam crash.
5. 80%+ test qamrovi.
6. Xodimlar bahosi 4.5/5.
