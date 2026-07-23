// XAVFSIZ XONADON — O'zbek lotin ↔ krill transliteratsiyasi
//
// UI matnlari lotin alifbosida saqlanadi; krill rejimda ko'rsatishda
// shu funksiya orqali o'tkaziladi. Qidiruv so'rovlarini bazadagi lotin
// ma'lumotlarga moslash uchun teskari funksiya ham bor.

// ── Ichki yordamchilar ──────────────────────────────────────────────

const APOSTROFLAR = new Set(["'", '\u2018', '\u2019', '\u02BC', '`']);

const LOTIN_HARF = /[a-zA-Z]/;
const KRILL_HARF = /[а-яА-ЯёЁўЎғҒқҚҳҲъЪ]/;
const UNLI = new Set(['a', 'e', 'i', 'o', 'u']);
// Krill unlilari — aralash matnlar uchun (masalan allaqachon ў ga o'tgan)
const KRILL_UNLI = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'э', 'ю', 'я', 'ў']);

function isApostrof(ch: string | undefined): boolean {
  return ch !== undefined && APOSTROFLAR.has(ch);
}

/** oldingi belgi unli (yoki o' ga tugagan) bo'lsa — y digraflari uchun */
function unlidanKeyin(prev: string | undefined, prev2: string | undefined): boolean {
  if (prev === undefined) return false;
  const p = prev.toLowerCase();
  if (UNLI.has(p) || KRILL_UNLI.has(p)) return true;
  // "o'ya" kabi: o' unli hisoblanadi (g' esa undosh)
  if (isApostrof(prev) && prev2 !== undefined && prev2.toLowerCase() === 'o') return true;
  return false;
}

function harfmi(ch: string | undefined): boolean {
  return ch !== undefined && (LOTIN_HARF.test(ch) || KRILL_HARF.test(ch));
}

// ── Asosiy xaritalar ────────────────────────────────────────────────

const LOTIN_KRILL: Record<string, string> = {
  a: 'а', b: 'б', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж',
  k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р',
  s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з',
  A: 'А', B: 'Б', D: 'Д', F: 'Ф', G: 'Г', H: 'Ҳ', I: 'И', J: 'Ж',
  K: 'К', L: 'Л', M: 'М', N: 'Н', O: 'О', P: 'П', Q: 'Қ', R: 'Р',
  S: 'С', T: 'Т', U: 'У', V: 'В', X: 'Х', Y: 'Й', Z: 'З',
};

// y + unli digraflari (so'z boshida yoki unlidan keyin)
const Y_DIGRAF: Record<string, string> = { a: 'я', u: 'ю', o: 'ё', e: 'е' };
const Y_DIGRAF_KATTA: Record<string, string> = { a: 'Я', u: 'Ю', o: 'Ё', e: 'Е' };

// O'zgartirilmaydigan qisqartmalar (UI'da lotin ko'rinishida qoladi)
const SAQLANADIGAN = /\b(GPS|PDF|QR|SMS|ID|OK)\b/g;

const PH_BOSH = '\u0001';
const PH_OKIR = '\u0002';

// ── Lotin → Krill ───────────────────────────────────────────────────

export function lotindanKrillga(matn: string): string {
  if (!matn) return matn;

  // Saqlanadigan qisqartmalarni vaqtincha placeholder'ga almashtirish
  const saqlangan: string[] = [];
  const tayyor = matn.replace(SAQLANADIGAN, (m) => {
    saqlangan.push(m);
    return `${PH_BOSH}${saqlangan.length - 1}${PH_OKIR}`;
  });

  const belgilar = Array.from(tayyor);
  const chiqish: string[] = [];

  for (let i = 0; i < belgilar.length; i++) {
    const ch = belgilar[i];
    const kichik = ch.toLowerCase();
    const katta = ch !== kichik;
    const keyingi = belgilar[i + 1];
    const keyingiKichik = keyingi?.toLowerCase();
    const keyingi2 = belgilar[i + 2];
    const oldingi = belgilar[i - 1];
    const oldingi2 = belgilar[i - 2];

    // o' / g' digraflari
    if ((kichik === 'o' || kichik === 'g') && isApostrof(keyingi)) {
      chiqish.push(kichik === 'o' ? (katta ? 'Ў' : 'ў') : katta ? 'Ғ' : 'ғ');
      i++;
      continue;
    }

    // sh / ch / ts digraflari
    if (kichik === 's' && keyingiKichik === 'h') {
      chiqish.push(katta ? 'Ш' : 'ш');
      i++;
      continue;
    }
    if (kichik === 'c' && keyingiKichik === 'h') {
      chiqish.push(katta ? 'Ч' : 'ч');
      i++;
      continue;
    }
    if (kichik === 't' && keyingiKichik === 's') {
      chiqish.push(katta ? 'Ц' : 'ц');
      i++;
      continue;
    }

    // y digraflari — faqat so'z boshida yoki unlidan keyin.
    // Eslatma: "yo'l" kabi holatda (o dan keyin apostrof kelsa) bu digraf
    // EMAS — y → й, keyingi o' ў ga o'tadi ("yo'l" → "йўл").
    // "yy" juftligida ikkinchi y yangi digraf boshlaydi (tayyor → тайёр).
    // "yi" unlidan keyin — y tushib qoladi (qayiq → қаиқ).
    if (kichik === 'y') {
      const sozBoshi = oldingi === undefined || !harfmi(oldingi);
      const unlidan =
        sozBoshi || unlidanKeyin(oldingi, oldingi2) || oldingi?.toLowerCase() === 'y';
      if (keyingiKichik === 'i' && unlidan && !sozBoshi) {
        continue; // y yozilmaydi, i o'zi и ga o'tadi
      }
      const digrafEmas = keyingiKichik === 'o' && isApostrof(keyingi2);
      if (
        keyingiKichik !== undefined &&
        keyingiKichik in Y_DIGRAF &&
        !digrafEmas &&
        unlidan
      ) {
        chiqish.push(katta ? Y_DIGRAF_KATTA[keyingiKichik] : Y_DIGRAF[keyingiKichik]);
        i++;
        continue;
      }
      chiqish.push(katta ? 'Й' : 'й');
      continue;
    }

    // e — so'z boshida э, boshqa joyda е
    if (kichik === 'e') {
      const sozBoshi = oldingi === undefined || !harfmi(oldingi);
      chiqish.push(sozBoshi ? (katta ? 'Э' : 'э') : katta ? 'Е' : 'е');
      continue;
    }

    // harflar orasidagi apostrof — ъ (ma'lumot → маълумот)
    if (isApostrof(ch)) {
      if (harfmi(oldingi) && harfmi(keyingi)) {
        chiqish.push('ъ');
      } else {
        chiqish.push(ch);
      }
      continue;
    }

    chiqish.push(LOTIN_KRILL[ch] ?? ch);
  }

  // Placeholder'larni qaytarish
  const qaytar = new RegExp(`${PH_BOSH}(\\d+)${PH_OKIR}`, 'g');
  return chiqish.join('').replace(qaytar, (_, idx) => saqlangan[Number(idx)]);
}

// ── Krill → Lotin (qidiruv normalizatsiyasi uchun) ──────────────────

const KRILL_LOTIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts',
  ч: 'ch', ш: 'sh', ъ: "'", э: 'e', ю: 'yu', я: 'ya',
  ў: "o'", ғ: "g'", қ: 'q', ҳ: 'h',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'J',
  З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O',
  П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'X', Ц: 'Ts',
  Ч: 'Ch', Ш: 'Sh', Ъ: "'", Э: 'E', Ю: 'Yu', Я: 'Ya',
  Ў: "O'", Ғ: "G'", Қ: 'Q', Ҳ: 'H',
};

/** Krill matnni lotin o'zbekchaga o'giradi (qidiruv so'rovlarini normallashtirish uchun) */
export function krilldanLotinga(matn: string): string {
  if (!matn) return matn;
  return Array.from(matn)
    .map((ch) => KRILL_LOTIN[ch] ?? ch)
    .join('');
}

/** Matnda krill harfi bormi */
export function krillMatnmi(matn: string): boolean {
  return /[а-яА-ЯёЁўЎғҒқҚҳҲ]/.test(matn);
}
