import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ClipboardCopy, Info, Plus, RotateCcw, ShoppingBasket, Trash2 } from 'lucide-react';
import type { ShopCategory } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Badge, Button, Card, EmptyState, IconButton, ProgressBar, SelectField, TextField, Toggle, cx } from '../components/ui/primitives';
import { Sheet } from '../components/ui/Sheet';
import { MoreMenu } from '../components/ui/Menu';
import { useFeedback } from '../components/ui/Feedback';
import { useData, useStore, useWeek } from '../store/AppStore';
import { addDays, formatWeekRange, startOfWeek, todayISO } from '../lib/dates';
import { uid } from '../lib/format';
import { navigate } from '../lib/router';
import { buildShoppingList, emptyOverrides, type ShoppingItem } from '../services/shopping';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../data/foods';

export function ShoppingPage({ weekParam }: { weekParam: string | null }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast, confirm } = useFeedback();
  const monday = startOfWeek(weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : todayISO());
  useWeek(monday); // garantiza que exista el menú de esa semana
  const list = buildShoppingList(data, monday);
  const [storeMode, setStoreMode] = useState(false);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [adding, setAdding] = useState(false);

  const setOv = (fn: (o: ReturnType<typeof emptyOverrides>) => void) =>
    mutate((d) => {
      d.shopping[monday] ??= emptyOverrides();
      fn(d.shopping[monday]);
    });

  const toggle = (item: ShoppingItem) =>
    setOv((o) => {
      if (item.manual) {
        const m = o.manual.find((x) => x.id === item.key);
        if (m) m.checked = !m.checked;
      } else o.checked[item.key] = !item.checked;
    });

  const remove = (item: ShoppingItem) => {
    setOv((o) => {
      if (item.manual) o.manual = o.manual.filter((x) => x.id !== item.key);
      else o.removed[item.key] = true;
    });
    toast(`${item.name} eliminado`, {
      action: {
        label: 'Deshacer',
        onClick: () =>
          setOv((o) => {
            if (item.manual) o.manual.push({ id: item.key, name: item.name, qty: item.qty, category: item.category, checked: item.checked });
            else delete o.removed[item.key];
          }),
      },
    });
  };

  const copy = async () => {
    const text = list.groups
      .map((g) => `${CATEGORY_LABELS[g.category]}\n${g.items.filter((i) => !i.checked).map((i) => `• ${i.name} — ${i.qty}`).join('\n')}`)
      .filter((s) => s.includes('•'))
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(`Lista de la compra · ${formatWeekRange(monday)}\n\n${text}`);
      toast('Lista copiada al portapapeles');
    } catch {
      toast('No se ha podido copiar en este navegador', { tone: 'info' });
    }
  };

  const reset = async () => {
    const ok = await confirm({
      title: '¿Restablecer la lista?',
      message: 'Se perderán los productos añadidos a mano, las cantidades editadas y las marcas de comprado de esta semana.',
      confirmLabel: 'Restablecer',
      destructive: true,
    });
    if (!ok) return;
    mutate((d) => void delete d.shopping[monday]);
    toast('Lista restablecida desde el menú');
  };

  const removedCount = Object.keys(data.shopping[monday]?.removed ?? {}).length;
  const visibleGroups = storeMode
    ? list.groups.map((g) => ({ ...g, items: [...g.items].sort((a, b) => Number(a.checked) - Number(b.checked)) }))
    : list.groups;

  return (
    <>
      <PageHeader
        title="Compra"
        subtitle={`Generada desde el menú · ${formatWeekRange(monday)}`}
        actions={
          <>
            <IconButton label="Añadir producto" variant="primary" onClick={() => setAdding(true)}>
              <Plus size={22} />
            </IconButton>
            <MoreMenu
              items={[
                { label: 'Copiar lista', icon: <ClipboardCopy size={18} />, onSelect: copy },
                { label: 'Desmarcar todo', icon: <Check size={18} />, onSelect: () => setOv((o) => { o.checked = {}; o.manual.forEach((m) => (m.checked = false)); }) },
                { label: 'Restablecer lista', icon: <RotateCcw size={18} />, onSelect: reset, destructive: true },
              ]}
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 lg:order-2">
          <Card className="p-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-2">
              <IconButton label="Semana anterior" onClick={() => navigate('compra', { w: addDays(monday, -7) })}><ChevronLeft size={20} /></IconButton>
              <div className="text-center">
                <p className="text-[15px] font-bold">{formatWeekRange(monday)}</p>
                {monday !== startOfWeek(todayISO()) && <button type="button" className="text-[13px] font-semibold text-accent" onClick={() => navigate('compra')}>Esta semana</button>}
              </div>
              <IconButton label="Semana siguiente" onClick={() => navigate('compra', { w: addDays(monday, 7) })}><ChevronRight size={20} /></IconButton>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between text-[14px]">
                <span className="font-semibold">{list.done} de {list.total} comprados</span>
                <span className="tabular text-ink2">{list.total ? Math.round((list.done / list.total) * 100) : 0} %</span>
              </div>
              <ProgressBar value={list.done} max={Math.max(list.total, 1)} label="Productos comprados" />
            </div>
            <div className="mt-2 border-t border-line/60 pt-1">
              <Toggle checked={storeMode} onChange={setStoreMode} label="Modo tienda" description="Filas más grandes y lo ya comprado al final de cada sección." />
            </div>
            {removedCount > 0 && (
              <button type="button" className="mt-1 text-[13px] font-semibold text-accent" onClick={() => setOv((o) => (o.removed = {}))}>
                Recuperar {removedCount} producto(s) eliminado(s)
              </button>
            )}
          </Card>
        </div>

        <div className="min-w-0 lg:order-1">
          {list.freeDishes.length > 0 && (
            <p className="mb-4 flex items-start gap-2 rounded-[14px] bg-surface2 px-3.5 py-2.5 text-[13px] text-ink2">
              <Info size={16} className="mt-[1px] shrink-0" />
              Platos libres sin ingredientes en la lista: {list.freeDishes.join(', ')}. Añade lo que necesites a mano.
            </p>
          )}
          {list.total === 0 ? (
            <Card>
              <EmptyState icon={<ShoppingBasket size={24} />} title="Lista vacía" action={<Button onClick={() => setAdding(true)} icon={<Plus size={18} />}>Añadir producto</Button>}>
                No hay ingredientes para esta semana. Revisa el menú en Plan o añade productos manualmente.
              </EmptyState>
            </Card>
          ) : (
            <div className="space-y-5">
              {visibleGroups.map((g) => (
                <section key={g.category} aria-labelledby={`cat-${g.category}`}>
                  <h2 id={`cat-${g.category}`} className="mb-2 flex items-center justify-between px-1 text-[13px] font-semibold uppercase tracking-wide text-ink3">
                    {CATEGORY_LABELS[g.category]}
                    <span className="tabular normal-case tracking-normal">{g.items.filter((i) => i.checked).length}/{g.items.length}</span>
                  </h2>
                  <Card as="div" className="divide-y divide-line/60 overflow-hidden">
                    {g.items.map((item) => (
                      <div key={item.key} className={cx('flex items-center gap-3 pl-3 pr-1 transition-colors', storeMode ? 'min-h-[68px]' : 'min-h-[56px]', item.checked && 'bg-surface2/40')}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={item.checked}
                          aria-label={`${item.name}, ${item.qty}`}
                          onClick={() => toggle(item)}
                          className="press -m-1 p-1"
                        >
                          <span key={String(item.checked)} className={cx('flex items-center justify-center rounded-full transition-colors', storeMode ? 'h-8 w-8' : 'h-6 w-6', item.checked ? 'anim-pop bg-accent text-accentInk' : 'ring-2 ring-inset ring-line')}>
                            {item.checked && <Check size={storeMode ? 18 : 14} strokeWidth={3} />}
                          </span>
                        </button>
                        <button type="button" onClick={() => setEditing(item)} className="flex min-w-0 flex-1 items-center justify-between gap-3 self-stretch py-2 text-left">
                          <span className="min-w-0">
                            <span className={cx('block font-medium leading-snug', storeMode ? 'text-[18px]' : 'text-[16px]', item.checked && 'text-ink3 line-through')}>{item.name}</span>
                            {!storeMode && item.usedIn.length > 0 && <span className="block truncate text-[12px] text-ink3">{item.usedIn.length} receta{item.usedIn.length === 1 ? '' : 's'}</span>}
                            {item.manual && !storeMode && <span className="block text-[12px] text-ink3">Añadido por ti</span>}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {item.edited && <Badge>Editado</Badge>}
                            <span className={cx('tabular text-right text-ink2', storeMode ? 'text-[16px] font-semibold' : 'text-[14px]')}>{item.qty}</span>
                          </span>
                        </button>
                      </div>
                    ))}
                  </Card>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditItemSheet item={editing} onClose={() => setEditing(null)} monday={monday} onRemove={remove} />
      <AddItemSheet open={adding} onClose={() => setAdding(false)} monday={monday} />
    </>
  );
}

function EditItemSheet({ item, onClose, monday, onRemove }: { item: ShoppingItem | null; onClose: () => void; monday: string; onRemove: (i: ShoppingItem) => void }) {
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const [qty, setQty] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (item) {
      setQty(item.qty);
      setError(null);
    }
  }, [item]);
  if (!item) return null;

  const save = () => {
    const v = qty.trim();
    if (!v) {
      setError('Escribe una cantidad (por ejemplo: 500 g o 2 unidades).');
      return;
    }
    mutate((d) => {
      d.shopping[monday] ??= emptyOverrides();
      const o = d.shopping[monday];
      if (item.manual) {
        const m = o.manual.find((x) => x.id === item.key);
        if (m) m.qty = v;
      } else if (v === item.autoQty) delete o.qty[item.key];
      else o.qty[item.key] = v;
    });
    toast('Cantidad actualizada');
    onClose();
  };

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={item.name}
      subtitle={item.manual ? 'Producto añadido por ti' : `Calculado: ${item.autoQty}`}
      footer={
        <div className="flex gap-2">
          <Button variant="destructive" icon={<Trash2 size={18} />} onClick={() => { onRemove(item); onClose(); }}>Eliminar</Button>
          <Button className="flex-1" onClick={save}>Guardar</Button>
        </div>
      }
    >
      <TextField label="Cantidad" value={qty} onChange={(e) => { setQty(e.target.value); setError(null); }} error={error} data-autofocus maxLength={40} onKeyDown={(e) => e.key === 'Enter' && save()} />
      {item.edited && !item.manual && (
        <button type="button" className="mt-2 text-[14px] font-semibold text-accent" onClick={() => setQty(item.autoQty)}>
          Volver a la cantidad calculada ({item.autoQty})
        </button>
      )}
      {item.usedIn.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-[14px] font-semibold text-ink2">Se usa en</h3>
          <ul className="space-y-1">
            {item.usedIn.map((n) => <li key={n} className="rounded-[10px] bg-surface2 px-3 py-2 text-[14px]">{n}</li>)}
          </ul>
          <p className="mt-3 text-[12px] text-ink3">Si cambias el menú, la cantidad calculada se actualiza; tu cantidad editada se conserva.</p>
        </>
      )}
    </Sheet>
  );
}

function AddItemSheet({ open, onClose, monday }: { open: boolean; onClose: () => void; monday: string }) {
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [category, setCategory] = useState<ShopCategory>('otros');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setName('');
      setQty('');
      setCategory('otros');
      setError(null);
    }
  }, [open]);

  const save = () => {
    if (name.trim().length < 2) {
      setError('Escribe el nombre del producto.');
      return;
    }
    mutate((d) => {
      d.shopping[monday] ??= emptyOverrides();
      d.shopping[monday].manual.push({ id: uid('man'), name: name.trim(), qty: qty.trim() || '1', category, checked: false });
    });
    toast(`${name.trim()} añadido a la lista`);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Añadir producto" footer={<Button size="lg" onClick={save}>Añadir a la lista</Button>}>
      <div className="space-y-4">
        <TextField label="Producto" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} error={error} placeholder="Por ejemplo: papel de cocina" data-autofocus maxLength={60} />
        <TextField label="Cantidad (opcional)" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Por ejemplo: 2 paquetes" maxLength={40} />
        <SelectField label="Sección" value={category} onChange={(e) => setCategory(e.target.value as ShopCategory)}>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </SelectField>
      </div>
    </Sheet>
  );
}
