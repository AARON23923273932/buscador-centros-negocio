// Texto con las coincidencias de la búsqueda resaltadas en amarillo (<mark>).
//
// Regla de oro: los datos del Excel se ponen SIEMPRE como texto de React (que los "escapa"),
// nunca como HTML (sin dangerouslySetInnerHTML). Si una celda dice "<script>…", se ve tal cual
// y no se ejecuta.
import { Fragment } from 'react';
import { segmentosResaltado } from '../logica/filtros.ts';

export function Resaltado({ texto, terminos }: { texto: unknown; terminos?: readonly string[] | null }) {
  return (
    <>
      {segmentosResaltado(texto, terminos).map((s, i) =>
        s.marcado ? <mark key={i}>{s.texto}</mark> : <Fragment key={i}>{s.texto}</Fragment>,
      )}
    </>
  );
}
