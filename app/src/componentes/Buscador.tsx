// Buscador global: una caja grande (Input de shadcn/ui); filtra 200 ms después de la última tecla (Enter = ya).
// La lupa (izquierda) y la "×" para borrar (derecha) van centradas en la altura de la caja.
// A los componentes de shadcn/ui solo se les agregan clases de medidas y ubicación (alto, espacio para los íconos).
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { useMediaQuery } from '../hooks/useMediaQuery.ts';
import { IconoCerrar, IconoLupa } from './Iconos.tsx';

interface Props {
  valor: string;
  alEscribir: (valor: string) => void;
  /** Enter: buscar ya. */
  alEnviar: () => void;
  /** Botón "×": borrar la búsqueda. */
  alBorrar: () => void;
  campoRef: RefObject<HTMLInputElement | null>;
}

export function Buscador({ valor, alEscribir, alEnviar, alBorrar, campoRef }: Props) {
  // En celulares el texto de ayuda del buscador es más corto para que se lea completo.
  const esCelular = useMediaQuery('(max-width: 719px)');
  return (
    <form
      id="form-busqueda"
      className="mb-3 print:hidden"
      role="search"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        alEnviar();
      }}
    >
      <label htmlFor="buscador" className="mb-1 block font-semibold">
        Buscar
      </label>
      <div className="relative flex items-center">
        <IconoLupa />
        <Input
          id="buscador"
          ref={campoRef}
          name="q"
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={esCelular ? 'Código, cliente, orden…' : 'Buscar por código, descripción, cliente u orden…'}
          aria-describedby="ayuda-busqueda"
          className="h-11 pr-12 pl-11 [&::-webkit-search-cancel-button]:appearance-none"
          value={valor}
          onChange={(ev) => alEscribir(ev.target.value)}
        />
        <Button
          type="button"
          id="btn-borrar-busqueda"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1.5 -mt-4"
          aria-label="Borrar búsqueda"
          hidden={!valor}
          onClick={alBorrar}
        >
          <IconoCerrar />
        </Button>
      </div>
      <p id="ayuda-busqueda" className="mt-1.5 mb-0 text-[0.82rem] text-muted-foreground">
        Puedes escribir varias palabras: se muestran las filas que tengan <strong>todas</strong>. No importan mayúsculas ni tildes.{' '}
        <span className="max-escritorio:hidden">
          Atajo: tecla <Kbd>/</Kbd>.
        </span>
      </p>
    </form>
  );
}
