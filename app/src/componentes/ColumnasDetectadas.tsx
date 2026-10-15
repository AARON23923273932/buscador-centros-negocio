// "Columnas detectadas en el Excel": qué columna usó la app para cada cosa, cuáles ocultó y
// (con el Excel real) dónde está el archivo en SharePoint/OneDrive (para fijarlo en config.json).
import { memo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InfoArchivo } from '../hooks/useExcel.ts';
import { NOMBRES_CAMPOS } from '../logica/filtros.ts';
import type { OrigenExcel, ResultadoLectura } from '../logica/tipos.ts';

const ORIGENES: Record<OrigenExcel, string> = {
  config: 'driveId + itemId de config.json',
  enlace: 'el enlace de config.json',
  busqueda: 'búsqueda en SharePoint con el enlace de config.json',
  memoria: 'búsqueda en SharePoint (guardada en esta pestaña)',
};

function UbicacionExcel({ archivo }: { archivo: InfoArchivo | null }) {
  if (!archivo?.driveId || !archivo?.itemId) return null;
  const origen = archivo.origen ? ORIGENES[archivo.origen] : '';
  return (
    <p className="ubicacion-excel">
      {'Ubicación del Excel en SharePoint/OneDrive'}
      {origen ? ` (encontrado con ${origen})` : ''}
      {': '}
      <br />
      {'driveId: '}
      <code>{archivo.driveId}</code>
      <br />
      {'itemId: '}
      <code>{archivo.itemId}</code>
      <br />
      <small>
        Si el enlace deja de funcionar, se pueden copiar estos dos valores en "datos.driveId" y "datos.itemId" de config.json.
      </small>
    </p>
  );
}

/** memo(): solo se vuelve a dibujar al leer otra vez el Excel. */
export const ColumnasDetectadas = memo(function ColumnasDetectadas({
  datos: d,
  archivo,
}: {
  datos: ResultadoLectura;
  archivo: InfoArchivo | null;
}) {
  return (
    <>
      <p>
        {'Archivo: '}
        <strong>{archivo?.nombre || ''}</strong>
        {' · Hoja: '}
        <strong>{d.hoja}</strong>
        {' · Fila de títulos: '}
        <strong>{d.filaEncabezado ?? '–'}</strong>
        {' · Filas con datos: '}
        <strong>{d.filas.length.toLocaleString('es-PE')}</strong>
        {d.filasVacias ? ` · Filas vacías ignoradas: ${d.filasVacias}` : ''}
        {d.filasRellenadas ? ` · Filas sin centro que se completaron con el centro de la fila de arriba: ${d.filasRellenadas}` : ''}
        {d.celdasConError ? ` · Celdas con error de fórmula (#N/A, #DIV/0!…): ${d.celdasConError}` : ''}
      </p>
      <p>
        {'Columnas ocultas (no se muestran, no se buscan ni se exportan): '}
        <strong>{d.columnasOcultas?.length ? d.columnasOcultas.map((c) => `${c.titulo} (${c.letra})`).join(', ') : 'ninguna'}</strong>
      </p>
      <UbicacionExcel archivo={archivo} />
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <Table container={false}>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="static">
                Columna
              </TableHead>
              <TableHead scope="col" className="static">
                Título en el Excel
              </TableHead>
              <TableHead scope="col" className="static">
                La app la usa como
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {d.columnas.map((c) => (
              <TableRow key={c.indice}>
                <TableCell>{c.letra}</TableCell>
                <TableCell>{c.titulo}</TableCell>
                <TableCell>{c.campo ? NOMBRES_CAMPOS[c.campo] : <span className="text-muted-foreground">(se muestra tal cual)</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
});
