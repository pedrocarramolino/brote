import { useRef, type ReactNode } from 'react';
import { Activity, CalendarDays, ChartLine, House, ShoppingBasket, Sparkles, UserRound, type LucideIcon } from 'lucide-react';
import { navigate, tabOf, type Route } from '../../lib/router';
import { useSwipeTabs } from '../../hooks/useSwipeTabs';
import { cx } from '../ui/primitives';
import { useStore } from '../../store/AppStore';
import { Logo } from './Logo';

const PRIMARY: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: 'hoy', label: 'Hoy', icon: House },
  { route: 'plan', label: 'Plan', icon: CalendarDays },
  { route: 'progreso', label: 'Progreso', icon: ChartLine },
  { route: 'compra', label: 'Compra', icon: ShoppingBasket },
  { route: 'perfil', label: 'Perfil', icon: UserRound },
];

const SECONDARY: { route: Route; label: string; icon: LucideIcon }[] = [
  { route: 'asistente', label: 'Asistente', icon: Sparkles },
  { route: 'actividad', label: 'Actividad física', icon: Activity },
];

/** En móvil, Asistente y Actividad cuelgan de Perfil; en la barra se resalta Perfil. */
const tabFor = tabOf;

export function AppShell({ route, children }: { route: Route; children: ReactNode }) {
  const { data } = useStore();
  const mainRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  useSwipeTabs(mainRef, pageRef, route);
  return (
    <div className="min-h-dvh lg:flex">
      {/* Barra lateral (escritorio y iPad horizontal) */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line/70 bg-surface/60 px-3 pb-4 pt-6 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <Logo size={30} />
          <span className="text-[19px] font-bold tracking-tight">Brote</span>
        </div>
        <nav aria-label="Secciones principales" className="flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <SideLink key={item.route} {...item} active={route === item.route} />
          ))}
        </nav>
        <p className="mb-1 mt-6 px-3 text-[12px] font-semibold uppercase tracking-wide text-ink3">Más</p>
        <nav aria-label="Secciones secundarias" className="flex flex-col gap-0.5">
          {SECONDARY.map((item) => (
            <SideLink key={item.route} {...item} active={route === item.route} />
          ))}
        </nav>
        <div className="mt-auto px-3 text-[12px] leading-relaxed text-ink3">
          {data?.isDemo ? 'Datos de demostración' : 'Datos guardados en este navegador'}
          <br />
          Brote no sustituye a un dietista-nutricionista.
        </div>
      </aside>

      <main ref={mainRef} id="contenido" className="min-w-0 flex-1 touch-pan-y pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-10">
        <div ref={pageRef} key={route} className="anim-page mx-auto w-full min-w-0 max-w-[1120px] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))] pt-[max(16px,env(safe-area-inset-top))] sm:pl-[max(24px,env(safe-area-inset-left))] sm:pr-[max(24px,env(safe-area-inset-right))] lg:px-10 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Barra de pestañas (móvil y tableta vertical) */}
      {/* Franja opaca bajo la barra de estado: el contenido no se desliza por detrás del notch */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top)] bg-bg lg:hidden" />

      <nav aria-label="Secciones principales" className="material-bar safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/70 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] lg:hidden">
        <ul className="mx-auto flex max-w-xl">
          {PRIMARY.map(({ route: r, label, icon: Icon }) => {
            const active = tabFor(route) === r;
            return (
              <li key={r} className="flex-1">
                <a
                  href={`#/${r}`}
                  aria-current={active ? 'page' : undefined}
                  className={cx('flex h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors', active ? 'text-accent' : 'text-ink3')}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(r);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  <Icon size={24} strokeWidth={active ? 2.3 : 1.8} />
                  <span>{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function SideLink({ route, label, icon: Icon, active }: { route: Route; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <a
      href={`#/${route}`}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        navigate(route);
        window.scrollTo({ top: 0 });
      }}
      className={cx(
        'flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors',
        active ? 'bg-accentSoft text-accent-deep' : 'text-ink2 hover:bg-surface2 hover:text-ink',
      )}
    >
      <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </a>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3 lg:mb-7">
      <div className="min-w-0">
        {eyebrow && <div className="mb-0.5 text-[14px] font-semibold text-ink3">{eyebrow}</div>}
        <h1 className="text-balance break-words text-[28px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[32px] lg:text-[30px]">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[15px] text-ink2">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}
