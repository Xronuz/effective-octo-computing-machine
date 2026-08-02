// XAVFSIZ XONADON — "Mening profilim" modali: rasm, F.I.Sh, telefon,
// guvohnoma raqami va parolni o'zgartirish (bitta "Saqlash" tugmasi).

import { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth';
import { apiPatchForm } from '@/api';
import type { ApiResponse, UserBrief } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfilSozlamalariModal({ open, onClose }: Props) {
  const { user, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [ism, setIsm] = useState('');
  const [familiya, setFamiliya] = useState('');
  const [telefon, setTelefon] = useState('');
  const [guvohnoma, setGuvohnoma] = useState('');
  const [joriyParol, setJoriyParol] = useState('');
  const [yangiParol, setYangiParol] = useState('');
  const [yangiParolTasdiq, setYangiParolTasdiq] = useState('');
  const [rasmFile, setRasmFile] = useState<File | null>(null);
  const [rasmPreview, setRasmPreview] = useState<string | null>(null);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  // Ochilganda joriy foydalanuvchi ma'lumotlari bilan formani to'ldirish
  useEffect(() => {
    if (!open || !user) return;
    setIsm(user.ism);
    setFamiliya(user.familiya);
    setTelefon(user.telefon ?? '');
    setGuvohnoma(user.guvohnoma_raqami);
    setJoriyParol('');
    setYangiParol('');
    setYangiParolTasdiq('');
    setRasmFile(null);
    setRasmPreview(user.profil_foto_url ?? null);
    setXato(null);
  }, [open, user]);

  if (!open || !user) return null;

  const rasmTanlandi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setRasmFile(f);
    setRasmPreview(URL.createObjectURL(f));
  };

  const saqlash = async () => {
    setXato(null);

    const guvohnomaOzgardi = guvohnoma.trim().toUpperCase() !== user.guvohnoma_raqami;
    const parolOzgaryapti = yangiParol.length > 0;

    if (parolOzgaryapti && yangiParol !== yangiParolTasdiq) {
      setXato("Yangi parol va tasdiqlash mos emas.");
      return;
    }
    if ((guvohnomaOzgardi || parolOzgaryapti) && !joriyParol) {
      setXato("Guvohnoma yoki parolni o'zgartirish uchun joriy parolni kiriting.");
      return;
    }

    const fd = new FormData();
    if (ism.trim() !== user.ism) fd.append('ism', ism.trim());
    if (familiya.trim() !== user.familiya) fd.append('familiya', familiya.trim());
    if (telefon.trim() !== (user.telefon ?? '')) fd.append('telefon', telefon.trim());
    if (guvohnomaOzgardi) fd.append('guvohnoma_raqami', guvohnoma.trim().toUpperCase());
    if (parolOzgaryapti) fd.append('yangi_parol', yangiParol);
    if (guvohnomaOzgardi || parolOzgaryapti) fd.append('joriy_parol', joriyParol);
    if (rasmFile) fd.append('rasm', rasmFile);

    setSaqlanmoqda(true);
    try {
      const res = (await apiPatchForm('/auth/men', fd)) as ApiResponse<{ user: UserBrief }>;
      if (!res.ok) {
        setXato(res.xato || 'Saqlashda xatolik yuz berdi.');
        return;
      }
      updateUser(res.data.user);
      onClose();
    } finally {
      setSaqlanmoqda(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-[8vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Profil sozlamalari"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Profil sozlamalari</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          {/* Rasm */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-navy-800 text-lg font-semibold text-white"
            >
              {rasmPreview ? (
                <img src={rasmPreview} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                `${ism[0] ?? ''}${familiya[0] ?? ''}`.toUpperCase()
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={20} className="text-white" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={rasmTanlandi}
            />
          </div>

          {/* Ism / Familiya */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Ism</label>
              <input
                value={ism}
                onChange={(e) => setIsm(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Familiya</label>
              <input
                value={familiya}
                onChange={(e) => setFamiliya(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Telefon</label>
            <input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="+998 XX XXX XX XX"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
            />
          </div>

          {/* Guvohnoma raqami */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Guvohnoma raqami</label>
            <input
              value={guvohnoma}
              onChange={(e) => setGuvohnoma(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-navy-800 focus:outline-none"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-medium text-[var(--text-muted)]">Parolni o'zgartirish (ixtiyoriy)</p>
            <div className="space-y-3">
              <input
                type="password"
                value={yangiParol}
                onChange={(e) => setYangiParol(e.target.value)}
                placeholder="Yangi parol"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
              />
              <input
                type="password"
                value={yangiParolTasdiq}
                onChange={(e) => setYangiParolTasdiq(e.target.value)}
                placeholder="Yangi parolni tasdiqlang"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Joriy parol — guvohnoma yoki parol o'zgartirilganda talab qilinadi */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
              Joriy parol <span className="text-gray-400">(guvohnoma yoki parolni o'zgartirsangiz kerak)</span>
            </label>
            <input
              type="password"
              value={joriyParol}
              onChange={(e) => setJoriyParol(e.target.value)}
              placeholder="Joriy parolingiz"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-800 focus:outline-none"
            />
          </div>

          {xato && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{xato}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-100"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={saqlash}
            disabled={saqlanmoqda}
            className="flex items-center gap-2 rounded-full bg-navy-800 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-900 disabled:opacity-60"
          >
            {saqlanmoqda && <Loader2 size={16} className="animate-spin" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
