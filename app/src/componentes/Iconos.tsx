// Íconos (SVG). Todos llevan aria-hidden: son decoración, el texto del botón dice qué hace.

export function IconoLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path
        fill="currentColor"
        d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm13-2h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3Z"
      />
    </svg>
  );
}

export function IconoLuna() {
  return (
    <svg className="icono-luna" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path fill="currentColor" d="M21 14.5A8.5 8.5 0 0 1 9.5 3a.5.5 0 0 0-.6-.6A9.5 9.5 0 1 0 21.6 15.1a.5.5 0 0 0-.6-.6Z" />
    </svg>
  );
}

export function IconoSol() {
  return (
    <svg className="icono-sol" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
      />
    </svg>
  );
}

export function IconoMicrosoft() {
  return (
    <svg aria-hidden="true" viewBox="0 0 21 21" width="18" height="18">
      <path fill="#f25022" d="M1 1h9v9H1z" />
      <path fill="#7fba00" d="M11 1h9v9h-9z" />
      <path fill="#00a4ef" d="M1 11h9v9H1z" />
      <path fill="#ffb900" d="M11 11h9v9h-9z" />
    </svg>
  );
}

export function IconoActualizar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" className="icono-actualizar">
      <path
        fill="currentColor"
        d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z"
      />
    </svg>
  );
}

export function IconoLupa() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" className="icono-lupa">
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
      />
    </svg>
  );
}

export function IconoDescargar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
      <path fill="currentColor" d="M5 20h14v-2H5v2ZM11 2v10.17L7.92 9.08 6.5 10.5 12 16l5.5-5.5-1.42-1.42L13 12.17V2h-2Z" />
    </svg>
  );
}

export function IconoCopiar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
      <path
        fill="currentColor"
        d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
      />
    </svg>
  );
}

export function IconoFlecha() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" className="icono-expandir">
      <path fill="currentColor" d="M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4 9 6Z" />
    </svg>
  );
}
