import { AlertCircle, CheckCircle2, DoorClosed } from 'lucide-react';
import { useAlifbo } from '@/alifbo';
import type { TekshiruvNatijasi } from '@/types';

const CONFIG: Record<
  TekshiruvNatijasi,
  { label: string; qisqa: string; cls: string; Icon: typeof AlertCircle }
> = {
  muammo_topildi: {
    label: 'Muammo topildi',
    qisqa: 'Muammoli',
    cls: 'badge-red',
    Icon: AlertCircle,
  },
  muammo_yoq: {
    label: 'Muammo topilmadi',
    qisqa: 'Muammosiz',
    cls: 'badge-green',
    Icon: CheckCircle2,
  },
  kira_olmadi: {
    label: 'Kira olmadi',
    qisqa: 'Kira olmadi',
    cls: 'badge-yellow',
    Icon: DoorClosed,
  },
};

/**
 * Tashrif natijasi belgisi. Ro'yxatlarda natijani darhol ko'rsatadi —
 * avval buni bilish uchun har bir yozuvni ochib o'qish kerak edi.
 */
export default function NatijaBadge({
  natija,
  qisqa = false,
}: {
  natija: string | null | undefined;
  /** Jadval ustunlari uchun qisqaroq matn. */
  qisqa?: boolean;
}) {
  const { tr } = useAlifbo();
  const conf = natija ? CONFIG[natija as TekshiruvNatijasi] : undefined;
  if (!conf) return <span className="text-slate-400">—</span>;

  const { Icon } = conf;
  return (
    <span className={conf.cls}>
      <Icon className="h-3.5 w-3.5" />
      {tr(qisqa ? conf.qisqa : conf.label)}
    </span>
  );
}

export { CONFIG as NATIJA_CONFIG };
