// XAVFSIZ XONADON — Hudud boshqaruv komponentlari
// MFY va ko'chalarni boshqarish: qo'shish, tahrirlash, o'chirish.
// Backend endpointlari:
//   GET/POST /api/mfylar, PATCH/DELETE /api/mfylar/{id}
//   GET /api/mfylar/{id} (ko'chalar bilan)
//   POST /api/kochalar, PATCH/DELETE /api/kochalar/{id}
// Xonadonlari bor MFY/ko'chani o'chirishni backend bloklaydi (409) —
// frontend tasdiqlash oynasida oldindan ogohlantiradi.

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { apiPost, apiPatch, apiDelete } from '@/api';
import type { MfyBrief, KochaInMfy } from '@/types';
import { useAlifbo } from '@/alifbo';

// ── Umumiy turlar ────────────────────────────────────────────────────

export type Xabar = { turi: 'yaxshi' | 'xato'; matn: string } | null;

export type MfyModal =
  | { rejim: 'qoshish' }
  | { rejim: 'tahrirlash'; mfy: MfyBrief }
  | null;

export type KochaModal =
  | { rejim: 'qoshish' }
  | { rejim: 'tahrirlash'; kocha: KochaInMfy }
  | null;

export type OchirishModal =
  | { tur: 'mfy'; id: number; nomi: string; kochalarSoni: number; xonadonSoni: number }
  | { tur: 'kocha'; id: number; nomi: string; xonadonSoni: number }
  | null;

// ── Toast xabar (yuqori o'ng burchakda, o'zi yo'qoladi) ──────────────

export function Toast({ xabar, onYopish }: { xabar: NonNullable<Xabar>; onYopish: () => void }) {
  const { tr } = useAlifbo();
  const yaxshi = xabar.turi === 'yaxshi';
  return (
    <div
      role="status"
      className={`fixed right-4 top-4 z-[60] flex max-w-md items-start gap-3 rounded-xl border px-5 py-4 shadow-lg ${
        yaxshi
          ? 'border-[#2E9E6B]/30 bg-white text-[#1e7a4f]'
          : 'border-[#C0392B]/30 bg-white text-[#96291f]'
      }`}
    >
      {yaxshi ? (
        <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0" />
      )}
      <p className="text-base font-medium leading-snug">{xabar.matn}</p>
      <button
        onClick={onYopish}
        aria-label={tr('Yopish')}
        className="ml-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

// ── Modal asosiy qutisi ──────────────────────────────────────────────

export function ModalQuti({
  sarlavha,
  onYopish,
  children,
}: {
  sarlavha: string;
  onYopish: () => void;
  children: React.ReactNode;
}) {
  const { tr } = useAlifbo();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onYopish}
    >
      <div
        className="card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-semibold text-[#0F2033]">{sarlavha}</h3>
          <button
            onClick={onYopish}
            aria-label={tr('Yopish')}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="pt-5">{children}</div>
      </div>
    </div>
  );
}

// ── MFY qo'shish / tahrirlash formasi ────────────────────────────────

export function MfyForma({
  modal,
  onYopish,
  onSaqlandi,
}: {
  modal: NonNullable<MfyModal>;
  onYopish: () => void;
  onSaqlandi: () => void;
}) {
  const { tr } = useAlifbo();
  const tahrirlash = modal.rejim === 'tahrirlash';
  const [raqami, setRaqami] = useState(
    tahrirlash ? String(modal.mfy.raqami) : '',
  );
  const [nomi, setNomi] = useState(tahrirlash ? modal.mfy.nomi : '');
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const yuborish = async (e: React.FormEvent) => {
    e.preventDefault();
    setXato(null);

    const raqam = parseInt(raqami, 10);
    if (!raqami.trim() || isNaN(raqam) || raqam < 1) {
      setXato(tr("MFY raqamini kiriting (1 yoki undan katta son)."));
      return;
    }
    if (!nomi.trim()) {
      setXato(tr('MFY nomini kiriting.'));
      return;
    }

    setSaqlanmoqda(true);
    const res = tahrirlash
      ? await apiPatch<MfyBrief>(`/mfylar/${modal.mfy.id}`, {
          raqami: raqam,
          nomi: nomi.trim(),
        })
      : await apiPost<MfyBrief>('/mfylar', {
          raqami: raqam,
          nomi: nomi.trim(),
        });
    setSaqlanmoqda(false);

    if (res.ok) {
      onSaqlandi();
    } else {
      setXato(res.xato || tr('Saqlashda xatolik yuz berdi. Qayta urinib ko\'ring.'));
    }
  };

  return (
    <ModalQuti
      sarlavha={tahrirlash ? tr('MFY ni tahrirlash') : tr('Yangi MFY qo\'shish')}
      onYopish={onYopish}
    >
      <form onSubmit={yuborish} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            {tr('MFY raqami')}
          </label>
          <input
            className="input py-3 text-base"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder={tr('Masalan: 12')}
            value={raqami}
            onChange={(e) => setRaqami(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            {tr('MFY nomi')}
          </label>
          <input
            className="input py-3 text-base"
            type="text"
            maxLength={150}
            placeholder={tr('Masalan: Navoiy')}
            value={nomi}
            onChange={(e) => setNomi(e.target.value)}
          />
        </div>

        {xato && (
          <p className="flex items-start gap-2 rounded-xl bg-[#C0392B]/5 px-4 py-3 text-sm font-medium text-[#96291f]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {xato}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" className="btn-soft px-5 py-3 text-base" onClick={onYopish}>
            {tr('Bekor qilish')}
          </button>
          <button type="submit" className="btn-primary px-5 py-3 text-base" disabled={saqlanmoqda}>
            {saqlanmoqda && <Loader2 className="h-5 w-5 animate-spin" />}
            {saqlanmoqda ? tr('Saqlanmoqda...') : tr('Saqlash')}
          </button>
        </div>
      </form>
    </ModalQuti>
  );
}

// ── Ko'cha qo'shish / tahrirlash formasi ─────────────────────────────

export function KochaForma({
  modal,
  mfyId,
  mfyNomi,
  onYopish,
  onSaqlandi,
}: {
  modal: NonNullable<KochaModal>;
  mfyId: number;
  mfyNomi: string;
  onYopish: () => void;
  onSaqlandi: () => void;
}) {
  const { tr } = useAlifbo();
  const tahrirlash = modal.rejim === 'tahrirlash';
  const [nomi, setNomi] = useState(tahrirlash ? modal.kocha.nomi : '');
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const yuborish = async (e: React.FormEvent) => {
    e.preventDefault();
    setXato(null);

    if (!nomi.trim()) {
      setXato("Ko'cha nomini kiriting.");
      return;
    }

    setSaqlanmoqda(true);
    const res = tahrirlash
      ? await apiPatch(`/kochalar/${modal.kocha.id}`, { nomi: nomi.trim() })
      : await apiPost('/kochalar', { mfy_id: mfyId, nomi: nomi.trim() });
    setSaqlanmoqda(false);

    if (res.ok) {
      onSaqlandi();
    } else {
      setXato(res.xato || 'Saqlashda xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
  };

  return (
    <ModalQuti
      sarlavha={
        tahrirlash ? 'Ko\'chani tahrirlash' : `${mfyNomi} — yangi ko'cha`
      }
      onYopish={onYopish}
    >
      <form onSubmit={yuborish} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            Ko'cha nomi
          </label>
          <input
            className="input py-3 text-base"
            type="text"
            maxLength={150}
            placeholder={tr("Masalan: Amir Temur ko'chasi")}
            value={nomi}
            onChange={(e) => setNomi(e.target.value)}
            autoFocus
          />
        </div>

        {xato && (
          <p className="flex items-start gap-2 rounded-xl bg-[#C0392B]/5 px-4 py-3 text-sm font-medium text-[#96291f]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {xato}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" className="btn-soft px-5 py-3 text-base" onClick={onYopish}>
            {tr('Bekor qilish')}
          </button>
          <button type="submit" className="btn-primary px-5 py-3 text-base" disabled={saqlanmoqda}>
            {saqlanmoqda && <Loader2 className="h-5 w-5 animate-spin" />}
            {saqlanmoqda ? tr('Saqlanmoqda...') : tr('Saqlash')}
          </button>
        </div>
      </form>
    </ModalQuti>
  );
}

// ── O'chirishni tasdiqlash oynasi ────────────────────────────────────

export function OchirishTasdiq({
  modal,
  onYopish,
  onOchirildi,
  onXato,
}: {
  modal: NonNullable<OchirishModal>;
  onYopish: () => void;
  onOchirildi: () => void;
  onXato: (matn: string) => void;
}) {
  const { tr } = useAlifbo();
  const [ochirilmoqda, setOchirilmoqda] = useState(false);

  const bloklangan = modal.xonadonSoni > 0;

  const ochirish = async () => {
    setOchirilmoqda(true);
    const res =
      modal.tur === 'mfy'
        ? await apiDelete(`/mfylar/${modal.id}`)
        : await apiDelete(`/kochalar/${modal.id}`);
    setOchirilmoqda(false);

    if (res.ok) {
      onOchirildi();
    } else {
      onXato(res.xato || tr("O'chirishda xatolik yuz berdi. Qayta urinib ko'ring."));
    }
  };

  return (
    <ModalQuti sarlavha={tr("O'chirishni tasdiqlang")} onYopish={onYopish}>
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-slate-700">
          <span className="font-semibold text-[#0F2033]">"{modal.nomi}"</span>
          {modal.tur === 'mfy' ? tr(' MFY ni') : tr(" ko'chasini")} {tr('rostdan ham o\'chirmoqchimisiz?')}
        </p>

        {/* Ko'chalar birga o'chishi haqida ogohlantirish */}
        {modal.tur === 'mfy' && modal.kochalarSoni > 0 && !bloklangan && (
          <p className="flex items-start gap-2 rounded-xl bg-[#d9a441]/10 px-4 py-3 text-sm font-medium text-[#8a621b]">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {tr('Diqqat: bu MFY dagi')} {modal.kochalarSoni} {tr('ta ko\'cha ham birga o\'chiriladi.')}
          </p>
        )}

        {/* Xonadonlar bor — o'chirish mumkin emas */}
        {bloklangan && (
          <p className="flex items-start gap-2 rounded-xl bg-[#C0392B]/5 px-4 py-3 text-sm font-medium text-[#96291f]">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            Bu {modal.tur === 'mfy' ? tr('MFY ga') : tr("ko'chaga")} {modal.xonadonSoni}{' '}
            {tr('ta xonadon biriktirilgan. O\'chirishdan oldin xonadonlarni o\'chiring yoki boshqa joyga ko\'chiring.')}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" className="btn-soft px-5 py-3 text-base" onClick={onYopish}>
            {tr('Bekor qilish')}
          </button>
          {!bloklangan && (
            <button
              type="button"
              className="btn-danger px-5 py-3 text-base"
              onClick={ochirish}
              disabled={ochirilmoqda}
            >
              {ochirilmoqda ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
              {ochirilmoqda ? tr("O'chirilmoqda...") : tr('Ha, o\'chirish')}
            </button>
          )}
        </div>
      </div>
    </ModalQuti>
  );
}
