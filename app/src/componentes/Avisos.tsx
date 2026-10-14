// Avisos de la pantalla principal: error (rojo), columnas que faltan (amarillo) y el aviso flotante.
import { Fragment, type ReactNode } from 'react';
import type { AvisoFlotante as DatosAvisoFlotante } from '../hooks/useAvisoFlotante.ts';
import type { AvisoError as DatosAvisoError } from '../hooks/useExcel.ts';
import type { ResultadoLectura } from '../logica/tipos.ts';

/** Aviso rojo: no se pudo leer el Excel (con botones "Reintentar", "Volver a iniciar sesión"). */
export function AvisoError({ error }: { error: DatosAvisoError | null }) {
  return (
    <div id="aviso-error" className="aviso aviso-error" role="alert" hidden={!error}>
      {error && (
        <>
          <span>{error.mensaje}</span>
          {error.acciones.map((a) => (
            <Fragment key={a.texto}>
              {' '}
              <button type="button" className="btn btn-secundario btn-pequeno" onClick={a.accion}>
                {a.texto}
              </button>
            </Fragment>
          ))}
        </>
      )}
    </div>
  );
}

/** Aviso amarillo: faltan columnas en el Excel, o hay fórmulas sin resultado guardado. */
export function AvisoColumnas({ datos }: { datos: ResultadoLectura | null }) {
  const partes: ReactNode[] = [];
  if (datos?.faltantes.length) {
    const { faltantes, columnas, hojas, hoja } = datos;
    const encontrados = columnas.map((c) => `${c.letra}: ${c.titulo}`).join(' · ') || '(ninguno)';
    partes.push(
      <>
        <strong>No se encontraron estas columnas en el Excel:</strong>
        {` ${faltantes.map((f) => f.nombre).join(', ')}. `}
        {'Los filtros de esas columnas están desactivados. Revisa los títulos del Excel o agrega el nombre en la sección '}
        {'"columnas" de config.json.'}
        <br />
        <small>
          {`Títulos encontrados (hoja "${hoja}", fila ${datos.filaEncabezado ?? '–'}): ${encontrados}`}
          {hojas.length > 1 && (
            <>
              <br />
              {`Hojas del Excel: ${hojas.join(', ')}. Si los datos están en otra, ponla en "datos.hoja" de config.json.`}
            </>
          )}
        </small>
      </>,
    );
  }
  if (datos && datos.formulasSinCalcular > 0) {
    partes.push(
      <>
        <strong>
          {`${datos.formulasSinCalcular.toLocaleString('es-PE')} celda(s) del Excel tienen una fórmula sin resultado guardado`}
        </strong>
        {' y se ven vacías. '}
        {'Si deberían tener datos: abrir el Excel en Excel y guardarlo, o pedir que el bot escriba valores en vez de fórmulas.'}
      </>,
    );
  }
  return (
    <div id="aviso-columnas" className="aviso aviso-advertencia" hidden={partes.length === 0}>
      {partes.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <hr className="separador-aviso" />}
          {p}
        </Fragment>
      ))}
    </div>
  );
}

/** Mensaje corto flotante (ej. "Código copiado"). Siempre está en la página para que los lectores de pantalla lo lean. */
export function AvisoFlotante({ aviso }: { aviso: DatosAvisoFlotante }) {
  return (
    <div id="aviso-flotante" className={`aviso-flotante${aviso.visible ? ' visible' : ''}`} role="status" aria-live="polite">
      {aviso.texto}
    </div>
  );
}
