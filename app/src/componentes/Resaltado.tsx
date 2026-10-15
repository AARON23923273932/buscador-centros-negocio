// Texto con las coincidencias de la búsqueda resaltadas (<mark>).
//
// Regla de oro: los datos del Excel se ponen SIEMPRE como texto de React (que los "escapa"),
// nunca como HTML (sin dangerouslySetInnerHTML). Si una celda dice "<script>…", se ve tal cual
// y no se ejecuta.
import { Fragment } from 'react';
import { segmentosResaltado, type Segmento } from '../logica/filtros.ts';
import { segmentosPorLinea, separarOrdenes } from '../logica/ordenes.ts';

function Trozos({ segmentos }: { segmentos: readonly Segmento[] }) {
  return (
    <>
      {segmentos.map((s, i) => (s.marcado ? <mark key={i}>{s.texto}</mark> : <Fragment key={i}>{s.texto}</Fragment>))}
    </>
  );
}

export function Resaltado({ texto, terminos }: { texto: string; terminos?: readonly string[] | null }) {
  return <Trozos segmentos={segmentosResaltado(texto, terminos)} />;
}

/**
 * Celda de la columna de órdenes: si trae varias órdenes juntas ("OC 3519155 OC 3519252…"), cada una va en su
 * propia línea (ver logica/ordenes.ts). El resaltado se calcula UNA vez sobre todas las órdenes y se reparte entre
 * las líneas: lo buscado se marca aunque cruce de una orden a la siguiente.
 */
export function ResaltadoOrdenes({ texto, terminos }: { texto: string; terminos?: readonly string[] | null }) {
  const lineas = separarOrdenes(texto);
  if (lineas.length <= 1) return <Resaltado texto={texto} terminos={terminos} />;
  const porLinea = segmentosPorLinea(lineas, segmentosResaltado(lineas.join(' '), terminos));
  return (
    <>
      {porLinea.map((segmentos, i) => (
        <span key={i} className="orden-linea block">
          <Trozos segmentos={segmentos} />
        </span>
      ))}
    </>
  );
}
