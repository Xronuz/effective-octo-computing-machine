import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Pencil } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/api';
import { useAuth } from '@/auth';
import { useAlifbo } from '@/alifbo';
import type { MuammoDetail } from '@/types';
import DateInput from '@/components/DateInput';
import StatusSelect from '@/components/StatusSelect';
import { bandlarniParse, bandMatni } from '@/lib/yoriqnoma';

const STATUS_LABEL: Record<string, string> = {
  ochiq: 'Ochiq', jarayonda: 'Jarayonda', yopilgan: 'Yopilgan', qayta_ochilgan: 'Qayta ochilgan',
};
const STATUS_BADGE: Record<string, string> = {
  ochiq: 'badge-blue', jarayonda: 'badge-yellow', yopilgan: 'badge-green', qayta_ochilgan: 'badge-blue',
};
const TURI_LABEL: Record<string, string> = {
  gaz: 'Gaz', elektr: 'Elektr', yongin: "Yong'in", boshqa: 'Boshqa',
};
const XAVF_LABEL: Record<string, string> = {
  past: 'Past', orta: "O'rta", yuqori: 'Yuqori',
};
const XAVF_BADGE: Record<string, string> = {
  past: 'badge-green', orta: 'badge-yellow', yuqori: 'badge-red',
};

// Yo'riqnoma checklist oqimida (turi=null) sarlavha uchun zaxira matn
function turiSarlavha(m: MuammoDetail, tr: (s: string) => string): string {
  if (m.turi) {
    return m.turi_nomi ? tr(m.turi_nomi) : (TURI_LABEL[m.turi] ? tr(TURI_LABEL[m.turi]) : m.turi);
  }
  if (m.tekshiruv_natijasi === 'kira_olmadi') {
    return tr('Tekshiruv — kira olmadi (uyda hech kim yo\'q)');
  }
  const bandlar = bandlarniParse(m.taklif_etilgan_tadbirlar);
  return bandlar.length > 0 ? tr('Tekshiruv — muammo aniqlandi') : tr("Tekshiruv — muammo yo'q");
}

export default function MuammoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isRahbar, isSuperadmin, user } = useAuth();
  const { tr } = useAlifbo();

  const [muammo, setMuammo] = useState<MuammoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Update form
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editXavf, setEditXavf] = useState('');
  const [editMuddat, setEditMuddat] = useState('');
  const [editTashkilot, setEditTashkilot] = useState('');
  const [editOrnida, setEditOrnida] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Close form
  const [showClose, setShowClose] = useState(false);
  const [closeOrnida, setCloseOrnida] = useState(true);
  const [closeIzoh, setCloseIzoh] = useState('');
  const [closing, setClosing] = useState(false);

  const fetchMuammo = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const res = await apiGet<MuammoDetail>(`/muammolar/${id}`);
    if (!res.ok) {
      if (res.xato?.includes('topilmadi') || (res as any).status === 404) {
        setNotFound(true);
      } else {
        setError(res.xato || tr("Ma'lumotlarni yuklashda xatolik"));
      }
    } else {
      setMuammo(res.data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMuammo(); }, [id]);

  const startEdit = () => {
    if (!muammo) return;
    setEditStatus(muammo.status);
    setEditXavf(muammo.xavf);
    setEditMuddat(muammo.muddat || '');
    setEditTashkilot(muammo.tashkilot || '');
    setEditOrnida(muammo.ornida_bartaraf);
    setEditing(true);
    setEditError('');
  };

  const handleUpdate = async () => {
    if (!muammo) return;
    setSaving(true);
    setEditError('');
    const res = await apiPatch<MuammoDetail>(`/muammolar/${muammo.id}`, {
      status: editStatus,
      xavf: editXavf,
      muddat: editMuddat || null,
      tashkilot: editTashkilot || null,
      ornida_bartaraf: editOrnida,
    });
    setSaving(false);
    if (res.ok) {
      setMuammo(res.data);
      setEditing(false);
    } else {
      setEditError(res.xato || tr('Yangilashda xatolik'));
    }
  };

  const handleClose = async () => {
    if (!muammo) return;
    setClosing(true);
    const res = await apiPost<MuammoDetail>(`/muammolar/${muammo.id}/yop`, {
      ornida_bartaraf: closeOrnida,
      tavsif: closeIzoh || undefined,
    });
    setClosing(false);
    if (res.ok) {
      setMuammo(res.data);
      setShowClose(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-sm text-slate-400">{tr('Yuklanmoqda...')}</div>;
  if (notFound) {
    return (
      <div className="empty-state card">
        <p className="text-lg font-medium text-slate-600">{tr('Muammo topilmadi')}</p>
        <Link to="/muammolar" className="btn-soft mt-4">{tr("Ro'yxatga qaytish")}</Link>
      </div>
    );
  }
  if (error) return <div className="p-12 text-center text-[#C0392B]">{error}</div>;
  if (!muammo) return null;

  const canEdit = isRahbar || isSuperadmin;
  const canClose = muammo.status !== 'yopilgan';
  const isAssigned = user?.id === muammo.xodim_id;

  // Oldin / keyin fotolar — TZ bo'yicha yonma-yon taqqoslash
  const oldinFotolar = muammo.fotolar.filter((f) => f.turi === 'oldin');
  const keyinFotolar = muammo.fotolar.filter((f) => f.turi === 'keyin');
  const boshqaFotolar = muammo.fotolar.filter((f) => f.turi !== 'oldin' && f.turi !== 'keyin');

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/muammolar"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-[#0F2033]"
      >
        <ArrowLeft className="h-4 w-4" />
        {tr("Muammolar ro'yxatiga qaytish")}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-[#0F2033] sm:text-2xl">
          {turiSarlavha(muammo, tr)} — {muammo.xonadon_manzili ? tr(muammo.xonadon_manzili) : `${tr('Xonadon')} #${muammo.xonadon_id}`}
        </h1>
        <div className="flex items-center gap-3">
          <span className={STATUS_BADGE[muammo.status] || 'badge-gray'}>{STATUS_LABEL[muammo.status] ? tr(STATUS_LABEL[muammo.status]) : muammo.status}</span>
          {muammo.shubhali && <span className="badge-purple">{tr('Shubhali')}</span>}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card space-y-4 p-6">
          <h3 className="text-base font-semibold text-[#0F2033]">{tr("Ma'lumotlarni yangilash")}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Holat')}</label>
              <StatusSelect
                options={[
                  { value: 'ochiq', label: tr('Ochiq') },
                  { value: 'jarayonda', label: tr('Jarayonda') },
                  { value: 'yopilgan', label: tr('Yopilgan') },
                ]}
                value={editStatus}
                onChange={setEditStatus}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Xavf darajasi')}</label>
              <StatusSelect
                options={[
                  { value: 'past', label: tr('Past') },
                  { value: 'orta', label: tr("O'rta") },
                  { value: 'yuqori', label: tr('Yuqori') },
                ]}
                value={editXavf}
                onChange={setEditXavf}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Muddat')}</label>
              <DateInput className="input" value={editMuddat} onChange={setEditMuddat} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Tashkilot')}</label>
              <input className="input" value={editTashkilot} onChange={e => setEditTashkilot(e.target.value)} placeholder={tr('Tashkilot nomi...')} />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={editOrnida} onChange={e => setEditOrnida(e.target.checked)} className="rounded" />
            <span className="text-sm">{tr("O'rnida bartaraf etilgan")}</span>
          </label>
          {editError && <p className="text-sm text-[#C0392B]">{editError}</p>}
          <div className="flex gap-3">
            <button onClick={handleUpdate} disabled={saving} className="btn-primary">{saving ? tr('Saqlanmoqda...') : tr('Saqlash')}</button>
            <button onClick={() => setEditing(false)} className="btn-ghost">{tr('Bekor qilish')}</button>
          </div>
        </div>
      )}

      {/* Close form */}
      {showClose && (
        <div className="card space-y-4 border-2 border-[#2E9E6B]/40 p-6">
          <h3 className="text-base font-semibold text-[#2E9E6B]">{tr('Muammoni yopish')}</h3>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={closeOrnida} onChange={e => setCloseOrnida(e.target.checked)} className="rounded" />
            <span className="text-sm font-medium">{tr("O'rnida bartaraf etilgan")}</span>
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{tr('Izoh')}</label>
            <textarea className="input" rows={2} value={closeIzoh} onChange={e => setCloseIzoh(e.target.value)} placeholder={tr('Yopish izohi...')} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleClose} disabled={closing} className="btn-primary">{closing ? tr('Yopilmoqda...') : tr('Yopish')}</button>
            <button onClick={() => setShowClose(false)} className="btn-ghost">{tr('Bekor qilish')}</button>
          </div>
        </div>
      )}

      {/* Detail cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Asosiy ma'lumot */}
        <div className="card space-y-4 p-6">
          <h3 className="text-base font-semibold text-[#0F2033]">{tr("Asosiy ma'lumot")}</h3>
          <div className="space-y-3">
            <Row label="Turi" value={turiSarlavha(muammo, tr)} />
            {muammo.turi && (
              <Row label="Xavf darajasi">
                <span className={XAVF_BADGE[muammo.xavf] || 'badge-gray'}>{XAVF_LABEL[muammo.xavf] ? tr(XAVF_LABEL[muammo.xavf]) : muammo.xavf}</span>
              </Row>
            )}
            <Row label="Status" value={STATUS_LABEL[muammo.status] ? tr(STATUS_LABEL[muammo.status]) : muammo.status} />
            <Row label="O'rnida bartaraf" value={muammo.ornida_bartaraf ? tr('Ha') : tr("Yo'q")} />
            {muammo.yoriqnomadan_otkanlar_soni != null && (
              <Row label="Yo'riqnomadan o'tkanlar soni" value={String(muammo.yoriqnomadan_otkanlar_soni)} />
            )}
            {muammo.muddat && (
              <Row label="Muddat" value={
                <span>{tr(new Date(muammo.muddat).toLocaleDateString('uz-UZ'))} {muammo.muddat_qolgan_kun != null && (
                  <span className={muammo.muddat_qolgan_kun < 0 ? 'ml-1 text-[#C0392B]' : muammo.muddat_qolgan_kun < 3 ? 'ml-1 text-[#D9A441]' : 'ml-1 text-[#2E9E6B]'}>
                    ({muammo.muddat_qolgan_kun < 0 ? `${Math.abs(muammo.muddat_qolgan_kun)} ${tr("kun o'tgan")}` : `${muammo.muddat_qolgan_kun} ${tr('kun qolgan')}`})
                  </span>
                )}</span>
              } />
            )}
            {muammo.tashkilot && <Row label="Tashkilot" value={tr(muammo.tashkilot)} />}
            {muammo.yopilgan_sana && <Row label="Yopilgan sana" value={tr(new Date(muammo.yopilgan_sana).toLocaleDateString('uz-UZ'))} />}
            <Row label="Yaratilgan" value={tr(new Date(muammo.sinxron_vaqti).toLocaleString('uz-UZ'))} />
          </div>
        </div>

        {/* Bog'langanlar */}
        <div className="card space-y-4 p-6">
          <h3 className="text-base font-semibold text-[#0F2033]">{tr("Bog'langanlar")}</h3>
          <div className="space-y-3">
            <Row label="Xonadon" value={<Link to={`/xonadonlar/${muammo.xonadon_id}`} className="text-[#3D6FB4] hover:underline">{muammo.xonadon_manzili ? tr(muammo.xonadon_manzili) : `#${muammo.xonadon_id}`}</Link>} />
            <Row label="Xodim" value={muammo.xodim_fio ? tr(muammo.xodim_fio) : `#${muammo.xodim_id}`} />
            {muammo.lat !== 0 && muammo.lng !== 0 && (
              <Row label="GPS" value={`${muammo.lat.toFixed(6)}, ${muammo.lng.toFixed(6)}`} />
            )}
            {muammo.gps_aniqlik != null && <Row label="GPS aniqlik" value={`${muammo.gps_aniqlik}m`} />}
            {muammo.mock_gps && <Row label="Mock GPS" value={<span className="badge-yellow">Mock</span>} />}
            <Row label="Qurilma vaqti" value={tr(new Date(muammo.qurilma_vaqti).toLocaleString('uz-UZ'))} />
            <Row label="Sinxron vaqti" value={tr(new Date(muammo.sinxron_vaqti).toLocaleString('uz-UZ'))} />
          </div>
        </div>
      </div>

      {/* Aniqlangan kamchiliklar (yo'riqnoma bandlari) */}
      {muammo.taklif_etilgan_tadbirlar && (
        <div className="card p-6">
          <h3 className="mb-3 text-base font-semibold text-[#0F2033]">
            {tr("Aniqlangan kamchiliklar (yo'riqnoma bandlari)")}
          </h3>
          <ul className="space-y-2">
            {bandlarniParse(muammo.taklif_etilgan_tadbirlar).map((bandId) => (
              <li key={bandId} className="flex gap-2 text-sm text-slate-600">
                <span className="shrink-0 font-semibold text-[#0F2033]">{bandId}.</span>
                <span>{tr(bandMatni(bandId))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tavsif */}
      {muammo.tavsif && (
        <div className="card p-6">
          <h3 className="mb-2 text-base font-semibold text-[#0F2033]">{tr('Tavsif')}</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{tr(muammo.tavsif)}</p>
        </div>
      )}

      {/* Fotolar — oldin / keyin yonma-yon */}
      {muammo.fotolar.length > 0 && (
        <div className="card p-6">
          <h3 className="mb-4 text-base font-semibold text-[#0F2033]">
            {tr('Fotolar')} <span className="tabular-nums text-slate-400">({muammo.fotolar.length})</span>
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FotoBlok sarlavha="Oldin" fotolar={oldinFotolar} />
            <FotoBlok sarlavha="Keyin" fotolar={keyinFotolar} />
          </div>
          {boshqaFotolar.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {boshqaFotolar.map((f) => (
                <img
                  key={f.id}
                  src={f.url}
                  alt={f.turi}
                  className="h-40 w-full rounded-xl border border-slate-200 object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canEdit && !editing && (
          <button onClick={startEdit} className="btn-soft gap-2">
            <Pencil className="h-4 w-4" />
            {tr('Tahrirlash')}
          </button>
        )}
        {canClose && (canEdit || isAssigned) && !showClose && (
          <button onClick={() => setShowClose(true)} className="btn-primary gap-2">
            <Check className="h-4 w-4" />
            {tr('Yopish')}
          </button>
        )}
      </div>
    </div>
  );
}

function FotoBlok({ sarlavha, fotolar }: { sarlavha: string; fotolar: MuammoDetail['fotolar'] }) {
  const { tr } = useAlifbo();
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-3 text-sm font-semibold text-[#0F2033]">{tr(sarlavha)}</p>
      {fotolar.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg bg-slate-50 text-slate-400">
          <Camera className="h-6 w-6" />
          <span className="mt-1.5 text-xs">{tr('Foto mavjud emas')}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {fotolar.map((f) => (
            <img
              key={f.id}
              src={f.url}
              alt={`${tr(sarlavha)} ${tr('foto')}`}
              className="h-40 w-full rounded-lg border border-slate-200 object-cover"
              loading="lazy"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  const { tr } = useAlifbo();
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-sm text-slate-500">{tr(label)}</span>
      <span className="text-right text-sm font-medium text-[#0F2033]">{children ?? value ?? '—'}</span>
    </div>
  );
}
