// XAVFSIZ XONADON — shared types matching backend Pydantic schemas

export type UserRole = 'superadmin' | 'rahbar' | 'xodim';
export type UserStatus = 'faol' | 'kutilmoqda' | 'bloklangan';
export type MuammoTuri = 'gaz' | 'elektr' | 'yongin' | 'boshqa';
export type MuammoStatus = 'ochiq' | 'jarayonda' | 'yopilgan' | 'qayta_ochilgan';
export type XavfDaraja = 'past' | 'orta' | 'yuqori';
export type FotoTuri = 'oldin' | 'keyin';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data: T;
  xato: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Auth
export interface UserBrief {
  id: number;
  guvohnoma_raqami: string;
  familiya: string;
  ism: string;
  sharif: string | null;
  full_name: string;
  rol: UserRole;
  holat: UserStatus;
  lavozim: string | null;
  telefon: string | null;
  oxirgi_kirish: string | null;
  yaratilgan: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  user: UserBrief;
}

export interface RegisterResponse {
  id: number;
  guvohnoma_raqami: string;
  holat: string;
  xabar: string;
}

// Xonadon
export interface XonadonBrief {
  id: number;
  kocha_id: number;
  uy_raqami: string;
  lat: number | null;
  lng: number | null;
  egasi_fio: string | null;
  egasi_tel: string | null;
  izoh: string | null;
  full_address: string | null;
  kocha_nomi: string | null;
  mfy_nomi: string | null;
  mfy_id: number | null;
  ochiq_muammolar_soni: number;
  yaratilgan: string;
}

export interface XonadonCreatePayload {
  kocha_id: number;
  uy_raqami: string;
  lat?: number;
  lng?: number;
  egasi_fio?: string;
  egasi_tel?: string;
  izoh?: string;
}

export interface XonadonUpdatePayload {
  kocha_id?: number;
  uy_raqami?: string;
  lat?: number;
  lng?: number;
  egasi_fio?: string;
  egasi_tel?: string;
  izoh?: string;
}

// Muammo
export interface MuammoBrief {
  id: number;
  xonadon_id: number;
  xodim_id: number;
  turi: MuammoTuri;
  tavsif: string | null;
  xavf: XavfDaraja;
  status: MuammoStatus;
  shubhali: boolean;
  ornida_bartaraf: boolean;
  muddat: string | null;
  tashkilot: string | null;
  yopilgan_sana: string | null;
  sinxron_vaqti: string;
  xodim_fio: string | null;
  xonadon_manzili: string | null;
  mfy_nomi: string | null;
  kocha_nomi: string | null;
  uy_raqami: string | null;
  egasi_fio: string | null;
  egasi_tel: string | null;
  taklif_etilgan_tadbirlar: string | null;
  yoriqnomadan_otkanlar_soni: number | null;
}

export interface MuammoCreatePayload {
  xonadon_id: number;
  turi: MuammoTuri;
  tavsif?: string;
  xavf: XavfDaraja;
  lat?: number;
  lng?: number;
  gps_aniqlik?: number;
  mock_gps?: boolean;
  client_uuid?: string;
  qurilma_vaqti?: string;
}

export interface MuammoUpdatePayload {
  status?: MuammoStatus;
  ornida_bartaraf?: boolean;
  muddat?: string;
  xavf?: XavfDaraja;
  tashkilot?: string;
}

export interface MuammoYopishPayload {
  ornida_bartaraf: boolean;
  tavsif?: string;
}

export interface FotoResponse {
  id: number;
  muammo_id: number;
  url: string;
  turi: FotoTuri;
  yaratilgan: string;
}

export interface MuammoDetail {
  id: number;
  xonadon_id: number;
  xodim_id: number;
  turi: string;
  turi_nomi: string | null;
  tavsif: string | null;
  xavf: string;
  status: string;
  ornida_bartaraf: boolean;
  muddat: string | null;
  muddat_qolgan_kun: number | null;
  tashkilot: string | null;
  tashkilotga_sana: string | null;
  lat: number;
  lng: number;
  gps_aniqlik: number | null;
  mock_gps: boolean;
  shubhali: boolean;
  client_uuid: string;
  qurilma_vaqti: string;
  sinxron_vaqti: string;
  yopilgan_sana: string | null;
  fotolar: FotoResponse[];
  xonadon_manzili: string | null;
  xodim_fio: string | null;
}

// Hudud
export interface MfyBrief {
  id: number;
  raqami: number;
  nomi: string;
  markaz_lat: number | null;
  markaz_lng: number | null;
  xonadon_soni: number;
  kochalar_soni: number;
}

export interface MfyDetail extends MfyBrief {
  kochalar: KochaInMfy[];
}

export interface KochaInMfy {
  id: number;
  nomi: string;
  xonadon_soni: number;
}

export interface KochaBrief {
  id: number;
  mfy_id: number;
  nomi: string;
  xonadon_soni: number;
}

export interface KochaCreatePayload {
  mfy_id: number;
  nomi: string;
}

// Users
export interface Foydalanuvchi extends UserBrief {
  mfy_biriktirishlar: { mfy_id: number; nomi: string | null }[];
}

// Xarita (GPS)
export interface AktivXodim {
  xodim_id: number;
  xodim_fio: string;
  lat: number;
  lng: number;
  aniqlik: number | null;
  batareya: number | null;
  ohirgi_vaqt: string;
}

// Statistika (Analitika)
export interface UmumiyStatistika {
  xonadon_soni: number;
  kocha_soni: number;
  muammo_soni: number;
  ochiq_muammolar: number;
  yopilgan_muammolar: number;
  xodim_soni: number;
  mfy_soni: number;
  tekshirilgan_xonadon: number;
  foiz: number;
}

export interface MuammoTuriStat {
  turi: string;
  soni: number;
}

export interface MuammoXavfStat {
  xavf: string;
  soni: number;
}

export interface MuammoStatusStat {
  status: string;
  soni: number;
}

export interface MFYStatistika {
  mfy_id: number;
  mfy_nomi: string;
  xonadon_soni: number;
  tekshirilgan: number;
  ochiq_muammo: number;
  yopilgan_muammo: number;
  foiz: number;
}

export interface TopshiriqStat {
  jami: number;
  yangi: number;
  korildi: number;
  bajarildi: number;
  kechikkan: number;
}

export interface IntizomStat {
  jami: number;
  ogohlantirish: number;
  hayfsan: number;
  ragbat: number;
}

export interface VaqtDavriStat {
  davr: string;
  ochilgan: number;
  yopilgan: number;
}

export interface StatistikaResponse {
  umumiy: UmumiyStatistika;
  muammo_turlari: MuammoTuriStat[];
  muammo_xavf: MuammoXavfStat[];
  muammo_status: MuammoStatusStat[];
  mfylar: MFYStatistika[];
  topshiriqlar: TopshiriqStat;
  intizom: IntizomStat;
  vaqt_dinamika: VaqtDavriStat[];
}

export interface XodimStatistika {
  xodim_id: number;
  xodim_fio: string;
  jami_muammo: number;
  ochiq_muammo: number;
  yopilgan_muammo: number;
  jami_tekshirish: number;
  oxirgi_faollik: string | null;
}
