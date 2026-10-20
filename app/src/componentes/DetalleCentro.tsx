import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { cn } from 'cn';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableHeader } from '@/components/ui/table';
import { buscarCentro, estadosDeCentro } from '../logica/centro.ts';
import { numero } from '../logica/formato.ts';
import { codigoDeRuta, rutaVolver, type EstadoNavegacion } from '../logica/rutas.ts';
import { CajaTabla, ContenidoCelda, EncabezadosFijos, FilasDatos, MensajeTabla } from './Celdas.tsx';
import { IconoVolver, IndicadorCarga } from './Iconos.tsx';
import { useContextoApp } from './PantallaApp.tsx';

const sinTerminos = (): readonly string[] => [];

function VolverALista() {
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const destino = { pathname: rutaVolver(ubicacion.state), search: ubicacion.search };
  const vieneDeLaLista = typeof (ubicacion.state as EstadoNavegacion | null)?.desde === 'string';
  const alHacerClic = (ev: MouseEvent<HTMLAnchorElement>) => {
    const posicion = (history.state as { idx?: unknown } | null)?.idx;
    const conTeclaEspecial = ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey;
    if (vieneDeLaLista && !conTeclaEspecial && typeof posicion === 'number' && posicion > 0) {
      ev.preventDefault();
      void navegar(-1);
    }
  };
  return (
    <Link id="btn-volver" to={destino} onClick={alHacerClic} className={cn(buttonVariants({ variant: 'outline' }))}>
      <IconoVolver />
      Volver a la lista
    </Link>
  );
}

export function DetalleCentro() {
  const { excel, copiar, anotarCentroAbierto } = useContextoApp();
  const { pathname } = useLocation();
  const { codigo: codigoParametro = '' } = useParams();
  const codigo = codigoDeRuta(pathname) ?? codigoParametro;
  const { datos } = excel;
  const grupo = useMemo(() => (datos ? buscarCentro(datos.filas, codigo) : null), [datos, codigo]);
  const estados = useMemo(() => (grupo ? estadosDeCentro(grupo) : []), [grupo]);
  const conEstado = !!datos && 'estado' in datos.mapa;

  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    titulo.current?.focus({ preventScroll: true });
    anotarCentroAbierto({ codigo, indice: -1 });
  }, [codigo, anotarCentroAbierto]);

  const DATO = 'min-w-0';
  const DATO_ANCHO = 'min-w-0 col-span-2 max-escritorio:col-span-1';
  const TITULO_DATO = 'mb-0.5 text-[0.8rem] font-semibold text-muted-foreground';
  const VALOR_DATO = 'm-0 [overflow-wrap:anywhere]';

  let contenido;
  if (!datos) {
    contenido =
      excel.sinDatos === 'error' ? (
        <Card className="py-0">
          <MensajeTabla>
            <CircleAlertIcon aria-hidden="true" className="size-[18px] shrink-0" />
            No hay datos para mostrar. Revisa el mensaje de arriba.
          </MensajeTabla>
        </Card>
      ) : (
        <Card className="py-0" aria-busy="true">
          <MensajeTabla>
            <IndicadorCarga />
            Cargando datos del Excel…
          </MensajeTabla>
        </Card>
      );
  } else if (!grupo) {
    contenido = (
      <Alert id="centro-no-encontrado" role="status">
        <TriangleAlertIcon aria-hidden="true" />
        <div>
          <strong>No se encontró el centro de negocio “{codigo}” en el Excel.</strong> Revisa el código (puede haber cambiado o
          estar mal escrito en el enlace) o vuelve a la lista para buscarlo.
        </div>
      </Alert>
    );
  } else {
    contenido = (
      <>
        <Card className="mb-5">
          <CardContent>
            <dl id="ficha-centro" className="m-0 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-7 gap-y-3.5 max-escritorio:grid-cols-1">
              <div className={DATO}>
                <dt className={TITULO_DATO}>Código</dt>
                <dd className={VALOR_DATO}>
                  <ContenidoCelda columna={{ campo: 'codigoCentro' }} celda={{ t: grupo.codigo }} terminos={[]} alCopiar={copiar} enlazar={false} />
                </dd>
              </div>
              <div className={DATO_ANCHO}>
                <dt className={TITULO_DATO}>Descripción</dt>
                <dd className={VALOR_DATO}>{grupo.descripcion || '—'}</dd>
              </div>
              <div className={DATO_ANCHO}>
                <dt className={TITULO_DATO}>{grupo.clientes.length > 1 ? 'Clientes' : 'Cliente'}</dt>
                <dd className={VALOR_DATO}>{grupo.clientes.join(', ') || '—'}</dd>
              </div>
              {conEstado && (
                <div className={DATO}>
                  <dt className={TITULO_DATO}>{estados.length > 1 ? 'Estados' : 'Estado'}</dt>
                  <dd className={VALOR_DATO}>{estados.join(', ') || '—'}</dd>
                </div>
              )}
              <div className={DATO}>
                <dt className={TITULO_DATO}>N° de órdenes</dt>
                <dd className={VALOR_DATO}>
                  <Badge variant="secondary" id="numero-ordenes" className="insignia min-w-6">
                    {numero(grupo.ordenes)}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <h3 className="mt-0 mb-2 text-base" id="titulo-ordenes-centro">
          Órdenes del centro{' '}
          <span className="text-[0.9rem] font-normal text-muted-foreground">
            ({numero(grupo.filas.length)} {grupo.filas.length === 1 ? 'fila' : 'filas'} del Excel)
          </span>
        </h3>
        <CajaTabla id="contenedor-detalle" className="mb-3" aria-labelledby="titulo-ordenes-centro">
          <Table id="tabla-detalle">
            <caption className="sr-only">Órdenes del centro {grupo.codigo}</caption>
            <TableHeader>
              <EncabezadosFijos columnas={datos.columnas} />
            </TableHeader>
            <TableBody>
              <FilasDatos columnas={datos.columnas} filas={grupo.filas} terminosDe={sinTerminos} alCopiar={copiar} enlazarCodigo={false} />
            </TableBody>
          </Table>
        </CajaTabla>
      </>
    );
  }

  return (
    <section id="detalle-centro" aria-labelledby="titulo-detalle">
      <div className="mb-3 flex items-center print:hidden">
        <VolverALista />
      </div>
      <h2 id="titulo-detalle" ref={titulo} tabIndex={-1} className="mt-0 mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[1.4rem]">
        Centro de negocio <span className="codigo [overflow-wrap:anywhere]">{grupo?.codigo || codigo}</span>
      </h2>
      {contenido}
    </section>
  );
}
