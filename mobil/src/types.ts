export type UserRole = 'superadmin' | 'rahbar' | 'xodim';

// Backend UserResponse fields
export interface UserBrief {
  id: number;
  guvohnoma_raqami: string;
  familiya: string;
  ism: string;
  sharif: string | null;
  lavozim: string;
  telefon: string | null;
  profil_foto_url: string | null;
  rol: string;
  holat: string;
  yaratilgan: string;
  oxirgi_kirish: string | null;
  full_name: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  user: UserBrief;
}

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

// Xonadon (backend XonadonResponse)
export interface XonadonSummary {
  id: number;
  kocha_id: number;
  uy_raqami: string;
  lat: number | null;
  lng: number | null;
  egasi_fio: string | null;
  egasi_tel: string | null;
  izoh: string | null;
  yaratilgan: string;
  full_address: string | null;
  kocha_nomi: string | null;
  mfy_nomi: string | null;
  mfy_id: number | null;
  ochiq_muammolar_soni: number;
}

// Alias: Xonadon = XonadonSummary (same from list and detail endpoints)
export type Xonadon = XonadonSummary;

// Muammo (backend MuammoResponse)
export interface MuammoSummary {
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

// Alias for full detail
export type Muammo = MuammoSummary;

export interface FotoResponse {
  id: number;
  turi: string;
  fayl_yoli: string;
  yuklangan: string;
}

// Muammo turi — backend allowed values
export type MuammoTuri =
  | 'ochiq_elektr_simi'
  | 'elektr_shchit_nosoz'
  | 'gaz_shlangi_nosoz'
  | 'gaz_hidi'
  | 'isitish_uskunasi'
  | 'mo_ri_tozalanmagan'
  | 'ot_ochirgich_yoq'
  | 'evakuatsiya_yoli_yopiq'
  | 'boshqa';

export type XavfDarajasi = 'past' | 'orta' | 'yuqori' | 'kritik';

export interface MuammoCreatePayload {
  xonadon_id: number;
  turi: string;
  tavsif?: string;
  xavf: string;
  lat: number;
  lng: number;
  gps_aniqlik?: number;
  mock_gps?: boolean;
  client_uuid?: string;
  qurilma_vaqti?: string;
}

// Hudud
export interface MfyBrief {
  id: number;
  raqami: number;
  nomi: string;
  xonadon_soni: number;
  kochalar_soni: number;
}

export interface KochaBrief {
  id: number;
  mfy_id: number;
  nomi: string;
  xonadon_soni: number;
}

// Offline
export interface OfflineMuammo {
  local_id: string;
  xonadon_id: number;
  turi: string;
  tavsif: string;
  xavf: string;
  lat: number;
  lng: number;
  gps_aniqlik: number;
  mock_gps: boolean;
  client_uuid: string;
  qurilma_vaqti: string;
  foto_paths: string[];
  sinxronlandi: 0 | 1;
  yaratilgan: string;
}
