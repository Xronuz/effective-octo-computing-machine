// XAVFSIZ XONADON — Foydalanuvchilar boshqaruvi (rahbar / superadmin)

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/api';
import { useAuth } from '@/auth';
import { SkeletonTable } from '@/components/Skeleton';
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
      alert(res.xato || 'Saqlashda xatolik');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card mx-4 flex max-h-[80vh] w-full max-w-lg flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-[#0F2033]">
            MFY biriktirish — {user.full_name}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — scrollable checkbox list */}
        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-8 text-center text-slate-400">Yuklanmoqda...</div>
          ) : allMfy.length === 0 ? (
            <div className="py-8 text-center text-slate-400">MFY lar topilmadi</div>
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
                  {mfy.raqami}-son — {mfy.nomi}
                </span>
              </label>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>
            Bekor qilish
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving || loading}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── asosiy sahifa ────────────────────────────────────────────────────

export default function BoshqaruvPage() {
  const { isSuperadmin } = useAuth();

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

  // ── fetch users ──────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (rolFilter) params.set('rol', rolFilter);
    if (holatFilter) params.set('holat', holatFilter);
    if (qidiruv.trim()) params.set('qidiruv', qidiruv.trim());
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
      alert(res.xato || 'Tasdiqlashda xatolik');
    }
  };

  const bloklash = async (id: number) => {
    const res = await apiPatch(`/users/${id}/bloklash`);
    if (res.ok) {
      fetchUsers();
    } else {
      alert(res.xato || 'Bloklashda xatolik');
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Rol filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Rol</label>
            <select
              className="select"
              value={rolFilter}
              onChange={(e) => { setRolFilter(e.target.value); setPage(1); }}
            >
              <option value="">Barcha</option>
              <option value="xodim">Xodim</option>
              <option value="rahbar">Rahbar</option>
              {isSuperadmin && <option value="superadmin">Superadmin</option>}
            </select>
          </div>

          {/* Holat filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Holat</label>
            <select
              className="select"
              value={holatFilter}
              onChange={(e) => { setHolatFilter(e.target.value); setPage(1); }}
            >
              <option value="">Barcha</option>
              <option value="kutilmoqda">Kutilmoqda</option>
              <option value="faol">Faol</option>
              <option value="bloklangan">Bloklangan</option>
            </select>
          </div>

          {/* Qidiruv */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Qidiruv</label>
            <input
              className="input"
              type="text"
              placeholder="Ism, familiya yoki guvohnoma..."
              value={qidiruv}
              onChange={(e) => { setQidiruv(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-[#0F2033]">Foydalanuvchilar ro'yxati</h2>
          <span className="text-sm text-slate-500">
            Jami <span className="font-semibold tabular-nums text-[#0F2033]">{total}</span> ta foydalanuvchi
          </span>
        </div>
        {loading ? (
          <SkeletonTable rows={8} cols={8} className="border-0 shadow-none" />
        ) : users.length === 0 ? (
          <div className="empty-state">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Foydalanuvchilar topilmadi</p>
            <p className="mt-1 text-xs text-slate-400">Filtrlarni o'zgartirib qayta urinib ko'ring</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>F.I.Sh</th>
                <th>Guvohnoma</th>
                <th>Rol</th>
                <th>Holat</th>
                <th>Telefon</th>
                <th>MFY lar</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id}>
                  <td className="whitespace-nowrap text-slate-400 tabular-nums">
                    {(page - 1) * 20 + idx + 1}
                  </td>
                  <td className="whitespace-nowrap font-medium text-[#0F2033]">
                    {u.full_name}
                  </td>
                  <td className="whitespace-nowrap text-slate-500">
                    {u.guvohnoma_raqami}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={rolRangi[u.rol] || 'badge-gray'}>
                      {rolLabels[u.rol] || u.rol}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={holatRangi[u.holat] || 'badge-gray'}>
                      {holatLabels[u.holat] || u.holat}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-slate-500">
                    {u.telefon || '—'}
                  </td>
                  <td className="max-w-[200px] text-slate-500">
                    <span className="block truncate">
                      {u.mfy_biriktirishlar?.length
                        ? u.mfy_biriktirishlar
                            .map((b) => b.nomi || `#${b.mfy_id}`)
                            .join(', ')
                        : '—'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {/* Tasdiqlash — only for kutilmoqda */}
                      {u.holat === 'kutilmoqda' && (
                        <button
                          onClick={() => tasdiqlash(u.id)}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          Tasdiqlash
                        </button>
                      )}

                      {/* Bloklash — only for faol */}
                      {u.holat === 'faol' && (
                        <button
                          onClick={() => bloklash(u.id)}
                          className="btn-danger px-3 py-1.5 text-xs"
                        >
                          Bloklash
                        </button>
                      )}

                      {/* MFY biriktirish */}
                      <button
                        onClick={() => setMfyUser(u)}
                        className="btn-soft px-3 py-1.5 text-xs"
                      >
                        MFY biriktirish
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
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {total} tadan {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} ko‘rsatilmoqda
          </span>
          <div className="flex items-center gap-1">
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
    </div>
  );
}
