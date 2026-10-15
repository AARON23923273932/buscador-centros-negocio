# 🌐 Sitio web — Buscador de centros de negocio

> Proyecto "Sitio web" en Notion (código PRY-2, id `3f2738bc3a6381408614e380da98edac`). Notion es la agenda; aquí está el trabajo.
> La app está en [`app/`](app/). La guía para conectarla a Microsoft 365 está en [`GUIA-CONFIGURACION-MICROSOFT.md`](GUIA-CONFIGURACION-MICROSOFT.md). Las pruebas manuales para entregarla están en [`pruebas/plan-de-pruebas.md`](pruebas/plan-de-pruebas.md).

## Estado actual (15/10/2026)
- **Componentes de shadcn/ui "naturales" + estilo de marca** (último pedido de Gustavo del 15/10/2026, por WhatsApp: *"me gusta más, solo faltaría que use los estilos naturales de shadcn, componentes como los botones, inputs, etc. que use de shadcn, sin cambios, solo agregando el estilo de marca para que agregue más suavidad a las cosas"*) — hecho y probado en la PC (rama `shadcn-natural`; falta que Gustavo lo vea y publicarlo):
  1. Los archivos de `app/src/components/ui/` quedan **exactamente** como los genera `npx.cmd shadcn add` (se regeneraron con `--overwrite`; `--dry-run` dice *"skip (identical)"* en los 13). Sombras, esquinas redondeadas, transiciones, anillos de foco y transparencias son los de shadcn/ui.
  2. La marca de AIC entra **solo** por las variables del tema en `app/src/estilos.css` (claro y oscuro), la letra Calibri y, en las tablas, el encabezado Primary Blue con texto blanco y las filas alternas. Se quitaron los estilos propios que cambiaban a los componentes (`clases.ts`, utilidades `foco-*`, caja de nota, `logica/modalidad.ts`…).
  3. Lo que antes dependía de cambiar componentes ahora vive en componentes propios: `AyudaFlotante.tsx` (la ayuda de ☀️/🌙 no se lee dos veces) y `OpcionesBoton.tsx` ("Por orden / Por centro" con `RadioGroup` + `ButtonGroup` + `Button` de shadcn/ui: las flechas siguen eligiendo). Detalle en 8.1 y 8.2.
  - Pruebas automáticas: **356 unitarias** y **94 en navegador**. La prueba de colores pasó al criterio nuevo: colores de la marca **y sus transparencias** (las que traen los componentes) y sombras neutras; sigue fallando con cualquier color ajeno a la marca (el azul del navegador, un color de Tailwind que no sale del tema…) y con texto que no llegue al contraste AA.
  - Lo demás no cambia (textos, login, dominios, Excel real, columnas ocultas, filtros, Estado, una orden por línea, "Por centro", detalle, exportar, auto-actualización, rutas, tema y márgenes). Para publicar: `npm.cmd run preparar-publicacion` y arrastrar `publicar/` (no hay librerías nuevas).
- **Cambios pedidos por Gustavo (15/10/2026, por WhatsApp) + componentes shadcn/ui (pedido de Aaron)** — hechos y probados en la PC (rama `ui-aic-shadcn`; falta publicarlos):
  1. **Una orden por línea:** el Excel real trae varias órdenes en una misma celda (`OC 3519155 OC 3519252 OC N° 3519348 …`). Ahora cada OC/OS se ve en su propia línea en la tabla "Por orden", en "Por centro" y en el detalle del centro; **"N° de órdenes" cuenta cada orden** (antes contaba la celda como una). Al **exportar**, cada orden va en una línea **dentro de la misma celda** ("Ajustar texto" activado). La búsqueda y los filtros no cambian (buscan en el texto completo y resaltan dentro de cada línea). Reglas en la sección 8.
  2. **Un poco más de margen a los lados:** columna de **1120 px** como máximo (antes 1240) y margen lateral del **6 % del ancho** de la pantalla, entre 20 y 96 px (antes 16–56 px); en el celular vertical, 16 px, y entre 400 y 719 px de ancho (celular horizontal, ventana angosta) el margen crece de a poco hasta empalmar con el de escritorio (`max(16px, 8.5vw - 18px)`: nunca menos que antes y sin salto a 720 px).
  3. **Guía de estilo oficial de AIC:** solo los 9 colores de la paleta oficial (también avisos y errores: sin rojo ni amarillo), letra **Calibri**, tablas con encabezado **Primary Blue** (texto blanco en negrita), bordes **Border Gray**, filas alternas **Light Gray** y el padding de la guía; botón principal Primary Blue. El **modo oscuro** no está en la guía: se armó solo con colores de la paleta y contraste AA *(por confirmar con Gustavo)*. Tabla de colores y contrastes en la sección 8.1. (El contenido de la guía es de la empresa: aquí solo se usan sus colores, letra y formato de tablas.)
  4. **React Router 8.4.0** (la última; antes 7.18). Las rutas y su comportamiento no cambian.
  5. **Componentes shadcn/ui + Tailwind CSS v4** (pedido de Aaron, por accesibilidad y escalabilidad): botones, cajas, desplegables, tabla, tarjetas, avisos, selector "Por orden / Por centro", "Columnas detectadas" y ayudas flotantes son componentes de shadcn/ui (sección 8.2).
  - Pruebas automáticas: **358 unitarias** y **93 en navegador** (antes 334 y 68). La nueva `tests/e2e/guia-aic.spec.ts` recorre todas las pantallas (claro y oscuro) y comprueba que **solo** haya colores de la paleta y que todo texto cumpla el contraste AA.
  - Para publicar: igual que antes (`npm.cmd run preparar-publicacion` y arrastrar `publicar/`). Antes, `npm.cmd ci` (hay librerías nuevas).
- **Cambios pedidos por Gustavo (14/10/2026, por WhatsApp)** — hechos (rama `ui-react-router`); el 15/10/2026 se ajustaron los puntos 1 y 2 (ver arriba):
  1. **Más margen a los lados** para leer mejor: el contenido va en una columna centrada (en ese momento, máx. 1240 px) con margen lateral de 16 px (celular) a 56 px (pantallas grandes); la cabecera tiene el fondo a todo el ancho pero su contenido alineado con la columna.
  2. **Contornos menos agresivos:** bordes de 1 px de color suave y, al usar el teclado, un **anillo suave** (borde azul + anillo de 2 px un poco transparente) en vez del contorno grueso de 3 px. El anillo contrasta al menos **3:1** con el fondo en claro y en oscuro (mínimo recomendado para que se vea). Solo aparece con el teclado (`:focus-visible`), no al hacer clic: al hacer clic en una caja de texto o un desplegable solo se pone azul su borde (dice dónde se escribe); el botón de login ya no aparece remarcado al abrir la página.
  3. **Íconos alineados:** todos son SVG de 16–18 px centrados con su texto (lupa y "×" del buscador, flecha propia en los desplegables, copiar código, ▲▼ de los títulos, flecha de "Por centro", Actualizar, Exportar, Filtros, ☀️/🌙, paginación, logo de Microsoft).
  4. **React Router** (librería de rutas) para escalar: cada pantalla tiene su dirección — `/ordenes`, `/centros` y **`/centros/<código>`** (nuevo: detalle de un centro) — y "Página no encontrada" para cualquier otra (tabla en la sección 2). La búsqueda y los filtros siguen en la dirección y funcionan con el botón **atrás** del navegador. El login sigue protegiendo **todas** las rutas y al volver de Microsoft se queda en la misma dirección.
  - Para publicar: `npm.cmd run preparar-publicacion` y arrastrar `publicar/` (ahora incluye **`_redirects`**, necesario para que Netlify entregue la app en `/centros/…`; guía, paso 6). Las pruebas automáticas: **334 unitarias** y **68 en navegador** (antes 297 y 42).
- **Código migrado a React 19 + TypeScript (estricto)** *(13/10/2026, pedido del supervisor: "priorizar el uso de TypeScript y una librería como React por temas de escalabilidad")*. La app **se ve y funciona igual** (mismos textos, diseño, login, filtros, exportar…), **también mientras carga**: la cabecera y el botón ☀️/🌙 se ven desde el primer momento, como antes. Lo comprueban las 39 pruebas en navegador de antes (sin cambiar sus selectores) + 3 nuevas de la pantalla de carga, y 297 pruebas unitarias (antes 234). Además, `npm run lint` revisa las reglas de React. Detalle en las secciones 7 y 8. Para que Netlify muestre esta versión hay que volver a publicar (`npm.cmd run preparar-publicacion` y arrastrar `publicar/`).
- **Publicada en Netlify:** https://aic-centros-negocio.netlify.app (en línea siempre, no depende de la PC).
- **Login con Microsoft activo:** usa la app **"Automatizacion de procesos Aaron"** de Entra ID (la creó TI para este trabajo; tenant JAICOS CORP S.A.C.; clientId `e5d497dc-…`). Desde el 14/10/2026 reemplaza a la app "Buscador de centros de negocio" (`f8547d9b-…`), que se eliminará cuando todo funcione. Solo entran cuentas `@aic.pe` y `@jaicoscorp.com`. Permisos (solo lectura): al **iniciar sesión** solo se pide `User.Read`; `Files.Read.All` se pide **al leer el Excel**.
- **Datos: conectada al Excel real** `centros-negocio-aic.xlsx` (SharePoint de jaicoscorp, sitio raíz) por su enlace (`"fuente": "graph"`, `datos.urlCompartida` en `config.json`). El enlace es la **dirección del navegador** de Excel Online (`…/_layouts/15/Doc.aspx?sourcedoc=…&file=…`): si Microsoft Graph no lo abre como "enlace para compartir", la app **busca el archivo** en las bibliotecas de ese sitio por su identificador y su nombre (detalle en la guía, paso 4.3).
  - ⚠️ **Orden para publicar esta versión** *(por confirmar si la empresa exige la aprobación)*: **1)** en Entra ID → la app → **Permisos de API**, confirmar que `Files.Read.All` (delegado) esté en la lista (si no, agregarlo) y que un administrador pulse **"Conceder consentimiento de administrador"** (guía, paso 2); **2)** recién después, subir `publicar/` a Netlify. Si se sube antes y la empresa no deja que cada persona apruebe ese permiso, la gente **sí puede iniciar sesión**, pero **el Excel no carga**: Microsoft muestra *"Se necesita aprobación del administrador"* y la app *"Tu organización exige que un administrador apruebe el permiso de lectura de archivos (Files.Read.All)…"*.
  - **Primera prueba con el Excel real:** iniciar sesión con una cuenta normal (no administradora). Las columnas reales se revisan en **"Columnas detectadas en el Excel"** (al final de la página), que también muestra el `driveId` e `itemId` encontrados.
- **No se muestran la moneda ni el monto:** las columnas cuyo título tenga "moneda" o "monto" (ej. *Monto*, *Monto total*, *Moneda*) no se ven, no se buscan y no se exportan (`columnasOcultas` en `config.json`).
- **Filtro "Estado"** (desplegable, igual que Cliente y Tipo de orden): aparece si el Excel tiene una columna de estado con valores (*Estado*, *Estado de la orden*, *Situación*, *Status*…).
- ✅ **SheetJS actualizada a 0.20.3** (13/10/2026, desde el sitio oficial `cdn.sheetjs.com`): `npm audit` ya no reporta avisos. Igual se recomienda que **solo la cuenta del bot** pueda editar el Excel real (guía, paso 4.2).
- **Para publicar un cambio:** cerrar el Excel de ejemplo si está abierto → `cd app` → `npm.cmd run preparar-publicacion` → en Netlify → **Deploys**, arrastrar la carpeta [`publicar/`](publicar/). (Si el Excel de ejemplo está abierto, Excel crea `~$centros-ejemplo.xlsx` con tu nombre de usuario; la compilación y el script lo dejan afuera y lo avisan.)
- **Para ver la demo en tu PC:** `npm.cmd run dev:demo` (sección 3). `config.json` ya tiene los valores de producción, así que `npm run dev` pide iniciar sesión y lee el Excel real.

## 1. Qué es (en simple)

En el ERP de la empresa, cada vez que llega una **orden de compra** o un **proyecto** nuevo se crea un **centro de negocio** (un código + una descripción). Dentro de un centro puede haber **varias órdenes de compra o de servicio**. Un **bot** ya copia esa información del ERP a un **Excel**.

Este proyecto es una **página web** (app web) para **buscar en ese Excel de forma fácil**, sin abrirlo:

- Se ve como una tabla "tipo Excel", con filtros y un buscador grande.
- Se entra con la **cuenta de Microsoft de la empresa** (solo correos `@aic.pe` y de Jaicos `@jaicoscorp.com` (confirmado el 12/10/2026)).
- Siempre muestra **lo último que el bot escribió** en el Excel.

*Ejemplo de uso:* alguien recibe la OC `0004500123` y quiere saber a qué centro de negocio pertenece → escribe `4500123` en el buscador → la app muestra la fila con su código de centro, descripción y cliente.

## 2. Qué hace

| Función | Cómo se usa |
|---|---|
| **Buscador** | Una caja grande: "Buscar por código, descripción, cliente u orden…". No importan mayúsculas ni tildes (`electrico` encuentra "Eléctrico"). Varias palabras = deben aparecer **todas** (`cableado demo b`). `cn0005` encuentra `CN-0005` (y lo resalta). Las coincidencias se resaltan (texto blanco sobre Primary Blue; en modo oscuro, negro sobre Light Blue). Atajo: tecla `/`. |
| **Filtros** | **Desplegables** (se elige una opción de la lista): Cliente, Tipo de orden y Estado (estos dos, si el Excel tiene esa columna). **De texto** ("contiene"): Código, Descripción y Orden de compra/servicio. Botón **Limpiar filtros**. Se combinan con el buscador. En el celular, el botón "Filtros" muestra cuántos hay activos. |
| **Tabla tipo Excel** | Con el formato de tablas de la guía de AIC: títulos en Primary Blue (fijos al bajar), clic en un título para ordenar (▲/▼), filas alternas Light Gray, paginación (25/50/100/250) y contador "Mostrando 1–50 de 63 resultados (de 80 en total)". |
| **Varias órdenes en una celda** | Si una celda de la columna de órdenes trae varias (`OC 533 OC N° 3519522`), cada una se ve en su propia línea (tabla, "Por centro" y detalle) y "N° de órdenes" las cuenta por separado. Se busca igual que siempre (en el texto completo) y lo encontrado se resalta dentro de su línea. |
| **Vista "Por centro de negocio"** | Una fila por centro (código, descripción, clientes, N° de órdenes) que se abre para ver sus órdenes. Se cambia con el interruptor **Por orden / Por centro de negocio**, que lleva de `/ordenes` a `/centros` (y viceversa) sin perder la búsqueda ni los filtros. |
| **Detalle de un centro** | En las dos vistas, el **código del centro es un enlace** a su página `/centros/<código>`: código (con copiar), descripción, cliente(s), estado(s), N° de órdenes y la tabla con **todas** sus órdenes. **Volver a la lista** regresa a la lista con los mismos filtros. Si el código no existe, lo dice claramente. |
| **Exportar a Excel** | Descarga lo que se está viendo (con filtros) en un `.xlsx` con fecha en el nombre, ej. `centros-de-negocio_2026-10-09_1432.xlsx`. Las fechas salen como fechas y los números como números (en Excel se pueden ordenar, filtrar y sumar); los códigos conservan sus ceros a la izquierda. Las columnas ocultas (moneda y monto) **no** se exportan. Una celda con varias órdenes sale con **una orden por línea dentro de la misma celda** ("Ajustar texto"). |
| **Copiar código** | Ícono pequeño al lado de cada código de centro; al copiar, un aviso dice "Código … copiado". Para los lectores de pantalla el botón se llama "Copiar código <código>". |
| **Enlace para compartir** | La vista va en la ruta y la búsqueda y los filtros en la dirección (ej. `…/centros?q=cableado&estado=Abierta`). Se copia el enlace y quien lo abra ve lo mismo. Los enlaces viejos (`…/?q=cableado&vista=centro`) siguen funcionando: llevan a `/centros?q=cableado`. |
| **Actualizar** | Botón **Actualizar** + actualización automática cada 10 minutos (configurable) **sin perder** la búsqueda ni los filtros. Muestra "Datos actualizados a las HH:MM" y la fecha en que se modificó el Excel. |
| **Celular y modo oscuro** | Se usa bien en un celular (la tabla tiene su propio desplazamiento lateral) y cambia a colores oscuros si el equipo está en modo oscuro. |
| **Accesible** | Componentes de shadcn/ui (Radix) con los roles y atributos de accesibilidad estándar. Todo se puede usar con teclado, con foco visible (un anillo que aparece al usar el teclado, no al hacer clic), etiquetas en cada campo y contraste AA comprobado en todas las pantallas (claro y oscuro). "Por orden / Por centro" es un grupo de opciones que se usa como los botones de opción de siempre: Tab llega a la elegida y **las flechas eligen la otra** (la vista cambia al instante); si "Por centro" está desactivado, las flechas no hacen nada. Con la tecla Tab aparece **"Saltar a la paginación"** antes de la tabla, para no recorrer todos sus botones. Al abrir el detalle de un centro (o "Página no encontrada") el foco va a su título, para que el lector de pantalla lo anuncie; al **volver a la lista**, el foco regresa al código del centro que se abrió (o al buscador, si ya no está en la página). |

### Rutas (direcciones de la app) — React Router

Desde el 14/10/2026 la app usa **React Router** (`react-router`, versión **8.4.0** desde el 15/10/2026; antes 7.18), la librería de rutas más usada con React: cada pantalla tiene su propia dirección, así se pueden agregar pantallas nuevas sin enredar las que ya existen (pedido del supervisor, por escalabilidad).

| Ruta | Qué muestra |
|---|---|
| `/` | Lleva a `/ordenes`, conservando la búsqueda del enlace (ej. `/?q=cableado` → `/ordenes?q=cableado`). |
| `/ordenes` | La lista **"Por orden"** (una fila por cada fila del Excel). Es la vista por defecto. |
| `/centros` | La lista **"Por centro de negocio"** (una fila por centro, que se abre para ver sus órdenes). |
| `/centros/<código>` | **Detalle de un centro** (ej. `/centros/A2338PY01`): sus datos y todas sus órdenes, con "Volver a la lista". El código va codificado si trae espacios, `/`, `#`, `%`… y no importan mayúsculas ni tildes. (Los códigos `.` y `..` se muestran sin enlace: el navegador los tomaría como carpetas.) |
| cualquier otra | **"Página no encontrada"**, con el botón "Ir al buscador". No descarga el Excel. |
| `/?vista=centro…` (enlace viejo) | Lleva a `/centros` con el resto de la búsqueda. |

- **La búsqueda va en la "query"** (lo que va después de `?`): `q` (buscador), `cliente`, `codigo`, `desc`, `oc`, `tipo`, `estado`, `ord`/`dir` (orden), `pag` (página) y `tam` (filas por página). Ej.: `/centros/A2338PY01?q=cableado&estado=Abierta`.
- **Todas las rutas piden iniciar sesión** (en modo `microsoft`): mientras no hay sesión se ve "Bienvenido" en cualquier dirección. Al volver de Microsoft, la persona regresa a la **misma** dirección (ruta + búsqueda).
- **Publicación:** como `/centros/A2338PY01` no es un archivo, el hosting debe responder `index.html` en esas direcciones: en Netlify lo hace `app/public/_redirects` (`/*    /index.html    200`; Netlify entrega primero los archivos que sí existen) y en Azure Static Web Apps, `navigationFallback` de `staticwebapp.config.json`. La app se publica en la **raíz** del dominio (`base: '/'` en `vite.config.ts`, antes `'./'`): con rutas anidadas, los archivos (`assets/…`, `config.json`, `favicon.svg`, `tema-inicial.js`, el Excel de ejemplo, `redirect.html`) se piden siempre desde `/`. Detalle en la guía, paso 6.

## 3. Cómo probarlo en modo demo (sin Microsoft)

El **modo demo** no pide inicio de sesión y lee un Excel de ejemplo con **datos ficticios** (`app/public/datos/centros-ejemplo.xlsx`: "Cliente Demo A", códigos `CN-0001`…). Sirve para probar y para mostrárselo al jefe.

`app/public/config.json` ya tiene los valores de **producción** (`"modo": "microsoft"`, Excel real). Para ver la demo **no hay que tocarlo**: el comando `dev:demo` le entrega a la app una copia de ese archivo cambiada a `"modo": "demo"` y `"fuente": "archivo-local"` (solo en tu PC; lo publicado no cambia).

Requisitos: **Node.js** (ya instalado: v24; React Router 8 pide 22.22 o más) — es el programa que ejecuta las herramientas de JavaScript en la computadora.

```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npm.cmd ci             # la primera vez y cada vez que cambie package-lock.json (ej. al pasar a la versión React + TypeScript)
npm.cmd run dev:demo   # demo (sin login, Excel de ejemplo) → http://localhost:5173
```

`npm.cmd ci` descarga las librerías (carpeta `node_modules`) exactamente en las versiones de `package-lock.json`. Si después de actualizar el código algo falla con *"'tsc' no se reconoce…"*, *"'oxlint' no se reconoce…"* o *"Cannot find module 'react'"*, es que faltan librerías nuevas: volver a ejecutar `npm.cmd ci`.

`npm run dev` (sin `:demo`) usa la configuración real: pide **Iniciar sesión con Microsoft** y lee el **Excel real** (sirve para probar el login en la PC; la dirección `http://localhost:5173/redirect.html` está registrada en Entra ID, guía paso 1).

> **Si PowerShell dice** *"No se puede cargar el archivo …\npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema"*: es una configuración de seguridad de Windows (normal en PC de empresa). Escribe **`npm.cmd`** en vez de `npm` (ej. `npm.cmd run dev`) o usa el **Símbolo del sistema** (`cmd`). Otra opción es ejecutar una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, pero **solo con permiso de quien administra el equipo**.
>
> **Puertos:** `npm run dev` usa siempre el 5173 y `npm run preview` el 4173 (son los registrados en Microsoft). Si están ocupados, la app **no arranca** y lo avisa: cierra el otro programa (por ejemplo, otro `npm run dev` abierto).

Todos los comandos (siempre dentro de `app/`; en PowerShell, `npm.cmd` en vez de `npm`):

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | La app con la **configuración real** (login de Microsoft + Excel real) en http://localhost:5173. Los cambios en el código se ven al instante. |
| `npm run dev:demo` | La app en **modo demo** (sin login, Excel de ejemplo) en http://localhost:5173, sin tocar `config.json`. |
| `npm run typecheck` | Revisa los **tipos de TypeScript** de todo el código (app, pruebas, configuración y los scripts `.mjs`) sin compilar nada. Si algo no encaja (ej. una función recibe un número donde esperaba texto), muestra el archivo y la línea. |
| `npm run lint` | Revisión automática del código con **oxlint** (`.oxlintrc.json`): sobre todo las **reglas de los hooks de React** que TypeScript no revisa (ej. un `useEffect` que usa un dato y no lo declara). Muestra el archivo, la línea y cómo arreglarlo. |
| `npm test` | Pruebas **unitarias** con Vitest (358): la lógica (búsqueda, filtros, lectura del Excel, Graph, reglas de acceso, rutas…) y los componentes de React (buscador, tabla, paginación, botón de tema, avisos, rutas y detalle de un centro…), sin abrir un navegador. También revisan que escribir en el buscador no vuelva a dibujar la tabla, que la app funcione dentro de `<StrictMode>` y que la pantalla de carga de `index.html` sea igual a la de React. |
| `npm run test:e2e` | Pruebas **de punta a punta** con Playwright (93): compila, abre la app en Chromium y hace clic como una persona (modo demo + un inicio de sesión de Microsoft **simulado**, sin internet), incluidas las rutas (`rutas.spec.ts`: enlace directo, recargar, atrás, 404, a dónde vuelve el foco) las medidas del diseño (`diseno.spec.ts`: márgenes, contornos y contraste del foco en claro y oscuro, foco con el mouse encima o al hacer clic, íconos con desfase de 1 px o menos) y la guía de AIC (`guia-aic.spec.ts`: órdenes una por línea, colores y padding de las tablas, botón principal, y en todas las pantallas solo colores de la paleta y contraste AA). Usan su propia configuración de demostración (`tests/e2e/config-pruebas.ts`), así que pasan igual aunque `config.json` ya tenga los valores de producción. **En una PC nueva**, antes de la primera vez: `npx.cmd playwright install chromium` (descarga el navegador de pruebas; `npm.cmd ci` no lo trae). |
| `npm run build` | "Compila" la app: primero ejecuta `typecheck` y `lint` (si hay un error, **se detiene** y no compila) y después crea la carpeta `dist/` con Vite. |
| `npm run preparar-publicacion` | Ejecuta `build` y deja la copia **lista para Netlify** en `publicar/` (sin archivos temporales de Office `~$…`, con `_redirects` para las rutas: si faltara, se detiene). Al final muestra el modo, la fuente de datos y los permisos de `config.json`. |
| `npm run preview` | Muestra la versión compilada (`dist/`) en http://localhost:4173 con la configuración real. |
| `npm run preview:demo` | Lo mismo, pero en modo demo. |
| `npm run generar-ejemplo` | Vuelve a crear el Excel de ejemplo con datos ficticios. |

Antes de publicar un cambio de código: `npm run typecheck` → `npm run lint` → `npm test` → `npm run test:e2e` → `npm run preparar-publicacion`.

Para cerrar `npm run dev` o `npm run preview`: **Ctrl + C** en la terminal.

## 4. Cómo se actualiza la información

```
ERP ──(bot)──► Excel en SharePoint/OneDrive ──(Microsoft Graph, con tu cuenta)──► App web (solo lectura)
```

1. En el ERP se crea un centro de negocio → el **bot** lo agrega al **Excel** (esto ya existe; no lo toca este proyecto).
2. La app **lee el Excel en vivo** cada vez que se abre, cuando se pulsa **Actualizar** y sola cada 10 minutos.
   En la auto-actualización primero pregunta "¿el Excel cambió?" (algo muy liviano) y solo lo descarga de nuevo si cambió.
3. La app **no modifica** el Excel: es solo de consulta.

> **(por confirmar)** Se interpretó "la información debe poder actualizarse" como *"la app siempre muestra lo último que el bot escribió"*. Si en realidad se quiere **editar** datos desde la app, habría que cambiar el diseño (permisos de escritura y reglas de quién puede editar).

## 5. ¿Hay servidor?

**No: todo corre en el navegador (SPA).** El login lo hace Microsoft (MSAL) y el Excel se lee con Microsoft Graph usando el token de la persona (permisos delegados); no hay backend ni secretos que custodiar.

```
┌─────────────────────────────┐
│ Navegador de la persona     │ 1. pide la página ────────────────────► Netlify
│                             │ ◄── index.html, assets/*.js, config.json (archivos fijos)
│ Aquí corre TODA la app      │
│ (React): lee el Excel       │ 2. "Iniciar sesión con Microsoft" ────► login.microsoftonline.com (Entra ID)
│ (SheetJS), busca, filtra,   │ ◄── token de la persona (vuelve por redirect.html)
│ ordena y exporta.           │
│                             │ 3. "¿dónde está el Excel?" + token ───► graph.microsoft.com
│                             │ ◄── nombre, fecha y un enlace temporal de descarga
│                             │
│                             │ 4. descarga con ese enlace ───────────► *.sharepoint.com
│                             │ ◄── el archivo .xlsx (si a la persona le compartieron el Excel)
│                             │
└─────────────────────────────┘
```

Cada flecha sale **del navegador** y su respuesta **vuelve al navegador**: no es una cadena (Netlify no le pasa nada a Microsoft ni Graph le "reenvía" el Excel a la app). Netlify y Microsoft son servicios de terceros; ninguno es un servidor propio de AIC.

En simple:
- **SPA** ("aplicación de página única"): la página se descarga una vez y después todo pasa en el navegador. Netlify es como una carpeta compartida en internet: solo entrega los archivos de `publicar/`.
  - Las direcciones de cada pantalla (`/ordenes`, `/centros/<código>`) **no son archivos**: las resuelve la app en el navegador (React Router). Por eso Netlify, con el archivo `_redirects`, entrega `index.html` en cualquier dirección que no sea un archivo, y la app muestra la pantalla que corresponde (sección 2 y guía, paso 6).
- **Backend** (servidor propio): un programa que corre en una computadora de la empresa o en la nube, recibe pedidos y guarda claves. **Esta app no tiene**: no hay nada que mantener encendido, actualizar ni proteger aparte de los archivos publicados.
- **La descarga del Excel va directo del navegador a SharePoint** (`*.sharepoint.com`), con un enlace temporal (dura pocos minutos) que entrega Graph: ningún servidor propio interviene ni guarda una copia del archivo.
- **Token**: un "pase" temporal que Microsoft le da a la persona al iniciar sesión. La app lo usa para pedirle el Excel a Graph **en nombre de esa persona** (eso son los **permisos delegados**): Graph solo entrega lo que esa persona ya puede abrir en SharePoint. El token vence solo y nunca sale del navegador más que hacia Microsoft.
- **Sin secretos:** el `clientId` y el `tenantId` de `config.json` son datos **públicos** (identifican la app, no dan acceso). La app no usa contraseñas de aplicación ni "client secret" (ver la guía, "Conceptos en 1 minuto" y "Seguridad: qué protege qué").

## 6. Quién puede entrar (resumen)

- Botón **Iniciar sesión con Microsoft** (se usa la librería **MSAL** de Microsoft).
- Después del inicio de sesión la app revisa que el **nombre de inicio de sesión** (UPN, normalmente igual al correo) termine en `@aic.pe` o `@jaicoscorp.com` (y, si se configura, que la cuenta sea del tenant de la empresa). Si no: "Tu cuenta no tiene acceso" + cerrar sesión. *(por confirmar con el administrador que el UPN del personal termina en esos dominios)*
- **Importante:** esa revisión ocurre en el navegador, así que es solo una capa de comodidad. La **seguridad real** está en Microsoft 365: (1) la app registrada en Entra ID solo para la empresa, (2) opcionalmente "asignación de usuario requerida", y (3) **los permisos del propio Excel en SharePoint**: la app lee el archivo *con la cuenta de la persona*, así que si a alguien no le compartieron el Excel, no puede verlo aunque entre a la app. Detalle en la guía.

## 7. Estructura de carpetas

```
sitio-web/
├── README.md                          ← este archivo
├── GUIA-CONFIGURACION-MICROSOFT.md    ← paso a paso para el administrador de Microsoft 365 y la publicación
├── datos/                             ← archivos recibidos para el proyecto (vacía por ahora)
├── pruebas/plan-de-pruebas.md         ← pruebas que hace una persona antes de entregar (con casillas)
├── publicar/                          ← copia lista para Netlify (la crea npm run preparar-publicacion; no se edita)
└── app/                               ← la aplicación (React 19 + TypeScript)
    ├── index.html                     ← la página: <div id="raiz"> con la cabecera y "Cargando…" (lo que se ve mientras
    │                                     baja el código, igual a lo primero que dibuja React: no hay salto al cargar)
    ├── redirect.html                  ← página "puente" a la que vuelve Microsoft tras el inicio de sesión (sin React)
    ├── public/                        ← se copia tal cual a dist/
    │   ├── config.json                ← CONFIGURACIÓN (la única copia que se edita; npm run build la copia a dist/)
    │   ├── tema-inicial.js            ← aplica el modo claro/oscuro elegido antes de pintar (para que no "parpadee")
    │   ├── datos/centros-ejemplo.xlsx ← Excel de ejemplo con datos ficticios (modo demo)
    │   ├── netlify.toml / _headers    ← Netlify: publicar la carpeta tal cual y no guardar config.json en caché
    │   ├── _redirects                 ← Netlify: en las rutas de la app (/centros/A2338PY01…) entregar index.html
    │   ├── staticwebapp.config.json   ← Azure Static Web Apps (otra opción de hosting): cabeceras de seguridad y rutas
    │   │                                 (navigationFallback = lo mismo que _redirects)
    │   └── favicon.svg                ← ícono de la pestaña
    ├── src/
    │   ├── main.tsx                   ← punto de entrada: monta <Enrutador><App /></Enrutador> en index.html
    │   ├── App.tsx                    ← la página completa: cabecera + la pantalla que toque (cargando, mensaje, login
    │   │                                 y, con la sesión iniciada, las rutas)
    │   ├── redirect.ts                ← lógica de redirect.html (MSAL v5, sin React)
    │   ├── estilos.css                ← Tailwind CSS + la marca de AIC: variables del tema de shadcn/ui (claro/oscuro),
    │   │                                     letra Calibri, columna de contenido y foco de los elementos propios
    │   ├── components/ui/             ← componentes de shadcn/ui TAL CUAL los genera "npx shadcn add" (no se editan)
    │   ├── lib/utils.ts               ← cn() para juntar clases de Tailwind (lo usa la herramienta de shadcn/ui)
    │   ├── componentes/               ← piezas de la pantalla (.tsx = TypeScript + JSX, el "HTML" de React)
    │   │   ├── Cabecera.tsx, BotonTema.tsx              ← título, usuario, "Cerrar sesión", botón ☀️/🌙
    │   │   ├── PantallaCarga.tsx, PantallaLogin.tsx     ← "Cargando…" y "Bienvenido" (botón de Microsoft)
    │   │   ├── Mensaje.tsx                              ← "Tu cuenta no tiene acceso", "Falta configurar…", errores
    │   │   ├── Enrutador.tsx                            ← React Router (BrowserRouter) para main.tsx y las pruebas
    │   │   ├── RutasApp.tsx                             ← TABLA DE RUTAS: /, /ordenes, /centros, /centros/:codigo, 404
    │   │   ├── PantallaApp.tsx                          ← lo común a las rutas ("layout"): Excel, búsqueda, Actualizar,
    │   │   │                                               avisos y "Columnas detectadas"; en el medio, la ruta
    │   │   ├── VistaLista.tsx                           ← /ordenes y /centros: buscador, filtros, tabla y paginación
    │   │   ├── DetalleCentro.tsx                        ← /centros/:codigo: ficha del centro y todas sus órdenes
    │   │   ├── PaginaNoEncontrada.tsx                   ← "Página no encontrada" (cualquier otra dirección)
    │   │   ├── Buscador.tsx, Filtros.tsx                ← caja de búsqueda y panel de filtros
    │   │   ├── BarraResultados.tsx                      ← "Por orden / Por centro", contador, filas por página, exportar
    │   │   ├── TablaOrdenes.tsx, TablaCentros.tsx       ← las dos vistas de la tabla
    │   │   ├── Celdas.tsx, Resaltado.tsx                ← caja con scroll de las tablas, títulos que ordenan, celdas (el código =
    │   │   │                                               enlace al detalle; las órdenes, una por línea) y resaltado <mark>
    │   │   ├── Paginacion.tsx                           ← « ‹ Página X de Y › » (el foco no se pierde)
    │   │   ├── Avisos.tsx, ColumnasDetectadas.tsx       ← avisos (Alert de shadcn/ui), aviso flotante y "Columnas detectadas"
    │   │   ├── AyudaFlotante.tsx                        ← Tooltip de shadcn/ui + opción sinDescripcion (no repetir el nombre)
    │   │   ├── OpcionesBoton.tsx                        ← "Por orden / Por centro": RadioGroup + ButtonGroup + Button
    │   │   └── Iconos.tsx                               ← íconos SVG (16–18 px) y la ruedita de "Cargando…"
    │   ├── hooks/                     ← "estado" y efectos reutilizables (funciones use… de React)
    │   │   ├── useArranque.ts         ← lee config.json, prepara MSAL y decide qué pantalla va
    │   │   ├── useExcel.ts            ← descarga y lee el Excel; Actualizar y auto-actualización
    │   │   ├── useBusqueda.ts         ← búsqueda, filtros, vista, orden y página (espera de 200 ms al escribir)
    │   │   ├── useEstadoUrl.ts        ← lee y guarda ese estado en la dirección con React Router (enlace para
    │   │   │                             compartir; botón atrás/adelante)
    │   │   ├── useTema.ts             ← modo claro/oscuro
    │   │   └── useAvisoFlotante.ts, useMediaQuery.ts
    │   └── logica/                    ← reglas SIN pantalla (TypeScript puro; se prueban sin navegador)
    │       ├── tipos.ts               ← "forma" de los datos: Fila, Celda, Columna, ResultadoLectura, Filtros…
    │       ├── config.ts              ← lee config.json (ConfigSinValidar) y lo revisa: revisarConfig() → Config
    │       ├── auth.ts                ← inicio de sesión con Microsoft (MSAL v5; tipo Sesion)
    │       ├── acceso.ts              ← reglas de quién puede entrar (dominios, tenant)
    │       ├── graph.ts               ← lee el Excel desde SharePoint/OneDrive (Microsoft Graph; ErrorDatos, respuestas tipadas)
    │       ├── datos.ts               ← abre el Excel y limpia/ordena las filas (SheetJS)
    │       ├── filtros.ts             ← buscar, filtrar, ordenar, agrupar, paginar (funciones puras)
    │       ├── vista.ts               ← qué se ve: resultados (filtrar/ordenar) → página y contador, filtros disponibles
    │       ├── tabla.ts, formato.ts   ← reglas de la tabla (▲▼, aria-sort, contador, encabezado de marca y filas
    │       │                             alternas) y formato de horas/fechas
    │       ├── estado-url.ts          ← convierte la búsqueda en la query de la dirección (?q=…) y viceversa
    │       ├── rutas.ts               ← rutas (/ordenes, /centros…), enlaces viejos (?vista=centro), archivos desde "/"
    │       ├── centro.ts              ← detalle de un centro: buscarlo por su código y sus estados
    │       ├── ordenes.ts             ← varias órdenes en una celda: separarOrdenes() (una por línea) y cómo contarlas
    │       ├── exportar.ts            ← descarga a Excel (órdenes una por línea + "Ajustar texto")
    │       ├── tema.ts, portapapeles.ts ← reglas del modo claro/oscuro y "copiar código"
    │       └── listas.ts              ← en(lista, i): leer una posición que se sabe que existe (ver noUncheckedIndexedAccess)
    ├── scripts/
    │   ├── generar-ejemplo.mjs        ← crea el Excel de ejemplo
    │   ├── preparar-publicacion.mjs   ← compila y copia a publicar/ (npm run preparar-publicacion)
    │   ├── archivos-temporales.mjs    ← deja afuera los "~$…" que crea Excel (llevan tu nombre de usuario)
    │   └── config-demo.mjs            ← modo demo en la PC sin tocar config.json (npm run dev:demo)
    ├── tests/unit/                    ← pruebas unitarias (Vitest, .ts/.tsx); graph-resolver.test.ts = cómo se encuentra
    │                                     el Excel real; componentes.test.tsx = componentes de React con clics y teclado;
    │                                     rendimiento.test.tsx = escribir no redibuja la tabla; strictmode.test.tsx = la app
    │                                     dentro de <StrictMode>; pagina-inicial.test.tsx = index.html igual a React;
    │                                     tipos.test.tsx = tipos que deben dar error; lint.test.ts, codigo-fuente.test.ts
    │                                     y documentacion.test.ts = revisiones del código y de esta documentación;
    │                                     rutas.test.ts + rutas-app.test.tsx = rutas, detalle y botón atrás;
    │                                     despliegue.test.ts = _redirects, staticwebapp y base "/";
    │                                     shadcn-natural.test.ts = los componentes de shadcn/ui sin cambios a mano
    ├── tests/e2e/                     ← pruebas en navegador (Playwright, .ts); config-pruebas.ts = su configuración fija;
    │                                     colores.ts = leer colores en cualquier notación (rgb, oklab…) y la paleta;
    │                                     rutas.spec.ts = rutas; diseno.spec.ts = márgenes, contornos e íconos;
    │                                     guia-aic.spec.ts = órdenes una por línea, guía de AIC, paleta y contraste AA
    ├── tsconfig.json                  ← reglas de TypeScript para src/ (modo estricto + noUncheckedIndexedAccess)
    ├── tsconfig.node.json             ← reglas de TypeScript para pruebas, configuración y scripts .mjs (con JSDoc)
    ├── .oxlintrc.json                 ← reglas de npm run lint (hooks de React y errores seguros)
    ├── components.json                ← configuración de shadcn/ui (dónde van los componentes, estilo, alias "@/")
    ├── vite.config.ts                 ← compilación: React, Tailwind, alias "@/", base "/", CSP, sin "~$…", modo demo
    ├── vitest.config.ts / playwright.config.ts
    └── package.json                   ← lista de librerías y comandos
```

### Cómo se reconocen las columnas del Excel

Todavía **no tenemos el Excel real** (por confirmar sus columnas). Por eso la app:

- **Busca sola la fila de títulos** (no tiene que ser la fila 1). Se puede fijar con `datos.filaEncabezado`.
- Reconoce cada columna por su **nombre**, sin importar tildes, mayúsculas ni puntos, usando la lista de nombres posibles de `columnas` en `config.json`. Ej.: `"N° Orden"`, `"Nro. OC"`, `"Nº O.C."`, `"O/C"` y `"Orden de compra"` se reconocen como la orden de compra.
- No confunde columnas de otra cosa: `"Código Cliente"` **no** se toma como código del centro.
- Las columnas que no reconoce **se muestran igual**, salvo las de **`columnasOcultas`** (por defecto, las que tienen "moneda" o "monto" en el título, como palabra completa: *Monto*, *Monto total*, *Monto (S/)*, *Moneda*). Esas no se muestran, no se buscan, no se exportan y no aparecen en la vista por centro. Nunca se oculta una columna que la app usa como código, descripción, cliente, orden, tipo o estado.
- **Estado:** reconoce *Estado*, *Estado de la orden*, *Estado OC*, *Estado del centro*, *Situación*, *Status*… y arma el desplegable "Estado" con sus valores (si un valor está escrito de varias formas, como *abierta* y *Abierta*, es una sola opción y se muestra la forma más usada). No es obligatoria: si el Excel no la tiene (o la columna está vacía), el filtro no aparece. Lo mismo con *Tipo de orden*.
- Si falta una columna importante, muestra un aviso con **cuáles faltan** (y qué hojas tiene el Excel) y desactiva ese filtro. Si no se indica la hoja, lee la primera hoja **visible** (se salta las ocultas).
- Si el centro se escribe **una sola vez** y las filas de abajo (sus otras órdenes) dejan vacíos código y descripción, la app las une al centro de arriba ("rellenar hacia abajo", `datos.rellenarHaciaAbajo` en `config.json`). *(por confirmar cómo viene el Excel real: centro en cada fila, celdas combinadas o una sola vez)*
- Aguanta filas vacías, celdas combinadas, fechas guardadas como número (también del sistema 1904 de Mac) o como texto, números guardados como texto, ceros a la izquierda (`0004500123`), números largos (`450012345678`, sin pasar a `4.5E+11`) y espacios de más.
- Los códigos con forma de fecha (`10-01-0002`) se tratan como códigos, no como fechas.
- Las celdas con error de fórmula (`#N/A`) se ven tal cual, pero no se toman como código ni como cliente. Si hay fórmulas **sin resultado guardado** (se verían vacías), muestra un aviso.
- Al final de la página, **"Columnas detectadas en el Excel"** muestra qué columna usó para cada cosa, cuáles ocultó y (con el Excel real) el `driveId` e `itemId` del archivo en SharePoint. Con el Excel real se revisa ahí y, si hace falta, se agregan los nombres reales en `config.json`.

## 8. Decisiones tomadas (y por qué)

| Decisión | Por qué |
|---|---|
| **React 19 + TypeScript estricto + Vite** *(13/10/2026, antes JavaScript sin librería)* | Pedido del supervisor, por escalabilidad (detalle abajo). Vite sirve la app en la PC y la "compila"; TypeScript solo revisa los tipos. |
| **La app no tiene servidor propio** (es una "página estática", SPA) | Más barata y simple de publicar (hoy en el plan gratuito de Netlify). El inicio de sesión lo hace Microsoft y los datos los da Microsoft Graph (sección 5). |
| **Leer el Excel en vivo** en vez de copiar los datos | Así siempre se ve lo último que dejó el bot, sin otro proceso que sincronice. |
| **Permisos delegados `User.Read` + `Files.Read.All`** | Solo lectura y siempre limitado a lo que el usuario ya puede ver. Al iniciar sesión solo se pide `User.Read`: si falta que un administrador apruebe `Files.Read.All`, la persona igual entra y la app le explica qué pedir. Detalle en la guía. |
| **`redirect.html` como página de retorno** | Es lo que recomienda MSAL versión 5 (la instalada): una página "puente" mínima para el retorno del inicio de sesión. |
| **SheetJS (`xlsx` 0.20.3)** para leer y exportar Excel | Versión oficial del sitio de SheetJS (`cdn.sheetjs.com`; la de npm, 0.18.5, está desactualizada y tiene 2 avisos de seguridad). |
| **Política de seguridad (CSP)** al compilar | Si una celda del Excel trajera código, el navegador no lo ejecuta. Además, React pone todo dato del Excel como **texto** (lo "escapa"): el resaltado de la búsqueda se arma con elementos `<mark>` de React y **nunca** con `dangerouslySetInnerHTML` (hay pruebas que lo verifican, ej. una celda con `<img onerror=…>` se ve como texto). |
| **Sesión guardada en el navegador (`localStorage`)** | Para no pedir inicio de sesión en cada pestaña. Se puede cambiar a `sessionStorage` en `config.json` si se prefiere que se cierre al cerrar la pestaña. |
| **React Router (8.4.0 desde el 15/10/2026), modo "declarativo"** (`<BrowserRouter>` + `<Routes>`) *(14/10/2026)* | Pedido del supervisor, por escalabilidad: cada pantalla es una ruta (tabla en la sección 2). Se eligió el modo declarativo y no el de "datos" (`createBrowserRouter` con *loaders*) porque el inicio de sesión debe terminar **antes** de que las rutas hagan algo: las rutas solo se muestran con la sesión iniciada (fase `app` de `useArranque`), así MSAL procesa la vuelta de Microsoft en la dirección exacta donde empezó. `useTransitions={false}` (en `Enrutador.tsx`): la dirección y la búsqueda cambian juntas. **Paso a la 8.4.0** (pedido de Gustavo: *"la 8.4, revise el código y usa una versión pasada"*): según la guía oficial de actualización de v7 a v8, los cambios grandes de v8 son del modo "datos"/"framework" (middleware siempre activo, `meta` sin `data`, se elimina `react-router-dom`, solo ESM) y piden Node 22.22+ y React 19.2.7+ (ya los tenemos: Node 24, React 19.3). La app usa el modo declarativo e importa todo de `react-router`, así que no hubo que cambiar código; `useTransitions` funciona igual. Lo confirman las mismas pruebas de rutas (enlaces viejos, detalle, 404, atrás, login que vuelve a la ruta). |
| **La búsqueda sigue en la query; la vista pasa a la ruta** | Lo que filtra (`?q=…&cliente=…&ord=…&pag=…`) queda en la dirección como antes (enlace para compartir). Cambiar un filtro **reemplaza** la dirección (no se llena el historial con cada tecla); cambiar de vista o abrir un centro **agrega** una entrada, así el botón atrás vuelve a la pantalla anterior con sus filtros. Si la dirección cambia por fuera (atrás/adelante), `useEstadoUrl` la vuelve a leer en el mismo dibujo (no en un efecto, para no escribir un estado viejo encima). `?vista=centro` (enlaces viejos) se sigue leyendo y lleva a `/centros`. |
| **Un "layout" para las rutas** (`PantallaApp` + `<Outlet />`) | El Excel, la búsqueda y los centros abiertos viven en `PantallaApp`, que no cambia al pasar de `/ordenes` a `/centros` o al detalle: el Excel se descarga **una vez** y los filtros se conservan. "Página no encontrada" va fuera del layout (no descarga el Excel). |
| **Al volver de Microsoft, a la misma ruta** | MSAL guarda la dirección completa (ruta + query) al pulsar "Iniciar sesión" y `redirect.html` lleva de vuelta a ella. `redirect.html` está siempre en la **raíz** (la registrada en Entra ID), aunque se inicie sesión desde `/centros/…`. |
| **Diseño más sobrio** *(14/10/2026, pedido del supervisor; márgenes cambiados el 15/10/2026 y, ese mismo día, contornos y foco pasaron a ser los de shadcn/ui: ver 8.1)* | Columna de contenido de máx. 1120 px (antes 1240) con margen lateral `clamp(20px, 6vw, 96px)` (antes `clamp(16px, 4vw, 56px)`); por debajo de 720 px, `max(16px, 8.5vw - 18px)` (16 px en el celular vertical y sin salto a 720 px); bordes de 1 px; foco con el teclado = el de shadcn/ui (borde `--ring` + anillo de 3 px al 50 %, con `:focus-visible`), con un contorno de 2 px en alto contraste de Windows; íconos SVG de 16–18 px con `display:block` + `flex-shrink:0` dentro de botones `inline-flex`; flecha de los desplegables = el ícono del NativeSelect de shadcn/ui. Lo mide `tests/e2e/diseno.spec.ts`. |
| **Varias órdenes en una celda: `separarOrdenes()`** *(15/10/2026)* | Regla (`logica/ordenes.ts`): se corta **antes** de cada `OC` u `OS` que empieza una orden: palabra completa (no dentro de "ROC" ni pegada a otra palabra o número), en mayúsculas o minúsculas, seguida del número con o sin `-`, `:`, `N°`, `Nº`, `N.°`, `N.º`, `No.`, `Nro.` o `#` en medio; también con puntos (`OC.`, `O.C.`) y `OC/OS 123` (una sola orden). Así nunca se corta `OC N° 3519348` ni `OC-0000098263-2025`, y "OS de mantenimiento" (sin número) no se toma como orden. No se pierde texto (lo de antes de la primera orden queda como su propia línea) y se quitan los espacios de más; si no reconoce ninguna orden, la celda se muestra tal cual. **"N° de órdenes"** cuenta cada orden sin repetir: se compara el tipo y **solo el número** (`OC N° 3519348`, `O.C. 3519348` y `OC 3519348 (parcial)` son la misma); una celda sin "OC/OS" reconocibles cuenta como una, como antes. El resaltado se calcula una vez sobre toda la celda y se reparte entre las líneas. Lo prueban `tests/unit/ordenes.test.ts` (ejemplos reales y casos borde) y `guia-aic.spec.ts`. |
| **Exportar: una orden por línea en la misma celda** *(15/10/2026)* | Se eligió así (y no una fila o una columna por orden) para que el Excel exportado tenga **las mismas filas** que la tabla y que el Excel original (el contador, los filtros y las sumas no cambian) y el **mismo texto** (los espacios entre órdenes pasan a ser saltos de línea: el filtro "contiene" de Excel sigue sirviendo). Sin "Ajustar texto", Excel mostraría las órdenes pegadas en una sola línea; la versión gratuita de SheetJS no escribe estilos, así que la app agrega "Ajustar texto" (y alineación arriba) solo a esas celdas en el `styles.xml` del archivo ya armado (`ajustarTextoDeVariasLineas` en `exportar.ts`). El ancho de la columna se calcula con la orden más larga. |

### Por qué React + TypeScript

Pedido del supervisor: *"Priorizar el uso de TypeScript y una librería como React por temas de escalabilidad."* En la práctica:

- **TypeScript** = JavaScript con **tipos**: cada dato tiene una "forma" declarada (ej. `Fila`, `Celda`, `Config`, `ResultadoLectura`, `Filtros`, `Sesion`, `ErrorDatos` y las respuestas de Graph, en `src/logica/tipos.ts` y en cada módulo). Si alguien cambia una forma o escribe mal un nombre, `npm run typecheck` (y el editor) marcan **todos** los lugares a corregir **antes** de publicar. Con la app creciendo (más columnas, más pantallas, más personas tocando el código), eso evita errores que antes solo se veían al usarla.
- **React** = la pantalla se arma con **componentes** (piezas con nombre: `Buscador`, `Filtros`, `TablaOrdenes`…) que se dibujan solos a partir del estado. Antes, `main.js` (≈830 líneas) mostraba/ocultaba y reescribía partes del HTML a mano; ahora agregar una pantalla o una columna es agregar o cambiar un componente, sin tocar el resto. Es la librería de interfaz más usada: es fácil encontrar ayuda y personas que la conozcan.
- **Modo estricto** (`"strict": true` en `tsconfig.json`): no se permiten valores "sin tipo" (`any` implícito) y TypeScript obliga a revisar los casos en que un dato puede faltar (`null`/`undefined`).

Decisiones de la migración:

| Decisión | Por qué |
|---|---|
| **TypeScript 7.0.2** (la estable actual) | Se probó con Vite 8, Vitest 5 y Playwright 1.61 y todo funciona (`typecheck`, pruebas y `build`), así que **no hizo falta** bajar a la 5.x. TypeScript solo **revisa** (`noEmit`): quien convierte el código a JavaScript es Vite, así que la versión de TypeScript no cambia lo que se publica. (Única consecuencia: ESLint + typescript-eslint no funciona con TypeScript 7; por eso el linter es oxlint, ver abajo.) |
| **Tipos estrictos de verdad** (`noUncheckedIndexedAccess`, `ConfigSinValidar`, `Direccion`…) | Además de `strict`: `lista[i]` puede no existir y TypeScript obliga a revisarlo; `config.json` llega como `ConfigSinValidar` y solo `revisarConfig()` lo convierte en `Config` (no se puede usar sin revisar); la dirección de orden solo puede ser `"asc"`/`"desc"`. `tests/unit/tipos.test.tsx` comprueba que esos errores sigan apareciendo. |
| **oxlint** para revisar las reglas de React (`npm run lint`, dentro de `build`) | Las reglas de los hooks (`rules-of-hooks`, `exhaustive-deps`) no las revisa TypeScript y un error ahí hace que la pantalla muestre datos viejos. El estándar es ESLint + typescript-eslint, pero typescript-eslint exige TypeScript < 6.1; oxlint no depende de TypeScript y trae las mismas reglas. |
| **La tabla no se redibuja al escribir** (`memo`, `useCallback`, resultados aparte de la página) | Lo escrito en el buscador se aplica 200 ms después; mientras tanto solo cambia la caja de texto. Las tablas, la paginación y "Columnas detectadas" están en `memo()` con props estables, y cambiar de página no vuelve a filtrar ni ordenar todas las filas. Importa en el celular con el Excel real (miles de filas). Lo revisa `tests/unit/rendimiento.test.tsx`. |
| **`index.html` con la cabecera y "Cargando…"** | Es lo que se ve mientras baja el código (con React pesa más que antes): igual a lo primero que dibuja React, así nada salta al cargar y el botón ☀️/🌙 ya muestra el ícono correcto (`tema-inicial.js`). Lo revisan `pagina-inicial.test.tsx` y 3 pruebas en navegador. |
| **`@azure/msal-browser` v5 directo (sin `@azure/msal-react`)** | El inicio de sesión ya estaba resuelto y probado con msal-browser (`logica/auth.ts`): vuelta por la página puente `redirect.html` (MSAL v5), revisión de dominios `aic.pe`/`jaicoscorp.com` y del tenant **después** del login, `Files.Read.All` pedido recién al leer el Excel y mensajes claros si falta el consentimiento. msal-react obliga a envolver toda la app en su `MsalProvider` (MSAL se cargaría también en modo demo, que hoy no lo descarga) y no agrega nada de eso; la app solo necesita saber "en qué fase está el arranque", y eso lo da el hook `useArranque`. Menos piezas = menos cosas que actualizar. |
| **Estado con React puro (hooks), sin Redux ni otra librería** | El estado es poco y claro: (1) la **búsqueda** (texto, filtros, vista, orden, página) vive en `useBusqueda` y se copia a la dirección (`useEstadoUrl`), así el enlace se puede compartir; (2) los **datos del Excel** viven en `useExcel` (carga, Actualizar, auto-actualización); (3) el **arranque** (`useArranque`) es una sola variable con la fase (`cargando`, `login`, `denegado`, `app`…) y TypeScript obliga a tratar cada una. Lo que se ve (filas, contador, opciones de los filtros) se **calcula** con funciones puras de `logica/vista.ts`, que se prueban sin navegador. |
| **Mismos ids, textos y `aria-*`** | Las 39 pruebas en navegador (Playwright) son el "contrato" de comportamiento: pasan **sin cambiar ningún selector** (solo se les agregaron tipos al pasarlas a `.ts`; después se sumaron 3 de la pantalla de carga). `estilos.css` no cambió en la migración (salvo un comentario; el 14/10/2026 sí cambió, por el pedido de diseño). Con React Router (14/10/2026) solo se ajustaron las direcciones esperadas (`?vista=centro` → `/centros`), sin quitar comprobaciones. Con shadcn/ui (15/10/2026) se conservaron ids, roles, etiquetas y textos; solo cambiaron los selectores de piezas que ya no son las mismas etiquetas HTML (ver 8.2), con la misma comprobación. Con los componentes "naturales" (15/10/2026, rama `shadcn-natural`) las pruebas de `app.spec.ts`, `rutas.spec.ts` y `microsoft-simulado.spec.ts` pasan sin cambios; cambiaron solo las de colores y foco (lista en 8.2). Los avisos (`#aviso-flotante`, `#aviso-error`) vuelven a leerse en voz alta aunque el mensaje se repita, como antes. |
| **`redirect.html` sin React** | Es una página puente mínima: solo le pasa la respuesta de Microsoft a la app (`src/redirect.ts`). Así carga rápido y no depende de la app. |

**Sobre SheetJS:** la versión de npm (0.18.5) tiene 2 avisos de seguridad de nivel **alto** ("prototype pollution" y "ReDoS") que se activan con un Excel **hecho a propósito para atacar**. Por eso la app usa la **0.20.3**, instalada desde el sitio oficial:
- Para actualizarla en el futuro: `npm.cmd install --save-exact https://cdn.sheetjs.com/xlsx-<versión>/xlsx-<versión>.tgz` (ver la versión vigente en `https://cdn.sheetjs.com/xlsx-latest/package/package.json`) y correr las pruebas.
- Igual (buena práctica), **solo la cuenta del bot** debe tener permiso de edición sobre el Excel (guía, paso 4.2).

### 8.1 Guía de estilo de AIC sobre shadcn/ui "natural": colores, letra y contraste *(15/10/2026)*

La guía oficial de AIC (la entregó Gustavo; es material de la empresa y **no** se copia aquí) define una paleta de 9 colores, la letra Calibri y el formato de las tablas. Desde el último pedido de Gustavo del 15/10/2026 (*"que use los estilos naturales de shadcn … sin cambios, solo agregando el estilo de marca para que agregue más suavidad a las cosas"*) la marca se aplica **solo** de tres formas:

1. **Variables del tema de shadcn/ui** en `app/src/estilos.css` (`:root` = claro; el bloque oscuro = oscuro): `--primary`, `--border`, `--ring`, `--muted`… Los componentes ya usan esas variables, así que toman los colores de AIC **sin tocarlos**.
2. **La letra:** `Calibri, Carlito, "Segoe UI", sans-serif` en toda la app (también en códigos y tablas). La app **no trae la letra adentro** y no descarga letras de internet (la CSP solo permite archivos propios): usa la que tenga el equipo. En **Windows** (y en equipos con Office) se ve Calibri; Carlito (la versión libre de Calibri, con las mismas medidas) solo se ve si está instalada (ej. algunos Linux). En **celulares Android, iPhone y Mac sin Office** no hay ninguna de las dos y el navegador usa la letra del sistema (Roboto o San Francisco): la página se ve bien igual, pero no con la letra de la guía. Si se quiere Calibri "en todos lados", se puede incluir Carlito dentro de la app (licencia libre OFL; un archivo `.woff2` propio, que la CSP sí permite) *(por confirmar con Gustavo)*.
3. **Clases en el lugar de uso**, solo de **medidas** (anchos, márgenes, grid, alto máximo, scroll) y, en las tablas, el **encabezado de marca** (`bg-primary` = Primary Blue, texto blanco en negrita y centrado) y las **filas alternas** (`bg-muted` = Light Gray). Están en `src/logica/tabla.ts` (`CLASE_ENCABEZADO`, `CLASE_FILA_ALTERNA`).

Sombras, esquinas redondeadas (`--radius` = 0,625rem: avisos 10 px, tarjetas 14 px, botones 8 px), transiciones, anillos de foco, opacidades y fundidos son **los de shadcn/ui**: esa es la "suavidad". Por eso ahora se ven, por ejemplo, el Primary Blue al 80 % en un botón con el mouse encima, el anillo de foco Medium Blue al 50 % o sombras negras muy suaves: son **transparencias de colores de la paleta** y el criterio nuevo las acepta. Lo que **no** se acepta (y la prueba lo detecta) es un color ajeno a la marca: el azul del navegador, un color de Tailwind que no sale del tema, el rojo de shadcn/ui… La paleta no tiene rojo: `--destructive` es Primary Blue, así que un error se distingue por su texto azul, su ícono y `role="alert"`. El **texto seleccionado** usa la paleta (`::selection`: blanco sobre Primary Blue; en oscuro, Primary Blue sobre Light Blue) en vez del azul del navegador. Única excepción: el logo de Microsoft del botón de inicio de sesión (es la marca de Microsoft).

Qué se ve distinto respecto de la versión anterior (la que adaptaba los componentes):

- **Avisos:** el Alert de shadcn/ui (tarjeta blanca con borde gris) en vez de la "caja de nota" (fondo Light Blue con borde izquierdo grueso); el error, con texto Primary Blue.
- **Tablas:** encabezado Primary Blue con texto blanco en negrita (igual), filas alternas Light Gray (igual), pero con las líneas y el espacio de la Table de shadcn/ui: una línea gris entre filas (sin bordes verticales ni bordes Dark Blue en el encabezado) y 8 px de espacio en las celdas. La fila con el mouse encima y el centro abierto de "Por centro" se pintan con el fondo suave de shadcn/ui (`bg-muted/50`) en vez de la raya izquierda. El ▲▼ de una columna sin ordenar va al 60 % del color del texto del encabezado.
- **Página:** fondo White (antes Light Gray), como shadcn/ui; las tarjetas se distinguen por su contorno fino y su sombra.
- **Botones, cajas y desplegables:** esquinas, sombra y anillo de shadcn/ui; desactivados al 50 % de opacidad; la ayuda flotante y el aviso flotante aparecen con un fundido.
- **Foco:** el de shadcn/ui (borde Medium Blue + anillo de 3 px al 50 %). En los botones aparece solo con el teclado; en cajas de texto y desplegables, también al hacer clic (así es shadcn/ui: el navegador las marca `:focus-visible`; antes la app lo quitaba con `logica/modalidad.ts`, que se eliminó) *(por confirmar con Gustavo)*. Los enlaces y demás elementos propios llevan un contorno de 2 px del color `--ring`.
- **Cajas de filtros desactivadas:** shadcn/ui no les deja recibir el mouse (`pointer-events: none`), así que su `title` ("motivo") ya no aparece al pasar el mouse; los lectores de pantalla lo siguen leyendo.

**Modo oscuro** *(por confirmar con Gustavo)*: shadcn/ui trae su variante `dark:`; aquí se conecta al botón ☀️/🌙 (`<html data-tema>`, `@custom-variant dark` en `estilos.css`) y sus variables se arman con la paleta: fondo Black y texto White; `--primary` Light Blue con texto Primary Blue (botón principal, opción elegida, enlaces, títulos y encabezado de las tablas); filas alternas Primary Blue; bordes blanco al 10 % (como shadcn/ui); cajas de texto con borde Gray.

Variables del tema, con el contraste medido (WCAG 2.1 AA pide 4,5:1 en texto normal y 3:1 en bordes de controles, íconos y foco):

| Variable | Para qué | Claro | Oscuro |
|---|---|---|---|
| `--background` / `--foreground` | Fondo de la página / texto | White / Black (21:1) | Black / White (21:1) |
| `--card`, `--popover` (y sus `-foreground`) | Tarjetas, avisos, cajas de las tablas | White / Black (21:1) | Black / White (21:1) |
| `--primary` / `--primary-foreground` | Botón principal, opción elegida, enlaces, títulos, encabezado de tablas, lo encontrado por el buscador, texto seleccionado | Primary Blue / White (11,1:1; con el mouse encima, al 80 %: 6,2:1) | Light Blue / Primary Blue (9,5:1); enlaces Light Blue: 18,0:1 sobre Black, 9,5:1 sobre Primary Blue |
| `--secondary` / `--secondary-foreground` | Insignias ("N° de órdenes"), iniciales del usuario | Light Blue / Primary Blue (9,5:1) | Light Blue / Primary Blue (9,5:1) |
| `--muted` | Filas alternas; fondo con el mouse encima y centro abierto (al 50 %); tecla `/` | Light Gray (texto Black 19,3:1; al 50 %: 20,1:1) | Primary Blue (texto White 11,1:1; al 50 %: 16,8:1) |
| `--muted-foreground` | Textos secundarios (contador, ayudas, etiquetas) | Gray: 5,7:1 con White, 5,3:1 con Light Gray | Border Gray: 13,1:1 con Black, 6,9:1 con Primary Blue |
| `--accent` / `--accent-foreground` | (ningún componente actual lo usa) | Light Blue / Primary Blue | Primary Blue / White |
| `--destructive` | Texto de los errores (Alert `destructive`) | Primary Blue (11,1:1) | Light Blue (18,0:1) |
| `--border` | Bordes de tablas, avisos y botones `outline` (decorativos) | Border Gray | White al 10 % (el de shadcn/ui) |
| `--input` | Borde de cajas y desplegables (WCAG pide 3:1 para ver dónde está la caja) | Gray (5,7:1 con White) | Gray (3,7:1 con Black); fondo de cajas y botones `outline`: Gray al 30 % (texto White 16,6:1) |
| `--ring` | Foco con el teclado: borde + anillo de 3 px al 50 % (contorno de 2 px en enlaces y elementos propios) | Medium Blue (5,4:1 con White, 5,0:1 con Light Gray) | Medium Blue (3,9:1 con Black; 4,7:1 junto al botón principal Light Blue) |
| `--radius` | Esquinas (el valor por defecto de shadcn/ui) | 0,625rem | 0,625rem |

`tests/e2e/guia-aic.spec.ts` recorre todas las pantallas en claro y en oscuro (lista con búsqueda resaltada, "Por centro" abierto, detalle, mensajes, error del Excel, inicio de sesión, celular con filtros y aviso flotante, foco y ayuda flotante) y falla si aparece un color **ajeno a la marca** —en cualquier notación: `rgb()`, `oklab()`, `oklch()`…— o un texto con contraste menor que AA (con el color **real**: las transparencias se mezclan con lo que hay debajo). Otra prueba comprueba que el revisor sí detecta el azul del navegador, un azul de Tailwind, el rojo de shadcn/ui, un anillo rojo y un texto con poco contraste.

### 8.2 Componentes shadcn/ui sin cambios + Tailwind CSS *(15/10/2026)*

**shadcn/ui** no es una librería que se instala y queda "cerrada": es un catálogo de componentes accesibles (hechos sobre **Radix UI**) que la herramienta `shadcn` **copia** al proyecto (`app/src/components/ui/`). Se pintan con **Tailwind CSS** (clases cortas como `px-2`, `bg-primary`). Se instaló con la guía oficial para Vite (Tailwind v4 con `@tailwindcss/vite`, alias `@/` = `src/`, `components.json`).

**Desde el pedido de Gustavo del 15/10/2026, esos archivos no se editan:** quedan exactamente como los genera `npx.cmd shadcn add` con la versión instalada (`shadcn` 4.21.5 en `devDependencies`) y el `components.json` actual (estilo `radix-vega`, color base `neutral`, `cn()` del paquete `cn`). La marca va solo en el tema (8.1). Si un componente necesita otra cosa, se resuelve **afuera**: con sus props públicas, con clases de medidas en el lugar de uso o con un componente propio en `src/componentes/` que lo envuelva.

| Componente shadcn/ui | Dónde |
|---|---|
| `Button` | Todos los botones (Actualizar, Exportar, Limpiar filtros, Cerrar sesión, paginación, copiar, flecha de "Por centro", ☀️/🌙…) y los enlaces con forma de botón ("Volver a la lista", "Ir al buscador", con `asChild`). |
| `RadioGroup` + `ButtonGroup` + `Button` | "Por orden / Por centro de negocio" (`src/componentes/OpcionesBoton.tsx`): botones pegados que son un grupo de opciones (`role="radiogroup"`, cada opción `role="radio"` con `aria-checked`) y se usan como los `<input type="radio">`: **las flechas mueven el foco y eligen** (patrón de WAI-ARIA). La elegida va con el estilo principal (`variant="default"`) y la otra con `outline`. `ButtonGroup` es nuevo: reemplaza al `RadioGroupBoton` que se había agregado dentro de `radio-group.tsx`. |
| `Input` | Buscador y filtros "contiene" (Código, Descripción, Orden). |
| `NativeSelect` | Cliente, Tipo de orden, Estado y Filas por página. **Se eligió en vez de `Select` (Radix):** es el `<select>` del navegador, el más accesible (en el celular abre la lista del sistema, se elige escribiendo las primeras letras, todos los lectores de pantalla lo conocen) y va bien con listas largas (los clientes del Excel). |
| `Table` | Las tablas (por orden, por centro, centro abierto, detalle, columnas detectadas), con el encabezado de marca y las filas alternas. |
| `Card` | Tarjetas (cargando, bienvenida, mensajes, "Página no encontrada", ficha del centro) con sus partes `CardHeader`/`CardContent`/`CardFooter`, y las cajas de las tablas. |
| `Badge`, `Alert`, `Separator`, `Kbd` | Insignias (Modo demostración, N° de órdenes, filtros activos), avisos (`default` y `destructive`), línea entre avisos y la tecla `/`. |
| `Collapsible` | "Columnas detectadas en el Excel" (antes `<details>`): botón con `aria-expanded`. |
| `Tooltip` | Ayuda flotante del botón ☀️/🌙 (`src/componentes/AyudaFlotante.tsx`): a diferencia de `title`, se ve también al llegar con el teclado y se cierra con Escape. El botón **copiar** de cada fila **no** lleva ayuda flotante: con una por fila, cambiar de página con 250 filas tardaba ~1,2 s y sin ella ~0,83 s (3000 filas, CPU 4 veces más lenta, mediana de 12 cambios); su nombre ("Copiar código …") ya lo leen los lectores de pantalla. |
| **No se usaron** | `Select` (Radix): ver `NativeSelect`. `Pagination`: está hecho con enlaces (`<a>`), que no se pueden desactivar ni cuidan el foco como la paginación actual (botones; al llegar a la última página el foco pasa a "Página X de Y"); se usó `Button` dentro de la misma paginación. `Spinner`: su texto para lectores de pantalla viene en inglés ("Loading"); la ruedita propia va con el texto visible "Cargando…". |

**Accesibilidad que antes dependía de cambiar componentes y ahora se resuelve sin tocarlos:**

| Qué | Antes (componente cambiado) | Ahora (sin editar `src/components/ui`) |
|---|---|---|
| La ayuda de ☀️/🌙 repite el nombre del botón: que el lector de pantalla no lo lea dos veces | opción `sinDescripcion` agregada en `tooltip.tsx` | `AyudaFlotante.tsx`: `TooltipTrigger asChild` (prop pública) le pasa sus props a un `Slot` propio que se las pasa al botón **menos** `aria-describedby`. |
| Un solo `TooltipProvider` para toda la app | ya estaba en `App.tsx` | igual (el `Tooltip` de shadcn/ui no trae proveedor propio). Ahora con la espera por defecto de shadcn/ui (0 ms). |
| "Por orden / Por centro": las flechas eligen | `RadioGroupBoton` agregado en `radio-group.tsx` | `OpcionesBoton.tsx`: `RadioGroup` de shadcn/ui + `ButtonGroup` con `role="presentation"` (prop pública) + `RadioGroupPrimitive.Item asChild` de Radix sobre un `Button`. |
| Encabezado fijo arriba al bajar en la caja con scroll | opción `container={false}` agregada en `table.tsx` | `CajaTabla` (`Celdas.tsx`, una `Card`): clase de medidas `[&>[data-slot=table-container]]:overflow-visible` para que la caja de la `Table` no tenga su propio scroll; el `<th>` lleva `sticky top-0`. |
| Foco visible en el modo de alto contraste de Windows (ahí no se dibujan sombras y el anillo de shadcn/ui es una sombra) | contorno transparente en utilidades propias | regla de `estilos.css` que **solo** actúa con `forced-colors: active` (contorno de 2 px del color del sistema). Es la única regla que alcanza a los componentes y no cambia nada en el modo normal: la opción menos invasiva. |
| Foco de lo que no es de shadcn/ui (enlace del código, caja de la tabla, "Página X de Y", títulos que ordenan) | utilidades `foco-*` | contorno de 2 px del color `--ring` (`estilos.css`); los títulos que ordenan, un contorno blanco por dentro de la celda (11,1:1). |

- **Accesibilidad que se mantiene:** mismos ids, roles, etiquetas y textos; foco visible con el teclado; `aria-sort` en los títulos; "Saltar al buscador / al contenido" y "Saltar a la paginación"; atajo `/`; avisos que se vuelven a leer en voz alta; contraste AA en claro y en oscuro.
- **Pruebas que cambiaron con los componentes "naturales" (y por qué):** solo las de apariencia, porque el pedido cambió la apariencia esperada; las de funcionamiento (`app.spec.ts`, `rutas.spec.ts`, `microsoft-simulado.spec.ts` y las unitarias de lógica) pasan sin cambios.
  - `guia-aic.spec.ts`: la prueba "solo colores de la paleta" pasó al criterio de Gustavo (paleta **y sus transparencias** + sombras neutras) y ahora lee cualquier notación de color (`tests/e2e/colores.ts`; antes solo `rgb()`, así que un color de Tailwind en `oklch()` se le habría escapado); el contraste se mide con el color real (mezclando transparencias). Nueva prueba del propio revisor (detecta el azul del navegador, un azul de Tailwind, el rojo de shadcn/ui, un anillo rojo y poco contraste). Las demás comprueban lo nuevo: encabezado de marca y filas alternas sobre la Table de shadcn/ui (más el encabezado fijo al bajar), Alert y Card de shadcn/ui en vez de la caja de nota, fondos con el mouse encima de shadcn/ui (`bg-muted/50`, `bg-primary/80`) en vez de la raya izquierda, fundido de la ayuda y del aviso flotante (antes se exigía que **no** hubiera), modo oscuro con el tema nuevo.
  - `diseno.spec.ts`: el foco esperado es el de shadcn/ui (borde `--ring` + anillo de 3 px al 50 %) en vez del anillo sólido de 2 px; `#contenedor-tabla` es una Card (su contorno de 1 px es un `ring-1`, no un borde); la prueba "al hacer clic en una caja no aparece el anillo" pasó a "el anillo sigue a `:focus-visible`" (botones: solo con el teclado; cajas y desplegables: también con el clic, como shadcn/ui); se agregaron el foco de los títulos que ordenan y el modo de alto contraste.
  - Unitarias: se quitó `modalidad.test.ts` (probaba `logica/modalidad.ts`, que ya no existe); `tabla.test.tsx` mira el ▲▼ tenue con `opacity-60` (antes, una variable propia); nueva `shadcn-natural.test.ts` (los archivos de `src/components/ui` no tienen las adaptaciones de antes ni texto agregado a mano).
- **Seguridad (CSP):** Radix pone algunos estilos en línea (posición de la ayuda flotante): la CSP ya permite `style-src 'unsafe-inline'`; los scripts siguen solo `'self'`. Lo comprueban las pruebas en navegador (sin errores de consola, con la CSP activa).
- **`npm audit`:** las librerías que se publican no tienen avisos (`npm.cmd audit --omit=dev`). El paquete `shadcn` (en `devDependencies`) trae avisos de dependencias suyas que no llegan a la app.
- **El paquete `shadcn` no es solo la herramienta para agregar componentes:** `src/estilos.css` importa **`shadcn/tailwind.css`** (de ese paquete), que define las variantes de Tailwind que usan los componentes (`data-open:`, `data-checked:`, `data-horizontal:`…). Se usa **al compilar** (`npm run build`), por eso tiene que quedar instalado: si se quitara de `package.json`, la compilación fallaría. No se publica como código (solo las reglas de CSS que se usan).

**Cómo comprobar que los componentes siguen sin cambios** (necesita internet; cada archivo debe decir *"skip (identical)"*):

```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npx.cmd shadcn add alert badge button button-group card collapsible input kbd native-select radio-group separator table tooltip --dry-run
```

**Cómo agregar un componente de shadcn/ui** (ej. un diálogo):

```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npx.cmd shadcn add dialog
```

Eso crea `src/components/ui/dialog.tsx` y agrega las librerías que necesite. Se escribe **sin** `@latest`: así usa la versión de la herramienta instalada en el proyecto (`shadcn` en `devDependencies`), la misma que generó los componentes actuales (con `shadcn@latest` se descargaría otra versión, que podría generar otro estilo u otras librerías). Para probar sin escribir nada: `npx.cmd shadcn add dialog --dry-run`. Después: (1) **no** editar el archivo: usarlo con `import { Dialog } from '@/components/ui/dialog'` y, en el lugar de uso, solo clases de medidas (los colores ya salen del tema); (2) si hace falta otro comportamiento, envolverlo en un componente propio en `src/componentes/` (como `AyudaFlotante.tsx`); (3) correr `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run test:e2e` (la prueba de colores avisa si se coló un color ajeno a la marca).

**Cómo actualizar los componentes** (ej. al subir la versión de la herramienta **a propósito**: `npm.cmd install -D shadcn@<versión>`):

```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npx.cmd shadcn add alert badge button button-group card collapsible input kbd native-select radio-group separator table tooltip --overwrite --yes
git diff src/components/ui
```

`--overwrite` reemplaza los archivos por los que genera la herramienta (por eso no se les hacen cambios a mano: se perderían). Revisar con `git diff` qué cambió, ajustar **la app** si hace falta (nunca los componentes) y correr todas las pruebas.

## 9. Qué falta / (por confirmar)

- [x] **Ubicación del Excel real**: `centros-negocio-aic.xlsx` en el SharePoint de jaicoscorp (sitio raíz); enlace en `datos.urlCompartida`. *(12/10/2026)*
- [ ] **Columnas exactas del Excel real**: revisar "Columnas detectadas en el Excel" en la primera prueba → ajustar `columnas` en `config.json` si hace falta (y confirmar que el estado y los montos se reconocen). *(por confirmar)*
- [ ] **`Files.Read.All` agregado en Entra ID**: confirmar que aparece (tipo *Delegado*) en Entra ID → Registros de aplicaciones → Automatizacion de procesos Aaron → **Permisos de API**. Si no está, agregarlo: "Conceder consentimiento de administrador" solo aprueba lo que está en esa lista (guía, paso 2). *(por confirmar)*
- [ ] **Consentimiento de `Files.Read.All`**: ¿la empresa deja que cada usuario lo apruebe o lo tiene que aprobar un administrador? Si lo tiene que aprobar, hacerlo **antes** de subir `publicar/` a Netlify (guía, paso 2). *(por confirmar)*
- [ ] **¿Basta `Files.Read.All` para listar las bibliotecas del sitio?** La búsqueda de respaldo pide `GET /sites/jaicoscorp.sharepoint.com/drives`; la documentación de Microsoft no lo confirma para esa forma (guía, paso 2). Si a todas las personas les sale *"No se pudo ver las bibliotecas de documentos del sitio…"*, fijar `driveId` + `itemId` o agregar `Sites.Read.All`. *(por confirmar)*
- [ ] **El bot**: ¿escribe siempre en el **mismo archivo** (mismo nombre y lugar)? Si borra y vuelve a crear el archivo, el enlace cambia. *(por confirmar)*
- [x] **Registro de la app en Entra ID**: se usa "Automatizacion de procesos Aaron" (clientId `e5d497dc-…`, tenant JAICOS CORP S.A.C., creada por TI). *(14/10/2026)*
- [ ] **Configurar "Automatizacion de procesos Aaron"** (lo hace su propietario/administrador): URIs SPA `https://aic-centros-negocio.netlify.app/redirect.html` y `https://aic-centros-negocio.netlify.app/`, permiso `Files.Read.All` (delegado) y "Conceder consentimiento de administrador". Luego eliminar la app vieja "Buscador de centros de negocio".
- [x] **Jaicos**: dominio `jaicoscorp.com`, y está en el **mismo tenant** que AIC ("JAICOS CORP S.A.C."; las cuentas @aic.pe están dentro). No hace falta invitar a nadie. *(confirmado el 12/10/2026)*
- [x] **Hosting**: Netlify, https://aic-centros-negocio.netlify.app (se sube a mano la carpeta `publicar/`). *(12/10/2026)*
- [ ] **"Actualizarse"**: confirmar que significa "mostrar siempre lo último del Excel" y no "editar desde la app". *(por confirmar)*
- [ ] ¿Qué columnas son más importantes para el equipo (para el orden de la tabla y los filtros)? *(por confirmar)*
- [x] **SheetJS actualizada a 0.20.3** (13/10/2026). Pendiente recomendado: dejar el permiso de edición del Excel solo a la cuenta del bot.
- [ ] **Publicar los cambios del 15/10/2026** (órdenes una por línea, más margen, guía de estilo de AIC, React Router 8.4 y shadcn/ui; rama `ui-aic-shadcn`): `npm.cmd ci` → `npm.cmd run preparar-publicacion` → arrastrar `publicar/` y revisar la sección 7 del plan de pruebas. *(por confirmar cuándo se publica y si Gustavo lo revisa antes)*
- [ ] **Componentes de shadcn/ui "naturales" (rama `shadcn-natural`)**: que Gustavo lo vea (`npm.cmd run dev:demo`) y, si le parece bien, publicarlo (`npm.cmd run preparar-publicacion` → arrastrar `publicar/`; repetir 1.19 del plan de pruebas). *(por confirmar con Gustavo)*
- [ ] **Modo oscuro con la guía de AIC**: la guía no lo define; se armó con el tema oscuro de shadcn/ui y la paleta (fondo negro, encabezados de tabla y botón principal Light Blue con texto Primary Blue, filas alternas Primary Blue, bordes blanco al 10 %). *(por confirmar con Gustavo)*
- [ ] **Anillo de foco al hacer clic en cajas de texto y desplegables**: con los componentes "naturales" aparece también con el clic (así es shadcn/ui; antes la app lo quitaba, pedido del 14/10/2026). En los botones sigue apareciendo solo con el teclado. *(por confirmar con Gustavo)*
- [ ] **Desplegables: `NativeSelect` en vez de `Select` (Radix)**: se usó el `<select>` del navegador (versión de shadcn/ui) para Cliente, Tipo, Estado y Filas por página, por ser el más accesible y el mejor para listas largas (sección 8.2). *(por confirmar con Aaron)*
- [ ] **Letra en celulares y Mac**: la app usa Calibri si el equipo la tiene (Windows/Office); en Android, iPhone y Mac sin Office se ve la letra del sistema. ¿Se incluye Carlito (versión libre de Calibri) dentro de la app para que se vea igual en todos lados? (sección 8.1) *(por confirmar con Gustavo)*
- [ ] **Separar órdenes en el Excel real**: revisar con datos reales que ninguna celda se corte mal (ej. textos como "OC pendiente" sin número no se cortan; "OC N° 123" y "OC 123" cuentan como la misma orden). *(por confirmar con Gustavo)*
- [ ] **Publicar los cambios de Gustavo (14/10/2026: márgenes, contornos, íconos y React Router)**: `npm.cmd run preparar-publicacion` → arrastrar `publicar/` (incluye `_redirects`) y revisar el punto 6.5 del plan de pruebas (abrir y recargar `/centros/<código real>`). *(por confirmar cuándo se publica y si Gustavo lo revisa antes)*
- [ ] **Versión React + TypeScript en Netlify**: hecha y probada en la PC (13/10/2026); falta subirla (`npm.cmd run preparar-publicacion` → arrastrar `publicar/`) y revisar el punto 1.15 del plan de pruebas. *(por confirmar cuándo se publica)*
- [ ] **Formato del Excel real**: ¿el código/descripción del centro va en **cada fila**, en **celdas combinadas** o **una sola vez** (con las filas de abajo vacías)? ¿El bot escribe valores o fórmulas? Revisar "Columnas detectadas" y la vista "Por centro". *(por confirmar)*
- [ ] **Nombre de inicio de sesión (UPN)**: ¿termina en `@aic.pe` / `@jaicoscorp.com` para todo el personal? Lo confirma el administrador de Microsoft 365. *(por confirmar)*
- [ ] **Permiso para leer el Excel**: probar con una cuenta normal; si a todos les sale "sin permiso" o "No se encontró el Excel", sacar el `driveId` + `itemId` con el **Probador de Graph** (guía 4.3, forma A) y copiarlos en `config.json`. ("Columnas detectadas en el Excel" muestra esos dos valores solo cuando el Excel **sí** cargó: sirve para fijarlos de antemano, no cuando falla.) *(por confirmar)*

## 10. Para pasar de demo a producción (resumen)

1. ✅ El administrador registra la app en Entra ID (guía, pasos 1 y 3).
2. **Permiso `Files.Read.All`** (guía, paso 2): confirmar que está en **Permisos de API** y, si la empresa lo exige, que un administrador dio el **consentimiento**. Hacerlo **antes** del paso 6. *(por confirmar)*
3. Se da permiso de lectura al personal sobre el Excel (guía, paso 4.2).
4. ✅ En `app/public/config.json` (la única copia que se edita; **no** `dist/config.json` ni `publicar/config.json`): `"modo": "microsoft"`, `clientId`, `tenantId`, `"fuente": "graph"`, `urlCompartida` y `scopes` con `Files.Read.All` (guía, paso 5).
5. ~~Actualizar SheetJS a 0.20.x~~ ✅ hecho (0.20.3, 13/10/2026).
6. Con el Excel de ejemplo cerrado: `npm.cmd run preparar-publicacion` → Netlify → **Deploys** → arrastrar la carpeta `publicar/` (guía, paso 6).
