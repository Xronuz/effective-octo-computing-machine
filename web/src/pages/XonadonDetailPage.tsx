// XAVFSIZ XONADON — Xonadon tafsilot sahifasi

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Pencil, Save, Trash2 } from 'lucide-react';
import { apiGet, apiPatch, apiDelete } from '@/api';
import { useAuth } from '@/auth';
import { useAlifbo } from '@/alifbo';
import type { XonadonBrief, MuammoBrief, ApiResponse, Paginated } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  ochiq: 'badge-red',
  jarayonda: 'badge-yellow',
  yopilgan: 'badge-green',
  qayta_ochilgan: 'badge-blue',
};

const STATUS_LABEL: Record<string, string> = {
  ochiq: 'Ochiq',
  jarayonda: 'Jarayonda',
  yopilgan: 'Yopilgan',
  qayta_ochilgan: 'Qayta ochilgan',
};

const TURI_LABEL: Record<string, string> = {
  gaz: 'Gaz',
  elektr: 'Elektr',
  yongin: 'Yong‘in',
  boshqa: 'Boshqa',
};

export default function XonadonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRahbar, isSuperadmin } = useAuth();
  const { tr } = useAlifbo();

  const [xonadon, setXonadon] = useState<XonadonBrief | null>(null);
  const [muammolar, setMuammolar] = useState<MuammoBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // ── Data fetching ──

  const fetchXonadon = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    const res = await apiGet<XonadonBrief>(`/xonadonlar/${id}`);
    if (!res.ok) {
      if (res.xato?.includes('topilmadi') || (res as any).status === 404) {
        setNotFound(true);
      } else {
        setError(res.xato || tr('Xonadon maʼlumotlarini yuklashda xatolik yuz berdi'));
      }
      setLoading(false);
      return;
    }
    setXonadon(res.data);
    setLoading(false);
  };

  const fetchMuammolar = async () => {
    if (!id) return;
    const res = await apiGet<Paginated<MuammoBrief>>(`/muammolar?xonadon_id=${id}`);
    if (res.ok) {
      setMuammolar(res.data.items);
    }
  };

  useEffect(() => {
    fetchXonadon();
    fetchMuammolar();
  }, [id]);

  // ── Edit handlers ──

  const startEditing = () => {
    if (!xonadon) return;
    setEditForm({
      uy_raqami: xonadon.uy_raqami,
      egasi_fio: xonadon.egasi_fio ?? '',
      egasi_tel: xonadon.egasi_tel ?? '',
      izoh: xonadon.izoh ?? '',
      lat: xonadon.lat?.toString() ?? '',
      lng: xonadon.lng?.toString() ?? '',
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!id || !xonadon) return;
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {};
    if (editForm.uy_raqami !== xonadon.uy_raqami) body.uy_raqami = editForm.uy_raqami;
    if (editForm.egasi_fio !== (xonadon.egasi_fio ?? '')) body.egasi_fio = editForm.egasi_fio || undefined;
    if (editForm.egasi_tel !== (xonadon.egasi_tel ?? '')) body.egasi_tel = editForm.egasi_tel || undefined;
    if (editForm.izoh !== (xonadon.izoh ?? '')) body.izoh = editForm.izoh || undefined;

    const lat = editForm.lat ? parseFloat(editForm.lat) : undefined;
    const lng = editForm.lng ? parseFloat(editForm.lng) : undefined;
    if (lat !== xonadon.lat) body.lat = lat;
    if (lng !== xonadon.lng) body.lng = lng;

    if (Object.keys(body).length === 0) {
      setSaving(false);
      setEditing(false);
      return;
    }

    const res = await apiPatch<XonadonBrief>(`/xonadonlar/${id}`, body);
    if (!res.ok) {
      setError(res.xato || tr('Saqlashda xatolik yuz berdi'));
      setSaving(false);
      return;
    }

    setXonadon(res.data);
    setSaving(false);
    setEditing(false);
    setEditForm({});
  };

  // ── Delete handler ──

  const handleDelete = async () => {
    if (!id || confirmText !== xonadon?.uy_raqami) return;
    setDeleting(true);
    setError(null);
    const res = await apiDelete(`/xonadonlar/${id}`);
    if (!res.ok) {
      setError(res.xato || tr('O‘chirishda xatolik yuz berdi'));
      setDeleting(false);
      return;
    }
    navigate('/xonadonlar', { replace: true });
  };

  const openDeleteConfirm = () => {
    setConfirmText('');
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setConfirmText('');
    setDeleting(false);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0F2033]" />
      </div>
    );
  }

  // ── Not found ──
  if (notFound) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium text-[#0F2033]">{tr('Xonadon topilmadi')}</p>
        <p className="mt-1 text-sm text-gray-500">
          {tr('So‘ralgan xonadon mavjud emas yoki o‘chirilgan bo‘lishi mumkin.')}
        </p>
        <Link to="/xonadonlar" className="btn-primary mt-6 inline-flex">
          {tr('Xonadonlar ro‘yxatiga qaytish')}
        </Link>
      </div>
    );
  }

  // ── Error state (no data) ──
  if (error && !xonadon) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium text-[#C0392B]">{error}</p>
        <button onClick={fetchXonadon} className="btn-primary mt-6">
          {tr('Qayta urinish')}
        </button>
      </div>
    );
  }

  if (!xonadon) return null;

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/xonadonlar"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-[#0F2033]"
      >
        <ArrowLeft className="h-4 w-4" />
        {tr('Xonadonlar ro‘yxatiga qaytish')}
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#0F2033] sm:text-2xl">
          {xonadon.full_address || `${tr('Xonadon')} #${xonadon.id}`}
        </h1>
        <div className="flex items-center gap-2">
          {isRahbar && !editing && (
            <button onClick={startEditing} className="btn-soft gap-2">
              <Pencil className="h-4 w-4" />
              {tr('Tahrirlash')}
            </button>
          )}
          {isSuperadmin && !editing && (
            <button onClick={openDeleteConfirm} className="btn-danger gap-2">
              <Trash2 className="h-4 w-4" />
              {tr('O‘chirish')}
            </button>
          )}
        </div>
      </div>

      {/* Error banner (non-blocking — shown when data exists but operation failed) */}
      {error && xonadon && (
        <div className="rounded-xl border border-[#C0392B]/20 bg-[#C0392B]/5 px-4 py-3 text-sm text-[#C0392B]">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 font-medium underline"
          >
            {tr('Yopish')}
          </button>
        </div>
      )}

      {/* ── Xonadon info card ── */}
      <div className="card p-6">
        {editing ? (
          /* ── Edit mode form ── */
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#0F2033]">
              {tr('Xonadon maʼlumotlarini tahrirlash')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tr('Uy raqami')}
                </label>
                <input
                  className="input"
                  value={editForm.uy_raqami}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, uy_raqami: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tr('Egasi F.I.O.')}
                </label>
                <input
                  className="input"
                  value={editForm.egasi_fio}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, egasi_fio: e.target.value }))
                  }
                  placeholder={tr('Egasi F.I.O.')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tr('Egasi tel.')}
                </label>
                <input
                  className="input"
                  value={editForm.egasi_tel}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, egasi_tel: e.target.value }))
                  }
                  placeholder="+998 XX XXX XX XX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  className="input"
                  value={editForm.lat}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lat: e.target.value }))
                  }
                  placeholder="40.12345"
                  type="number"
                  step="any"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  className="input"
                  value={editForm.lng}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lng: e.target.value }))
                  }
                  placeholder="69.12345"
                  type="number"
                  step="any"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tr('Izoh')}
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={editForm.izoh}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, izoh: e.target.value }))
                  }
                  placeholder={tr('Qo‘shimcha maʼlumot...')}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                className="btn-primary gap-2"
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? tr('Saqlanmoqda...') : tr('Saqlash')}
              </button>
              <button
                onClick={cancelEditing}
                className="btn-ghost"
                disabled={saving}
              >
                {tr('Bekor qilish')}
              </button>
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <>
            <h2 className="text-base font-semibold text-[#0F2033] mb-4">
              {tr('Xonadon maʼlumotlari')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <InfoRow label={tr('To‘liq manzil')} value={xonadon.full_address} />
              <InfoRow label={tr('Mahalla (MFY)')} value={xonadon.mfy_nomi} />
              <InfoRow label={tr('Ko‘cha')} value={xonadon.kocha_nomi} />
              <InfoRow label={tr('Uy raqami')} value={xonadon.uy_raqami} />
              <InfoRow label={tr('Egasi')} value={xonadon.egasi_fio} />
              <InfoRow label={tr('Tel')} value={xonadon.egasi_tel} />
              <InfoRow
                label="Lat/Lng"
                value={
                  xonadon.lat != null && xonadon.lng != null
                    ? `${xonadon.lat}, ${xonadon.lng}`
                    : null
                }
              />
              <InfoRow label={tr('Izoh')} value={xonadon.izoh} />
              <InfoRow
                label={tr('Ochiq muammolar')}
                value={
                  <span className="font-semibold text-[#C0392B]">
                    {xonadon.ochiq_muammolar_soni}
                  </span>
                }
              />
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirmation modal (superadmin only) ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#0F2033] mb-2">
              {tr('Xonadonni o‘chirish')}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {tr('Bu amalni qaytarib bo‘lmaydi. O‘chirishni tasdiqlash uchun xonadon raqamini kiriting:')}
              <span className="block font-mono font-bold text-[#0F2033] mt-1">
                {xonadon.uy_raqami}
              </span>
            </p>
            <input
              className="input mb-4"
              placeholder={tr('Xonadon raqamini kiriting')}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={closeDeleteConfirm} className="btn-ghost">
                {tr('Bekor qilish')}
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
                disabled={confirmText !== xonadon.uy_raqami || deleting}
              >
                {deleting ? tr('O‘chirilmoqda...') : tr('O‘chirish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Xonadon muammolari section ── */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-[#0F2033] mb-4">
          {tr('Xonadon muammolari')}
          {muammolar.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({muammolar.length} {tr('ta')})
            </span>
          )}
        </h2>

        {muammolar.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            {tr('Bu xonadonda muammo yo‘q')}
          </p>
        ) : (
          <div className="space-y-3">
            {muammolar.map((muammo) => (
              <Link
                key={muammo.id}
                to={`/muammolar/${muammo.id}`}
                className="block card p-4 hover:border-[#3D6FB4]/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#0F2033]">
                        {tr(TURI_LABEL[muammo.turi] || muammo.turi)}
                      </span>
                      <span className={STATUS_BADGE[muammo.status] || 'badge-gray'}>
                        {tr(STATUS_LABEL[muammo.status] || muammo.status)}
                      </span>
                      {muammo.shubhali && (
                        <span className="badge-yellow">{tr('Shubhali')}</span>
                      )}
                    </div>
                    {muammo.tavsif && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {muammo.tavsif}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>
                        {tr(new Date(muammo.sana).toLocaleDateString('uz-UZ'))}
                      </span>
                      {muammo.xodim_fio && <span>{muammo.xodim_fio}</span>}
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small helper component ──

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="mt-0.5 text-[#0F2033]">
        {value ?? (
          <span className="text-gray-300 italic">—</span>
        )}
      </span>
    </div>
  );
}
