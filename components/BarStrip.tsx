type Props = { values: number[]; color: string };

/** Seven small bars, scaled to the week's maximum; the last bar is today. */
export function BarStrip({ values, color }: Props) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 28 }} aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: `${Math.max((v / max) * 100, 8)}%`,
            borderRadius: 3,
            background: color,
            opacity: i === values.length - 1 ? 1 : 0.45,
          }}
        />
      ))}
    </div>
  );
}
