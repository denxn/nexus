export function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ padding: "24px 0" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>{title}</h1>
      <p style={{ marginTop: 8, color: "var(--muted)" }}>Coming soon.</p>
    </div>
  );
}
