"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MONTHS, type Visitation } from "@/lib/types";

const fmt = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** Single-series bar chart of average recreation visits by month. Best months are drawn in the solid hue. */
export function VisitsChart({ visitation, highlight }: { visitation: Visitation; highlight: number[] }) {
  const data = visitation.monthlyAvg.map((v, i) => ({ month: MONTHS[i], visits: v, i }));
  const hi = new Set(highlight);
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "var(--rule)" }} tick={{ fill: "var(--ink-3)", fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => compact.format(v)} tickLine={false} axisLine={false} width={44} tick={{ fill: "var(--ink-3)", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "var(--paper-2)" }}
            contentStyle={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 4, fontSize: 13, color: "var(--ink)" }}
            formatter={(v) => [fmt.format(Number(v)), "avg visits"]}
            labelStyle={{ color: "var(--ink-2)" }}
          />
          <Bar dataKey="visits" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.i} fill={hi.has(d.i) ? "var(--chart)" : "var(--chart-muted)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
