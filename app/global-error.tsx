"use client";

// Replaces the root layout when it fails, so it brings its own document and inline styles.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const button = {
    padding: "10px 16px",
    borderRadius: 10,
    border: 0,
    background: "#3da9ff",
    color: "#04101f",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  } as const;
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#070b14", color: "#e8edf7", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
            <p style={{ color: "#8592ad" }}>That did not work. Try again, or log in again if your session may have expired.</p>
            <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" style={button} onClick={() => retry()}>
                Try again
              </button>
              <a href="/login" style={{ ...button, background: "transparent", color: "#e8edf7", border: "1px solid rgba(255,255,255,0.15)", textDecoration: "none" }}>
                Log in again
              </a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
