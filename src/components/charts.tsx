// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import type { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money, num, titleCase } from '../lib/format';
import { Card } from './ui';

export const CHART_COLORS = ['#b45309', '#0ea5e9', '#10b981', '#8b5cf6', '#f43f5e', '#64748b', '#eab308'];

const shortDay = (d: string) => {
    const [, m, day] = d.split('-').map(Number);
    return `${day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]}`;
};
const compactMoney = (paise: number) => {
    const r = paise / 100;
    if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
    if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
    if (r >= 1e3) return `₹${(r / 1e3).toFixed(0)}k`;
    return `₹${r.toFixed(0)}`;
};

export function ChartCard({ title, children, empty, className }: { title: string; children: ReactNode; empty?: boolean; className?: string }) {
    return (
        <Card title={title} className={className}>
            <div className="h-64">{empty ? <div className="flex h-full items-center justify-center text-sm text-stone-400">No data for this period</div> : children}</div>
        </Card>
    );
}

type Point = { day: string } & Record<string, number | string>;

export function TrendChart({ data, dataKey, kind = 'area', isMoney, color = CHART_COLORS[0], label }: { data: Point[]; dataKey: string; kind?: 'area' | 'bar' | 'line'; isMoney?: boolean; color?: string; label: string }) {
    const fmt = (v: number) => (isMoney ? money(v, true) : num(v));
    const axis = (
        <>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tickFormatter={(v: number) => (isMoney ? compactMoney(v) : num(v))} tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} width={isMoney ? 56 : 36} allowDecimals={false} />
            <Tooltip formatter={(v) => [fmt(Number(v)), label]} labelFormatter={(d) => shortDay(String(d))} />
        </>
    );
    return (
        <ResponsiveContainer width="100%" height="100%">
            {kind === 'bar' ? (
                <BarChart data={data}>
                    {axis}
                    <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
            ) : kind === 'line' ? (
                <LineChart data={data}>
                    {axis}
                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
                </LineChart>
            ) : (
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {axis}
                    <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
                </AreaChart>
            )}
        </ResponsiveContainer>
    );
}

export function DonutChart({ data, nameKey, valueKey }: { data: Record<string, unknown>[]; nameKey: string; valueKey: string }) {
    const rows = data.map((d) => ({ name: titleCase(String(d[nameKey])), value: Number(d[valueKey]) }));
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
                    {rows.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(v) => num(Number(v))} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
        </ResponsiveContainer>
    );
}

export function HBarChart({ data, labelKey, valueKey, isMoney, color = CHART_COLORS[1] }: { data: Record<string, unknown>[]; labelKey: string; valueKey: string; isMoney?: boolean; color?: string }) {
    const rows = data.map((d) => ({ label: String(d[labelKey]).slice(0, 24), value: Number(d[valueKey]) }));
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => (isMoney ? compactMoney(v) : num(v))} tick={{ fontSize: 11, fill: '#78716c' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: '#57534e' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => (isMoney ? money(Number(v)) : num(Number(v)))} />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
        </ResponsiveContainer>
    );
}
