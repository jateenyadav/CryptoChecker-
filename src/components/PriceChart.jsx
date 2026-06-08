import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatPrice } from "../utils/format.js";

export default function PriceChart({ data, currency, days }) {
  const series = useMemo(
    () =>
      (data ?? []).map(([t, price]) => ({
        t,
        price,
      })),
    [data]
  );

  if (!series.length) return null;

  const up = series[series.length - 1].price >= series[0].price;
  const color = up ? "#16c784" : "#ea3943";

  const fmtX = (t) => {
    const d = new Date(t);
    if (Number(days) <= 1) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="chart" role="img" aria-label="Price history chart">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={fmtX}
            minTickGap={48}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => formatPrice(v, currency)}
            width={80}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            stroke="var(--border)"
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
            }}
            labelFormatter={(t) => new Date(t).toLocaleString()}
            formatter={(v) => [formatPrice(v, currency), "Price"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            fill="url(#priceFill)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
