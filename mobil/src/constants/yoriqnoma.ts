// "Aholi turar joylarida yong'inlarning oldini olish maqsadida uyma-uy yurib
// xonadon egalariga yong'inga qarshi yo'l-yo'riq berish" YO'RIQNOMASI — 14 band.
// Inspektor tekshiruv vaqtida shu bandlar bo'yicha xonadonni baholaydi.

export interface YoriqnomaBandi {
  id: number;
  matn: string;
}

export const YORIQNOMA_BANDLARI: YoriqnomaBandi[] = [
  { id: 1, matn: "Elektr tarmog'idagi himoya avtomat (saqlagich)larning holatiga." },
  {
    id: 2,
    matn: "Elektr simlarining izolyatsiyasi butligiga va vaqtinchalik o'tkazilgan elektr simlaridan foydalanilmayotganligiga.",
  },
  {
    id: 3,
    matn: "Elektr ta'minotining (rozetka, vklyuchatel) holatiga, elektr rozetka (udlennitel)ga bir vaqtning o'zida bir nechta (3 tadan ortiq) maishiy elektr uskunalarni ulab foydalanilmayotganligiga.",
  },
  {
    id: 4,
    matn: "Molxona va yem-xashak saqlash xonalarining yoritish chiroqlari va o'tkazilgan elektr simlarining holatiga.",
  },
  {
    id: 5,
    matn: "Yashash uyining hovlisida tez yonuvchi buyumlar (somon, xas-xashak, g'o'zapoya va shu kabilar) tartibsiz va yashash uyining tomida (chordog'ida) saqlanmayotganligiga.",
  },
  { id: 6, matn: "Xonadon hududi turli chiqindi va qurigan o'simliklardan tozalanganligiga." },
  {
    id: 7,
    matn: "Isitish pechlari va ularning dudburonlarining sozligiga, maxsus tashkilot mutaxassislari tomonidan ko'rikdan o'tkazilganligiga.",
  },
  {
    id: 8,
    matn: "Pech va dudburonlarining atrofida (kamida 1 metr) yonuvchi buyumlar yaqin joylashtirilmaganligiga, qattiq yoqilg'ida ishlovchi pechlarning olov yoqish (topka) joylarida polga 70 x 50 sm o'lchamdagi tunika qoplanganligiga.",
  },
  { id: 9, matn: "Qattiq yoqilg'i (o'tin, ko'mir) saqlash joylarining holatiga." },
  {
    id: 10,
    matn: "Nosoz gaz uskunalari va avtomatikasi bo'lmagan isitish qozonlaridan foydalanilmayotganligiga.",
  },
  {
    id: 11,
    matn: "Gaz uskunalari tarmoqqa nostandart rezina shlang orqali ulanmaganligiga va ular o'rnatilgan xonada havo almashinuvi ta'minlanganligiga.",
  },
  { id: 12, matn: "Qo'lbola gaz va elektr isitish moslamalaridan foydalanilmayotganligiga." },
  {
    id: 13,
    matn: "Chordoq va yerto'lada yonuvchi va yengil alangalanuvchi mahsulotlar saqlanmaganligiga.",
  },
  {
    id: 14,
    matn: 'Turar joylarda 10 litrdan ortiq yengil alangalanuvchi va yonuvchi suyuqliklar saqlanmaganligiga.',
  },
];

const BANDLAR_MAP: Map<number, string> = new Map(YORIQNOMA_BANDLARI.map((b) => [b.id, b.matn]));

/** "3,4,8" kabi vergul bilan ajratilgan bandlar satrini raqamlar ro'yxatiga o'giradi. */
export function bandlarniParse(csv: string | null | undefined): number[] {
  if (!csv || !csv.trim()) return [];
  return csv
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 14);
}

/** Band raqamining to'liq matnini qaytaradi (topilmasa — bo'sh satr). */
export function bandMatni(id: number): string {
  return BANDLAR_MAP.get(id) ?? '';
}
