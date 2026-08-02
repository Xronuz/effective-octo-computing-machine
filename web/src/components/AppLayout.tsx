// XAVFSIZ XONADON — App shell layout
// Floating navy pill sidebar (yig'iq/kengayuvchan) + yuqori header panel.

import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  AlertTriangle,
  MapPin,
  Map,
  Users,
  BarChart3,
  ClipboardList,
  Scale,
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/auth';
import { useAlifbo } from '@/alifbo';
import GlobalSearch from '@/components/GlobalSearch';
import ProfilSozlamalariModal from '@/components/ProfilSozlamalariModal';
import fvvIcon from '@/styles/fvv-icon.png';

const ICON_PROPS = { size: 20, strokeWidth: 1.8 } as const;

const navItems = [
  { to: '/', label: 'Asosiy', icon: LayoutDashboard },
  { to: '/xonadonlar', label: 'Xonadonlar', icon: Home },
  { to: '/muammolar', label: 'Tashriflar', icon: AlertTriangle },
  { to: '/hudud', label: 'Hudud', icon: MapPin },
  { to: '/xarita', label: 'Xarita', icon: Map },
];

const adminNavItems = [
  { to: '/boshqaruv', label: 'Boshqaruv', icon: Users },
  { to: '/analitika', label: 'Analitika', icon: BarChart3 },
  { to: '/topshiriq', label: 'Topshiriqlar', icon: ClipboardList },
  { to: '/intizom', label: 'Intizom', icon: Scale },
];

const ROL_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  rahbar: 'Rahbar',
  xodim: 'Xodim',
};

/** Route'dan sahifa sarlavhasi (eng uzun mos prefix) */
function pageTitle(pathname: string): string {
  const all = [...navItems, ...adminNavItems];
  const match = all
    .filter((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? 'Asosiy';
}

/** Bundan tor ekranlarda (noutbuk/proyektor, 1024-1440px) sidebar avtomatik
 *  yig'iladi — jadval ustunlari sig'ishi uchun kontentga ko'proq joy beradi. */
const SIDEBAR_AUTOYIGISH_KENGLIK = 1440;

export function AppLayout() {
  const { user, logout, isRahbar } = useAuth();
  const { krill, setKrill, tr } = useAlifbo();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= SIDEBAR_AUTOYIGISH_KENGLIK,
  );
  // Foydalanuvchi qo'lda tugma bosgach, keyingi resize'lar uni avtomatik qayta ochib/yopib qo'ymasligi kerak
  const qoldaOzgartirildi = useRef(false);

  const [profilMenuOpen, setProfilMenuOpen] = useState(false);
  const [profilModalOpen, setProfilModalOpen] = useState(false);
  const profilMenuRef = useRef<HTMLDivElement>(null);

  // Profil menyu tashqarisiga bosilsa yopiladi
  useEffect(() => {
    if (!profilMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profilMenuRef.current && !profilMenuRef.current.contains(e.target as Node)) {
        setProfilMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [profilMenuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (qoldaOzgartirildi.current) return;
      setExpanded(window.innerWidth >= SIDEBAR_AUTOYIGISH_KENGLIK);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleExpanded = () => {
    qoldaOzgartirildi.current = true;
    setExpanded((v) => !v);
  };

  const handleLogout = () => {
    if (!window.confirm(tr('Rostdan ham tizimdan chiqmoqchimisiz?'))) return;
    logout();
    navigate('/kirish');
  };

  /** Header search pill → mount qilingan GlobalSearch modalini ochadi (Cmd/Ctrl+K) */
  const openGlobalSearch = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }),
    );
  };

  const initials = user ? tr(`${user.ism?.[0] ?? ''}${user.familiya?.[0] ?? ''}`.toUpperCase()) : '';
  const profilFoto = user?.profil_foto_url ?? null;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
      expanded ? '' : 'justify-center px-0'
    } ${
      isActive
        ? 'bg-[var(--accent-soft)] text-white'
        : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
    }`;

  const renderNav = (items: typeof navItems) =>
    items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/'}
        className={navLinkClass}
        title={expanded ? undefined : tr(item.label)}
      >
        <item.icon {...ICON_PROPS} className="flex-shrink-0" />
        {expanded && <span className="truncate">{tr(item.label)}</span>}
      </NavLink>
    ));

  const mobilItems = [
    ...navItems,
    ...(isRahbar ? adminNavItems : []),
  ];

  const navContent = (
    <>
      {renderNav(navItems)}
      {isRahbar && (
        <>
          <div className="mx-2 my-3 border-t border-white/[0.08]" aria-hidden />
          {renderNav(adminNavItems)}
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen">
      {/* ── Floating pill sidebar (desktop) ─────────────────────── */}
      <aside
        className={`fixed left-4 top-4 z-40 hidden lg:flex flex-col bg-navy-900 shadow-lift transition-[width] duration-[250ms] ease-in-out ${
          expanded ? 'w-[248px]' : 'w-[76px]'
        }`}
        style={{ height: 'calc(100vh - 32px)', borderRadius: 28 }}
        aria-label="Asosiy navigatsiya"
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-3 pt-6 pb-5 ${expanded ? 'px-5' : 'justify-center px-0'}`}
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <img
              src={fvvIcon}
              alt="FVV"
              className="h-10 w-10 object-contain"
              draggable={false}
            />
          </span>
          {expanded && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold leading-tight tracking-wide text-white">
                {tr('XAVFSIZ XONADON')}
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                {tr('FVV monitoring')}
              </span>
            </span>
          )}
        </div>

        {/* Nav — yig'iq holatda ikonkalar pill bo'yicha vertikal markazda.
            my-auto (justify-center EMAS): kontent sig'hmaganda yuqori ikonkalar
            kesilib qolmaydi, nav yuqoridan boshlab scroll bo'ladi.
            Scrollbar yashiringan — Windows'da tor pill ichida chizilib ketmasligi uchun. */}
        <nav
          className={`flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            expanded ? 'space-y-1' : 'flex flex-col'
          }`}
        >
          {expanded ? (
            navContent
          ) : (
            <div className="my-auto space-y-1">{navContent}</div>
          )}
        </nav>

        {/* Pastki qism: kengaytirish + chiqish */}
        <div className="space-y-1 px-3 pb-5 pt-2">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={expanded ? "Yig'ish" : 'Kengaytirish'}
            className={`flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-white/60 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white ${
              expanded ? '' : 'justify-center px-0'
            }`}
          >
            {expanded ? (
              <ChevronLeft {...ICON_PROPS} className="flex-shrink-0" />
            ) : (
              <ChevronRight {...ICON_PROPS} className="flex-shrink-0" />
            )}
            {expanded && <span>{tr("Yig'ish")}</span>}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title={expanded ? undefined : tr('Chiqish')}
            className={`flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-white/60 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white ${
              expanded ? '' : 'justify-center px-0'
            }`}
          >
            <LogOut {...ICON_PROPS} className="flex-shrink-0" />
            {expanded && <span>{tr('Chiqish')}</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobil pastki navigatsiya (<lg) ──────────────────────── */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-full bg-navy-900 px-2 py-2 shadow-lift lg:hidden"
        aria-label="Mobil navigatsiya"
      >
        {mobilItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={tr(item.label)}
            className={({ isActive }) =>
              `flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 ${
                isActive ? 'bg-[var(--accent-soft)] text-white' : 'text-white/60'
              }`
            }
          >
            <item.icon {...ICON_PROPS} />
          </NavLink>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          title={tr('Chiqish')}
          aria-label={tr('Chiqish')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition-colors duration-150"
        >
          <LogOut {...ICON_PROPS} />
        </button>
      </nav>

      {/* ── Asosiy kontent ──────────────────────────────────────── */}
      <div
        className={`min-h-screen transition-[padding] duration-[250ms] ease-in-out ${
          expanded ? 'lg:pl-[280px]' : 'lg:pl-[108px]'
        }`}
      >
        {/* Header — floating pill (andozadagidek ajratilgan) */}
        <header className="sticky top-4 z-30 mx-auto mt-4 max-w-[1440px] px-6">
          <div className="flex h-16 items-center gap-4 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-5 shadow-lift">
            <h1 className="min-w-0 flex-shrink-0 truncate text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              {tr(pageTitle(location.pathname))}
            </h1>

            {/* Search pill */}
            <div className="flex flex-1 justify-center px-2">
              <button
                type="button"
                onClick={openGlobalSearch}
                className="flex w-full max-w-md items-center gap-2.5 rounded-full bg-[var(--bg-subtle)] px-4 py-2 text-sm text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--border)]"
              >
                <Search size={16} strokeWidth={1.8} />
                <span className="flex-1 truncate text-left">{tr('Qidirish...')}</span>
                <kbd className="hidden rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] sm:inline-block">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* O'ng tomon: alifbo + bell + user chip */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {/* Alifbo tanlovi: lotin / krill */}
              <div
                className="flex items-center rounded-full bg-[var(--bg-subtle)] p-1"
                role="group"
                aria-label="Alifbo tanlovi"
              >
                {(['lotin', 'krill'] as const).map((rejim) => {
                  const faol = rejim === 'krill' ? krill : !krill;
                  return (
                    <button
                      key={rejim}
                      type="button"
                      onClick={() => setKrill(rejim === 'krill')}
                      title={rejim === 'krill' ? 'Кирилл' : 'Lotin'}
                      aria-pressed={faol}
                      className={`flex h-8 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors duration-150 ${
                        faol
                          ? 'bg-navy-800 text-white shadow-sm'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {rejim === 'krill' ? 'Уз' : "O'z"}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Bildirishnomalar"
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
              >
                <Bell size={18} strokeWidth={1.8} />
              </button>

              <div className="relative" ref={profilMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfilMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={profilMenuOpen}
                  className="flex items-center gap-2.5 rounded-full bg-[var(--bg-subtle)] py-1 pl-1 pr-3 transition-colors duration-150 hover:bg-[var(--border)]"
                >
                  {profilFoto ? (
                    <img
                      src={profilFoto}
                      alt={user?.full_name ? tr(user.full_name) : ''}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-[11px] font-semibold text-white">
                      {initials}
                    </span>
                  )}
                  <span className="hidden min-w-0 leading-tight sm:block">
                    <span className="block max-w-[140px] truncate text-[13px] font-medium text-[var(--text-primary)]">
                      {user?.full_name ? tr(user.full_name) : ''}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      {tr(ROL_LABELS[user?.rol ?? ''] ?? user?.rol ?? '')}
                    </span>
                  </span>
                  <ChevronDown size={14} className="hidden flex-shrink-0 text-[var(--text-muted)] sm:block" />
                </button>

                {profilMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-40 w-52 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] py-1.5 shadow-lift"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfilMenuOpen(false);
                        setProfilModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <UserRound size={16} strokeWidth={1.8} />
                      {tr('Mening profilim')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfilMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} strokeWidth={1.8} />
                      {tr('Chiqish')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Sahifa kontenti */}
        <main className="mx-auto max-w-[1440px] p-4 pb-24 2xl:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Global qidiruv (Cmd/Ctrl+K) */}
      <GlobalSearch />

      {/* Profil sozlamalari modali */}
      <ProfilSozlamalariModal open={profilModalOpen} onClose={() => setProfilModalOpen(false)} />
    </div>
  );
}
