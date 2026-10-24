import { useEffect, useRef, type RefObject } from 'react';
import { navigate, TAB_ORDER, tabOf, type Route } from '../lib/router';

/**
 * Gesto horizontal para cambiar de categoría (Hoy ⇄ Plan ⇄ Progreso ⇄ Compra ⇄ Perfil).
 *
 * - Solo responde a toques (no ratón) y nunca llama a preventDefault: la superficie usa
 *   `touch-action: pan-y`, así el navegador sigue gestionando el scroll vertical y nos cede
 *   el eje horizontal. Si el usuario empieza a desplazarse en vertical, el navegador emite
 *   `pointercancel` y el gesto se descarta.
 * - Ignora toques que empiezan junto a los bordes (reservados al gesto atrás de iOS), en
 *   controles de formulario, dentro de elementos con desplazamiento horizontal propio,
 *   en gráficos ([data-no-swipe]) o con una hoja modal abierta.
 * - Cambia de sección al superar ~22 % del ancho o con un movimiento rápido; si no, vuelve.
 */
export function useSwipeTabs(surface: RefObject<HTMLElement>, content: RefObject<HTMLElement>, route: Route) {
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let start: { x: number; y: number; t: number; id: number } | null = null;
    let locked: 'h' | 'v' | null = null;
    let dx = 0;

    const target = () => content.current;
    const neighbors = () => {
      const i = TAB_ORDER.indexOf(tabOf(routeRef.current));
      return { prev: i > 0 ? TAB_ORDER[i - 1] : null, next: i < TAB_ORDER.length - 1 ? TAB_ORDER[i + 1] : null };
    };
    const setX = (x: number, animate: boolean) => {
      const c = target();
      if (!c) return;
      c.style.transition = animate ? 'transform .25s cubic-bezier(.2,.8,.2,1), opacity .25s' : 'none';
      c.style.transform = x ? `translate3d(${x}px,0,0)` : '';
      c.style.opacity = x ? String(Math.max(0.6, 1 - Math.abs(x) / 900)) : '';
    };
    const ignoreTarget = (t: EventTarget | null, x: number) => {
      if (!(t instanceof Element)) return true;
      if (document.body.style.overflow === 'hidden') return true; // hoja modal abierta
      if (x < 20 || x > window.innerWidth - 20) return true; // bordes del sistema
      if (t.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [data-no-swipe]')) return true;
      for (let e: Element | null = t; e && e !== el; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (/(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1) return true;
      }
      return false;
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !e.isPrimary || ignoreTarget(e.target, e.clientX)) return;
      start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      locked = null;
      dx = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const mx = e.clientX - start.x;
      const my = e.clientY - start.y;
      if (!locked) {
        if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) locked = 'v';
        else if (Math.abs(mx) > 14 && Math.abs(mx) > Math.abs(my) * 1.4) locked = 'h';
      }
      if (locked === 'v') {
        start = null;
        return;
      }
      if (locked === 'h') {
        const { prev, next } = neighbors();
        const blocked = (mx > 0 && !prev) || (mx < 0 && !next);
        dx = blocked ? mx * 0.18 : mx * 0.55; // resistencia en los extremos
        if (!reduced.matches) setX(dx, false);
      }
    };
    const finish = (e: PointerEvent, cancelled: boolean) => {
      if (!start || e.pointerId !== start.id) return;
      const mx = e.clientX - start.x;
      const dt = Math.max(1, performance.now() - start.t);
      const wasH = locked === 'h';
      start = null;
      locked = null;
      if (!wasH || cancelled) {
        setX(0, true);
        return;
      }
      const { prev, next } = neighbors();
      const fast = Math.abs(mx) > 40 && Math.abs(mx) / dt > 0.45;
      const far = Math.abs(mx) > Math.max(70, window.innerWidth * 0.22);
      const dest = mx < 0 ? next : prev;
      if ((fast || far) && dest) {
        // La nueva sección entra desde el lado hacia el que se desliza
        document.documentElement.dataset.swipeEnter = mx < 0 ? 'from-right' : 'from-left';
        window.setTimeout(() => delete document.documentElement.dataset.swipeEnter, 450);
        setX(0, false);
        navigate(dest);
        window.scrollTo({ top: 0 });
      } else {
        setX(0, true);
      }
    };
    const onUp = (e: PointerEvent) => finish(e, false);
    const onCancel = (e: PointerEvent) => finish(e, true);

    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerup', onUp, { passive: true });
    el.addEventListener('pointercancel', onCancel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
    };
  }, [surface, content]);
}
