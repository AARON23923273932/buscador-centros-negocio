// =============================================================================
// portapapeles.ts — Copiar un texto (ej. el código de un centro) con un clic.
// =============================================================================

/** Copia el texto. Devuelve true si se pudo. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Plan B para navegadores sin permiso de portapapeles.
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.className = 'solo-lectores';
    document.body.append(area);
    area.select();
    let ok: boolean;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}
