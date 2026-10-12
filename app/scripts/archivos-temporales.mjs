// Archivos temporales de Office: mientras un libro está abierto, Excel crea al lado un "~$Libro.xlsx"
// (y LibreOffice un ".~lock.Libro.xlsx#") que guarda el NOMBRE DEL USUARIO de Windows que lo abrió.
// Si el Excel de ejemplo está abierto al compilar, ese archivo pasaría de public/ a dist/ y a publicar/,
// y quedaría descargable sin iniciar sesión en el sitio publicado. Por eso nunca se copia.
import { cpSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';

/** ¿Es un archivo temporal de Office? ("~$centros-ejemplo.xlsx", ".~lock.centros-ejemplo.xlsx#") */
export const esArchivoTemporal = (ruta) => /^(~\$|\.~lock\.)/.test(basename(String(ruta)));

/** Copia una carpeta completa SIN los archivos temporales. Devuelve las rutas que se dejaron afuera. */
export function copiarSinTemporales(origen, destino) {
  const omitidos = [];
  cpSync(origen, destino, {
    recursive: true,
    filter: (ruta) => {
      if (!esArchivoTemporal(ruta)) return true;
      omitidos.push(ruta);
      return false;
    },
  });
  return omitidos;
}

/** Borra los archivos temporales que haya dentro de una carpeta (ej. dist/ recién compilada). Devuelve los borrados. */
export function quitarTemporales(carpeta) {
  const borrados = [];
  for (const entrada of readdirSync(carpeta, { withFileTypes: true, recursive: true })) {
    if (!entrada.isFile() || !esArchivoTemporal(entrada.name)) continue;
    const ruta = join(entrada.parentPath ?? entrada.path, entrada.name);
    rmSync(ruta, { force: true });
    borrados.push(ruta);
  }
  return borrados;
}
