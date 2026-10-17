import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { useMediaQuery } from '../hooks/useMediaQuery.ts';
import { IconoCerrar, IconoLupa } from './Iconos.tsx';

interface Props {
  valor: string;
  alEscribir: (valor: string) => void;
  alEnviar: () => void;
  alBorrar: () => void;
  campoRef: RefObject<HTMLInputElement | null>;
}

export function Buscador({ valor, alEscribir, alEnviar, alBorrar, campoRef }: Props) {
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
