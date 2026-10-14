// Buscador global: una caja grande; filtra 200 ms después de la última tecla (Enter = ya).
import type { RefObject } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery.ts';
import { IconoLupa } from './Iconos.tsx';

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
      className="busqueda"
      role="search"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        alEnviar();
      }}
    >
      <label htmlFor="buscador" className="etiqueta-busqueda">
        Buscar
      </label>
      <div className="caja-busqueda">
        <IconoLupa />
        <input
          id="buscador"
          ref={campoRef}
          name="q"
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={esCelular ? 'Código, cliente, orden…' : 'Buscar por código, descripción, cliente u orden…'}
          aria-describedby="ayuda-busqueda"
          value={valor}
          onChange={(ev) => alEscribir(ev.target.value)}
        />
        <button type="button" id="btn-borrar-busqueda" className="btn-borrar" aria-label="Borrar búsqueda" hidden={!valor} onClick={alBorrar}>
          ×
        </button>
      </div>
      <p id="ayuda-busqueda" className="ayuda">
        Puedes escribir varias palabras: se muestran las filas que tengan <strong>todas</strong>. No importan mayúsculas ni tildes.{' '}
        <span className="solo-escritorio">
          Atajo: tecla <kbd>/</kbd>.
        </span>
      </p>
    </form>
  );
}
