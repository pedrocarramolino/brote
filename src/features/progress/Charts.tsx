import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface Point {
  label: string; // etiqueta corta del eje
  full: string; // etiqueta completa del tooltip
  value: number | null;
}

const AXIS = { fontSize: 12, fill: 'rgb(var(--ink-3))' };

function Tip({ active, payload, unit, digits }: { active?: boolean; payload?: { payload: Point }[]; unit: string; digits: number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (p.value === null) return null;
  return (
    <div className="rounded-[12px] bg-surface px-3 py-2 text-[13px] shadow-float ring-1 ring-line/70">
      <p className="text-ink3">{p.full}</p>
      <p className="tabular text-[15px] font-bold text-ink">
        {p.value.toLocaleString('es-ES', { maximumFractionDigits: digits })} {unit}
      </p>
    </div>
  );
}

/** Línea de una serie (2 px, puntos de 8 px solo al pasar el cursor). */
export function TrendLine({ data, unit, digits = 1, height = 200, domainPad = 1 }: { data: Point[]; unit: string; digits?: number; height?: number; domainPad?: number }) {
  const vals = data.map((d) => d.value).filter((v): v is number => v !== null);
  const min = Math.floor(Math.min(...vals) - domainPad);
  const max = Math.ceil(Math.max(...vals) + domainPad);
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeOpacity={0.6} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[min, max]} tick={AXIS} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => v.toLocaleString('es-ES')} />
          <Tooltip content={<Tip unit={unit} digits={digits} />} cursor={{ stroke: 'rgb(var(--ink-3))', strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey="value" stroke="rgb(var(--accent))" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 5, strokeWidth: 2, stroke: 'rgb(var(--surface))' }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras finas con extremo redondeado y línea de objetivo opcional. */
export function Bars({ data, unit, target, max, height = 180, digits = 0, targetLabel }: { data: Point[]; unit: string; target?: number; max?: number; height?: number; digits?: number; targetLabel?: string }) {
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeOpacity={0.6} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={8} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} domain={[0, max ?? 'auto']} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v))} />
          <Tooltip content={<Tip unit={unit} digits={digits} />} cursor={{ fill: 'rgb(var(--surface-2))' }} />
          {target !== undefined && (
            <ReferenceLine y={target} stroke="rgb(var(--ink-3))" strokeDasharray="4 4" label={targetLabel ? { value: targetLabel, position: 'insideTopRight', fill: 'rgb(var(--ink-3))', fontSize: 11 } : undefined} />
          )}
          <Bar dataKey="value" fill="rgb(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
