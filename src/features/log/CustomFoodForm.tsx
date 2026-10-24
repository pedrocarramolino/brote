import { useState } from 'react';
import type { Food, ShopCategory } from '../../types';
import { Button, Segmented, SelectField, TextField } from '../../components/ui/primitives';
import { useStore } from '../../store/AppStore';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../data/foods';
import { parseDecimal, uid } from '../../lib/format';

type FieldKey = 'name' | 'kcal' | 'protein' | 'carbs' | 'fat';

/** Alimento propio con validación. Los valores los aporta el usuario (fuente: «Introducido por ti»). */
export function CustomFoodForm({ onSaved, onCancel }: { onSaved: (f: Food) => void; onCancel: () => void }) {
  const { mutate } = useStore();
  const [v, setV] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [unit, setUnit] = useState<'g' | 'ml'>('g');
  const [category, setCategory] = useState<ShopCategory>('otros');
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const set = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = () => {
    const e: Partial<Record<FieldKey, string>> = {};
    const name = v.name.trim();
    if (name.length < 2) e.name = 'Escribe un nombre (mínimo 2 caracteres).';
    const nums = { kcal: parseDecimal(v.kcal), protein: parseDecimal(v.protein), carbs: parseDecimal(v.carbs), fat: parseDecimal(v.fat) };
    if (!Number.isFinite(nums.kcal) || nums.kcal < 0 || nums.kcal > 900) e.kcal = 'Entre 0 y 900 kcal por 100.';
    (['protein', 'carbs', 'fat'] as const).forEach((k) => {
      if (!Number.isFinite(nums[k]) || nums[k] < 0 || nums[k] > 100) e[k] = 'Entre 0 y 100 g.';
    });
    if (!e.protein && !e.carbs && !e.fat && nums.protein + nums.carbs + nums.fat > 100) e.fat = 'La suma de macronutrientes no puede superar 100 g por 100.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const food: Food = {
      id: uid('food'),
      name,
      unit,
      per100: nums,
      category,
      source: 'usuario',
      allergens: [],
    };
    mutate((d) => void d.customFoods.push(food));
    onSaved(food);
  };

  return (
    <div className="anim-fade space-y-4">
      <TextField label="Nombre" value={v.name} onChange={set('name')} error={errors.name} placeholder="Por ejemplo: pan de centeno de mi panadería" data-autofocus maxLength={60} />
      <div>
        <p className="mb-1.5 text-[14px] font-semibold text-ink2">Valores por cada 100</p>
        <Segmented label="Unidad" value={unit} onChange={setUnit} options={[{ value: 'g', label: 'gramos' }, { value: 'ml', label: 'mililitros' }]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Energía" inputMode="decimal" suffix="kcal" value={v.kcal} onChange={set('kcal')} error={errors.kcal} />
        <TextField label="Proteínas" inputMode="decimal" suffix="g" value={v.protein} onChange={set('protein')} error={errors.protein} />
        <TextField label="Hidratos" inputMode="decimal" suffix="g" value={v.carbs} onChange={set('carbs')} error={errors.carbs} />
        <TextField label="Grasas" inputMode="decimal" suffix="g" value={v.fat} onChange={set('fat')} error={errors.fat} />
      </div>
      <SelectField label="Sección de la compra" value={category} onChange={(e) => setCategory(e.target.value as ShopCategory)}>
        {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
      </SelectField>
      <p className="text-[13px] text-ink3">Copia los valores de la etiqueta del producto. Se mostrarán como «Introducido por ti».</p>
      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1" onClick={submit}>Guardar alimento</Button>
      </div>
    </div>
  );
}
