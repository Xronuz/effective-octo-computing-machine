// XAVFSIZ XONADON — Foydalanuvchilar boshqaruvi (rahbar / superadmin)

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, X, Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/api';
import { useAuth } from '@/auth';
import { useAlifbo } from '@/alifbo';
import { krilldanLotinga, mfyNomiTozala } from '@/lib/alifbo';
import { SkeletonTable } from '@/components/Skeleton';
import StatusSelect from '@/components/StatusSelect';
import type { Foydalanuvchi, Paginated, MfyBrief } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────

const rolRangi: Record<string, string> = {
  superadmin: 'badge-purple',
  rahbar: 'badge-blue',
  xodim: 'badge-gray',
};

const holatRangi: Record<string, string> = {
  faol: 'badge-green',
  kutilmoqda: 'badge-yellow',
  bloklangan: 'badge-red',
};

const rolLabels: Record<string, string> = {
  superadmin: 'Superadmin',
  rahbar: 'Rahbar',
  xodim: 'Xodim',
};

const holatLabels: Record<string, string> = {
  faol: 'Faol',
  kutilmoqda: 'Kutilmoqda',
  bloklangan: 'Bloklangan',
};

// ── MFY biriktirish modali ───────────────────────────────────────────

interface MfyModalProps {
  user: Foydalanuvchi;
  onClose: () => void;
  onSaved: () => void;
}

function MfyBiriktirishModal({ user, onClose, onSaved }: MfyModalProps) {
  const { tr } = useAlifbo();
  const [allMfy, setAllMfy] = useState<MfyBrief[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load all MFY and pre-check already assigned ones
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Backend /mfylar oddiy massiv qaytaradi (sahifalanmaydi)
      const res = await apiGet<MfyBrief[]>('/mfylar');
      if (cancelled) return;
      if (res.ok && Array.isArray(res.data)) {
        setAllMfy(res.data);
        const assigned = new Set<number>(
          user.mfy_biriktirishlar.map((b) => b.mfy_id),
        );
        setSelectedIds(assigned);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await apiPost(`/users/${user.id}/mfy`, { mfy_ids: [...selectedIds] });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      alert(res.xato || tr('Saqlashda xatolik'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card mx-4 flex max-h-[80vh] w-full max-w-lg flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-[#0F2033]">
            {tr('MFY biriktirish')} — {tr(user.full_name)}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={tr('Yopish')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — scrollable checkbox list */}
        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-8 text-center text-slate-400">{tr('Yuklanmoqda...')}</div>
          ) : allMfy.length === 0 ? (
            <div className="py-8 text-center text-slate-400">{tr('MFY lar topilmadi')}</div>
          ) : (
            allMfy.map((mfy) => (
              <label
                key={mfy.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(mfy.id)}
                  onChange={() => toggle(mfy.id)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">
                  {tr(mfyNomiTozala(mfy.nomi))} {tr('MFY')}
                </span>
              </label>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>
            {tr('Bekor qilish')}
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving || loading}>
            {saving ? tr('Saqlanmoqda...') : tr('Saqlash')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Foydalanuvchi ma'lumotlarini tahrirlash modali ──────────────────

interface TahrirlashModalProps {
  user: Foydalanuvchi;
  onClose: () => void;
  onSaved: () => void;
}

function TahrirlashModal({ user, onClose, onSaved }: TahrirlashModalProps) {
  const { tr } = useAlifbo();
  const [familiya, setFamiliya] = useState(user.familiya);
  const [ism, setIsm] = useState(user.ism);
  const [sharif, setSharif] = useState(user.sharif ?? '');
  const [lavozim, setLavozim] = useState(user.lavozim ?? '');
  const [telefon, setTelefon] = useState(user.telefon ?? '');
  const [guvohnoma, setGuvohnoma] = useState(user.guvohnoma_raqami);
  const [saving, setSaving] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  const handleSave = async () => {
    setXato(null);
    setSaving(true);
    const res = await apiPatch(`/users/${user.id}`, {
      familiya: familiya.trim(),
      ism: ism.trim(),
      sharif: sharif.trim() || null,
      lavozim: lavozim.trim(),
      telefon: telefon.trim() || null,
      guvohnoma_raqami: guvohnoma.trim().toUpperCase(),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setXato(res.xato || tr('Saqlashda xatolik'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card flex max-h-[85vh] w-full max-w-md flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-[#0F2033]">
            {tr('Ma\'lumotlarni tahrirlash')} — {tr(user.full_name)}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label={tr('Yopish')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Familiya')}</label>
              <input className="input w-full" value={familiya} onChange={(e) => setFamiliya(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Ism')}</label>
              <input className="input w-full" value={ism} onChange={(e) => setIsm(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Sharif')}</label>
            <input className="input w-full" value={sharif} onChange={(e) => setSharif(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Lavozim')}</label>
            <input className="input w-full" value={lavozim} onChange={(e) => setLavozim(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Telefon')}</label>
            <input className="input w-full" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="+998 XX XXX XX XX" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Guvohnoma raqami')}</label>
            <input className="input w-full uppercase" value={guvohnoma} onChange={(e) => setGuvohnoma(e.target.value.toUpperCase())} />
          </div>
          {xato && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{xato}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>
            {tr('Bekor qilish')}
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? tr('Saqlanmoqda...') : tr('Saqlash')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── asosiy sahifa ────────────────────────────────────────────────────

export default function BoshqaruvPage() {
  const { isSuperadmin } = useAuth();
  const { tr } = useAlifbo();

  // Filters
  const [rolFilter, setRolFilter] = useState('');
  const [holatFilter, setHolatFilter] = useState('');
  const [qidiruv, setQidiruv] = useState('');

  // Data
  const [users, setUsers] = useState<Foydalanuvchi[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal
  const [mfyUser, setMfyUser] = useState<Foydalanuvchi | null>(null);
  const [tahrirUser, setTahrirUser] = useState<Foydalanuvchi | null>(null);

  // ── fetch users ──────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (rolFilter) params.set('rol', rolFilter);
    if (holatFilter) params.set('holat', holatFilter);
    if (qidiruv.trim()) params.set('qidiruv', krilldanLotinga(qidiruv.trim()));
    params.set('page', String(page));
    params.set('size', '20');

    const res = await apiGet<Paginated<Foydalanuvchi>>(`/users?${params}`);
    if (res.ok && res.data) {
      setUsers(res.data.items);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
    } else {
      setUsers([]);
      setTotalPages(1);
      setTotal(0);
    }
    setLoading(false);
  }, [rolFilter, holatFilter, qidiruv, page]);

  // Fetch on mount and when filters/page change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── actions ──────────────────────────────────────────────────────
  const tasdiqlash = async (id: number) => {
    const res = await apiPatch(`/users/${id}/tasdiqlash`);
    if (res.ok) {
      fetchUsers();
    } else {
      alert(res.xato || tr('Tasdiqlashda xatolik'));
    }
  };

  const bloklash = async (id: number) => {
    const res = await apiPatch(`/users/${id}/bloklash`);
    if (res.ok) {
      fetchUsers();
    } else {
      alert(res.xato || tr('Bloklashda xatolik'));
    }
  };

  const faollashtirish = async (id: number) => {
    const res = await apiPatch(`/users/${id}/faollashtirish`);
    if (res.ok) {
      fetchUsers();
    } else {
      alert(res.xato || tr('Faollashtirishda xatolik'));
    }
  };

  const ochirish = async (u: Foydalanuvchi) => {
    if (!window.confirm(tr(`${u.full_name} butunlay o'chirilsinmi? Bu amalni orqaga qaytarib bo'lmaydi.`))) {
      return;
    }
    const res = await apiDelete(`/users/${u.id}`);
    if (res.ok) {
      fetchUsers();
    } else {
      alert(res.xato || tr("O'chirishda xatolik"));
    }
  };

  // ── pagination helpers ───────────────────────────────────────────
  const pageNumbers = () => {
    const pages: (number | '...')[] = [];
    const delta = 2;
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages, page + delta);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // ── render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Rol filter */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span className="whitespace-nowrap font-medium">{tr('Rol')}:</span>
              <StatusSelect
                options={[
                  { value: 'xodim', label: tr('Xodim') },
                  { value: 'rahbar', label: tr('Rahbar') },
                  ...(isSuperadmin ? [{ value: 'superadmin', label: tr('Superadmin') }] : []),
                ]}
                value={rolFilter}
                onChange={(v) => { setRolFilter(v); setPage(1); }}
                barchasiLabel={tr('Barcha')}
                className="select sm:!w-[160px]"
              />
            </label>
          </div>

          {/* Holat filter */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span className="whitespace-nowrap font-medium">{tr('Holat')}:</span>
              <StatusSelect
                options={[
                  { value: 'kutilmoqda', label: tr('Kutilmoqda') },
                  { value: 'faol', label: tr('Faol') },
                  { value: 'bloklangan', label: tr('Bloklangan') },
                ]}
                value={holatFilter}
                onChange={(v) => { setHolatFilter(v); setPage(1); }}
                barchasiLabel={tr('Barcha')}
                className="select sm:!w-[160px]"
              />
            </label>
          </div>

          {/* Qidiruv */}
          <div className="min-w-[220px] flex-1">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span className="whitespace-nowrap font-medium">{tr('Qidiruv')}:</span>
              <input
                className="input"
                type="text"
                placeholder={tr("Ism, familiya yoki guvohnoma...")}
                value={qidiruv}
                onChange={(e) => { setQidiruv(e.target.value); setPage(1); }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">{tr("Foydalanuvchilar ro'yxati")}</h2>
          <span className="text-sm text-slate-500">
            {tr('Jami')} <span className="font-semibold tabular-nums text-[#0F2033]">{total}</span> {tr('ta foydalanuvchi')}
          </span>
        </div>
        {loading ? (
          <SkeletonTable rows={8} cols={8} className="border-0 shadow-none" />
        ) : users.length === 0 ? (
          <div className="empty-state">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">{tr('Foydalanuvchilar topilmadi')}</p>
            <p className="mt-1 text-xs text-slate-400">{tr("Filtrlarni o'zgartirib qayta urinib ko'ring")}</p>
          </div>
        ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="table">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="w-10 text-center">#</th>
                <th className="sticky left-0 z-20 bg-white text-left">{tr('F.I.Sh')}</th>
                <th className="text-center">{tr('Guvohnoma')}</th>
                <th className="text-center">{tr('Rol')}</th>
                <th className="text-center">{tr('Holat')}</th>
                <th className="text-center">{tr('Telefon')}</th>
                <th className="text-center">{tr('MFY lar')}</th>
                <th className="min-w-[210px] text-center">{tr('Amallar')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id}>
                  <td className="whitespace-nowrap text-center text-slate-400 tabular-nums">
                    {(page - 1) * 20 + idx + 1}
                  </td>
                  <td className="sticky left-0 z-[5] whitespace-nowrap bg-[var(--bg-surface)] text-left font-medium text-[#0F2033]">
                    {tr(u.full_name)}
                  </td>
                  <td className="whitespace-nowrap text-center text-slate-500">
                    {u.guvohnoma_raqami}
                  </td>
                  <td className="whitespace-nowrap text-center">
                    <span className={rolRangi[u.rol] || 'badge-gray'}>
                      {tr(rolLabels[u.rol] || u.rol)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-center">
                    <span className={holatRangi[u.holat] || 'badge-gray'}>
                      {tr(holatLabels[u.holat] || u.holat)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-center text-slate-500">
                    {u.telefon || '—'}
                  </td>
                  <td className="max-w-[200px] text-center text-slate-500">
                    <span className="block truncate">
                      {u.mfy_biriktirishlar?.length
                        ? u.mfy_biriktirishlar
                            .map((b) => (b.nomi ? tr(b.nomi) : `#${b.mfy_id}`))
                            .join(', ')
                        : '—'}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {/* Tasdiqlash — faqat kutilmoqda */}
                      {u.holat === 'kutilmoqda' && (
                        <button
                          onClick={() => tasdiqlash(u.id)}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          {tr('Tasdiqlash')}
                        </button>
                      )}

                      {/* Bloklash — faol bo'lsa; Faollashtirish — bloklangan bo'lsa (toggle) */}
                      {u.holat === 'faol' && (
                        <button
                          onClick={() => bloklash(u.id)}
                          className="btn-danger px-3 py-1.5 text-xs"
                        >
                          {tr('Bloklash')}
                        </button>
                      )}
                      {u.holat === 'bloklangan' && (
                        <button
                          onClick={() => faollashtirish(u.id)}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          {tr('Faollashtirish')}
                        </button>
                      )}

                      {/* MFY biriktirish */}
                      <button
                        onClick={() => setMfyUser(u)}
                        className="btn-soft px-3 py-1.5 text-xs"
                      >
                        {tr('MFY biriktirish')}
                      </button>

                      {/* Tahrirlash */}
                      <button
                        onClick={() => setTahrirUser(u)}
                        title={tr('Tahrirlash')}
                        aria-label={tr('Tahrirlash')}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* O'chirish */}
                      <button
                        onClick={() => ochirish(u)}
                        title={tr("O'chirish")}
                        aria-label={tr("O'chirish")}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-between">
          <span className="text-sm text-slate-500">
            {total} tadan {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} ko‘rsatilmoqda
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-soft px-3 py-1.5 text-xs"
              aria-label="Oldingi sahifa"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-sm text-slate-400">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                    p === page
                      ? 'btn-primary'
                      : 'btn-soft'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-soft px-3 py-1.5 text-xs"
              aria-label="Keyingi sahifa"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MFY biriktirish modal */}
      {mfyUser && (
        <MfyBiriktirishModal
          user={mfyUser}
          onClose={() => setMfyUser(null)}
          onSaved={fetchUsers}
        />
      )}

      {/* Tahrirlash modal */}
      {tahrirUser && (
        <TahrirlashModal
          user={tahrirUser}
          onClose={() => setTahrirUser(null)}
          onSaved={fetchUsers}
        />
      )}
    </div>
  );
}
