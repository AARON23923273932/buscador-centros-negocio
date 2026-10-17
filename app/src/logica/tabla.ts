import { numero } from './formato.ts';
import type { Columna, Direccion, Pagina, Vista } from './tipos.ts';

export interface EstadoOrden {
  aria: 'none' | 'ascending' | 'descending';
  activo: boolean;
}

export function estadoOrden(clave: string, ordenarPor: string, direccion: Direccion): EstadoOrden {
  if (clave !== ordenarPor) return { aria: 'none', activo: false };
  return direccion === 'desc' ? { aria: 'descending', activo: true } : { aria: 'ascending', activo: true };
}

export const CLASE_ENCABEZADO = 'bg-primary text-center font-bold text-primary-foreground';
export const CLASE_ENCABEZADO_FIJO = 'sticky top-0 z-10';
export const CLASE_FILA_ALTERNA = 'bg-muted';

export const CLASE_NUMERO = 'text-right tabular-nums';
export const CLASE_ANCHA = 'min-w-[260px] max-w-[480px] whitespace-normal max-escritorio:min-w-[200px]';

export function claseColumna(columna: Pick<Columna, 'tipo' | 'campo'>): string {
  const clases: string[] = [];
  if (columna.tipo === 'numero') clases.push(CLASE_NUMERO);
  if (columna.campo === 'descripcionCentro') clases.push(CLASE_ANCHA);
  return clases.join(' ');
}

export function textoContador(pag: Pick<Pagina<unknown>, 'total' | 'desde' | 'hasta'>, totalGeneral: number, vista: Vista): string {
  const unidad = vista === 'centro' ? ['centro', 'centros'] : ['resultado', 'resultados'];
  const nombre = pag.total === 1 ? unidad[0] : unidad[1];
  if (pag.total === 0) return `Sin ${unidad[1]} (de ${numero(totalGeneral)} en total)`;
  return `Mostrando ${numero(pag.desde)}–${numero(pag.hasta)} de ${numero(pag.total)} ${nombre} (de ${numero(totalGeneral)} en total)`;
}
