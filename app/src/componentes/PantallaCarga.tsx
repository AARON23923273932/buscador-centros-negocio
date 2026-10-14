// Pantalla "Cargando…" (mientras se lee config.json y se prepara el inicio de sesión).

/** Pantalla 1: cargando la app. */
export function PantallaCarga() {
  return (
    <section id="pantalla-carga" className="pantalla-centro" aria-live="polite">
      <div className="tarjeta tarjeta-centro">
        <span className="spinner" aria-hidden="true" />
        <p>Cargando…</p>
      </div>
    </section>
  );
}
