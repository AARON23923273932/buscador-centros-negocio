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
