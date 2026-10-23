# 🌐 Sitio web — Buscador de centros de negocio

> Proyecto "Sitio web" en Notion (código PRY-2, id `3f2738bc3a6381408614e380da98edac`). Notion es la agenda; aquí está el trabajo.
> La app está en [`app/`](app/). La guía para conectarla a Microsoft 365 está en [`GUIA-CONFIGURACION-MICROSOFT.md`](GUIA-CONFIGURACION-MICROSOFT.md). Las pruebas manuales para entregarla están en [`pruebas/plan-de-pruebas.md`](pruebas/plan-de-pruebas.md).

## Estado actual (20/10/2026)
- **Logo oficial y paleta de AIC** (pedido que recibió Aaron el 19/10/2026: *"poner el logo de la empresa y usar la paleta de colores de la empresa en el modo claro, y en el modo oscuro otra paleta parecida, que combine y se vea bien"*; *por confirmar* quién lo pidió) — hecho y probado en la PC (rama `paleta-aic`, sin publicar). Detalle y tabla de colores con sus contrastes en la sección **8.5**:
  1. **Logo:** se regeneró desde el archivo oficial que pasó Aaron (recortado, fondo transparente): azul marino y naranja en claro; blanco y naranja en oscuro. En la cabecera mide 40 px de alto (36 px en el celular), va centrado con el título y se ve nítido hasta en pantallas 4x. **Favicon nuevo:** la "i" del logo con su señal wifi naranja (antes, un ícono azul genérico) y un ícono de 180 px para el celular.
  2. **Modo claro = paleta oficial + el naranja del logo:** fondo White, texto Black, textos secundarios Gray, bordes Border Gray, títulos/botón principal/encabezado de tablas Primary Blue, filas alternas Light Gray y la fila con el mouse encima Light Blue. El naranja va **solo como acento**: la línea bajo la cabecera, una barra bajo "Por orden / Por centro" elegido, el contador de filtros (con texto negro) y lo encontrado por el buscador (fondo naranja claro con texto Primary Blue).
  3. **Modo oscuro = paleta propia parecida:** fondo azul AIC muy oscuro (`#0E1726`), tarjetas `#16233A`, texto Light Blue, azul claro `#8FB0E0` para títulos, enlaces y botón principal, encabezado de tablas Dark Blue con texto blanco y el mismo naranja del logo para los acentos. Todo con contraste AA medido.
  4. Como pidió Gustavo, todo entra por el **tema** (`app/src/estilos.css`) y clases en el lugar de uso: `src/components/ui` sigue sin cambios y el botón claro → oscuro → sistema funciona igual.
  5. **Revisión (20/10/2026):** "Volver a la lista" ya tiene borde en modo claro (como los demás botones); en oscuro, el borde de cajas y botones y el anillo de foco se aclararon un poco para llegar a 3:1 también sobre la fila con el mouse encima. Quedan para decidir: el anillo de foco en claro y el lema del logo (sección 9).
  - Pruebas automáticas: **364 unitarias** y **100 en navegador**. La prueba de colores ahora es **por modo**: en claro solo acepta la paleta oficial y el naranja del logo (un tono del modo oscuro en claro falla); en oscuro, además, sus tonos propios. Nuevas pruebas del logo (el oficial, uno por modo, nítido, alt "AIC", alineado), del favicon y de los acentos naranja.
  - Para publicar (no hay librerías nuevas): `npm.cmd run preparar-publicacion` y arrastrar `publicar/`, después de que lo vea quien lo pidió.
- **Componentes de shadcn/ui "naturales" + estilo de marca** (último pedido de Gustavo del 15/10/2026, por WhatsApp: *"me gusta más, solo faltaría que use los estilos naturales de shadcn, componentes como los botones, inputs, etc. que use de shadcn, sin cambios, solo agregando el estilo de marca para que agregue más suavidad a las cosas"*) — hecho y probado en la PC (rama `shadcn-natural`; falta que Gustavo lo vea y publicarlo):
  1. Los archivos de `app/src/components/ui/` quedan **exactamente** como los genera `npx.cmd shadcn add` (se regeneraron con `--overwrite`; `--dry-run` dice *"skip (identical)"* en los 13). Sombras, esquinas redondeadas, transiciones, anillos de foco y transparencias son los de shadcn/ui.
  2. La marca de AIC entra **solo** por las variables del tema en `app/src/estilos.css` (claro y oscuro), la letra Calibri y, en las tablas, el encabezado Primary Blue con texto blanco y las filas alternas. Se quitaron los estilos propios que cambiaban a los componentes (`clases.ts`, utilidades `foco-*`, caja de nota, `logica/modalidad.ts`…).
  3. Lo que antes dependía de cambiar componentes ahora vive en componentes propios: `OpcionesBoton.tsx` ("Por orden / Por centro" con `RadioGroup` + `ButtonGroup` + `Button` de shadcn/ui: las flechas siguen eligiendo). Detalle en 8.1 y 8.2.
  4. **Revisión de lo anterior (15/10/2026):** foco con el teclado más visible en **modo oscuro** (`--ring` Light Blue en vez de Medium Blue, que casi no se veía sobre el negro); el centro abierto de "Por centro" usa el estado "seleccionada" de la Table de shadcn/ui (ya no se aclara); el motivo de un filtro desactivado vuelve a aparecer al pasar el mouse; la ayuda flotante espera 300 ms como antes; "Saltar a la paginación" con las medidas de un botón; las reglas globales que alcanzan a los componentes (menos movimiento, alto contraste, texto seleccionado, "manito") quedan documentadas (8.2); los componentes quedan con finales de línea LF (`.gitattributes`). Lo que cambió a la vista y queda *por confirmar con Gustavo* está en la sección 9.
  - Pruebas automáticas: **358 unitarias** y **96 en navegador**. La prueba de colores pasó al criterio nuevo: colores de la marca **y sus transparencias** (las que traen los componentes) y sombras neutras; sigue fallando con cualquier color ajeno a la marca (el azul del navegador, un color de Tailwind que no sale del tema…), también en las opciones de los desplegables, y con texto que no llegue al contraste AA. El foco se mide tal como se dibuja (con su transparencia).
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
- **MONTO TOTAL se muestra (desde el 23/10/2026):** el ERP agregó la columna *MONTO TOTAL* al Excel y Gustavo pidió mostrarla. Se ve, se busca, se ordena como número (los valores vienen como texto, ej. "S/ 15,025.42") y se exporta. En `config.json`, `columnasOcultas` quedó en `["moneda"]`: solo se ocultan columnas con "moneda" en el título. *(Antes, del 12/10 al 23/10, también se ocultaba "monto" por pedido inicial.)* El modo demo y las pruebas siguen usando la configuración por defecto (`["moneda", "monto"]`), que comprueba que la opción de ocultar columnas funciona.
- **Filtro "Estado"** (desplegable, igual que Cliente y Tipo de orden): aparece si el Excel tiene una columna de estado con valores (*Estado*, *Estado de la orden*, *Situación*, *Status*…).
- ✅ **SheetJS actualizada a 0.20.3** (13/10/2026, desde el sitio oficial `cdn.sheetjs.com`): `npm audit` ya no reporta avisos. Igual se recomienda que **solo la cuenta del bot** pueda editar el Excel real (guía, paso 4.2).
- **Publicación automática (desde el 20/10/2026):** Netlify está conectado al repositorio de GitHub. **Cada cambio que entra a la rama `main` se compila y se publica solo** con `npm run build:netlify` (configuración en `app/netlify.toml`: carpeta base `app`, publica `dist`, Node 24). Ya no hace falta arrastrar `publicar/`. Los PR tienen su propia vista previa (ahí el login de Microsoft no funciona, porque solo está registrada la dirección principal).
  - ⚠️ **Créditos de Netlify (plan gratis):** 300 al mes; **cada publicación en producción cuesta 15** (las vistas previas de PR, 0) y las visitas también gastan. Si se acaban, Netlify **pausa la página** hasta el mes siguiente. Por eso conviene juntar cambios antes de fusionarlos a `main`. A largo plazo: cuenta de la empresa u otro hosting *(por confirmar con Gustavo)*.
  - `npm.cmd run preparar-publicacion` sigue sirviendo para revisar la compilación en `publicar/` o para una publicación manual de emergencia.
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
| **Buscador** | Una caja grande: "Buscar por código, descripción, cliente u orden…". No importan mayúsculas ni tildes (`electrico` encuentra "Eléctrico"). Varias palabras = deben aparecer **todas** (`cableado demo b`). `cn0005` encuentra `CN-0005` (y lo resalta). Las coincidencias se resaltan (texto Primary Blue sobre naranja claro; en modo oscuro, naranja claro sobre café oscuro). Atajo: tecla `/`. |
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
| **Accesible** | Componentes de shadcn/ui (Base UI) con los roles y atributos de accesibilidad estándar. Todo se puede usar con teclado, con foco visible (un anillo que aparece al usar el teclado, no al hacer clic), etiquetas en cada campo y contraste AA comprobado en todas las pantallas (claro y oscuro). "Por orden / Por centro" es un grupo de opciones que se usa como los botones de opción de siempre: Tab llega a la elegida y **las flechas eligen la otra** (la vista cambia al instante); si "Por centro" está desactivado, las flechas no hacen nada. Con la tecla Tab aparece **"Saltar a la paginación"** antes de la tabla, para no recorrer todos sus botones. Al abrir el detalle de un centro (o "Página no encontrada") el foco va a su título, para que el lector de pantalla lo anuncie; al **volver a la lista**, el foco regresa al código del centro que se abrió (o al buscador, si ya no está en la página). |

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
| `npm test` | Pruebas **unitarias** con Vitest (362): la lógica (búsqueda, filtros, lectura del Excel, Graph, reglas de acceso, rutas…) y los componentes de React (buscador, tabla, paginación, botón de tema, avisos, rutas y detalle de un centro…), sin abrir un navegador. También revisan que escribir en el buscador no vuelva a dibujar la tabla, que la app funcione dentro de `<StrictMode>` y que la pantalla de carga de `index.html` sea igual a la de React. |
| `npm run test:e2e` | Pruebas **de punta a punta** con Playwright (98): compila, abre la app en Chromium y hace clic como una persona (modo demo + un inicio de sesión de Microsoft **simulado**, sin internet), incluidas las rutas (`rutas.spec.ts`: enlace directo, recargar, atrás, 404, a dónde vuelve el foco) las medidas del diseño (`diseno.spec.ts`: márgenes, contornos y contraste del foco en claro y oscuro, foco con el mouse encima o al hacer clic, íconos con desfase de 1 px o menos) y la guía de AIC (`guia-aic.spec.ts`: órdenes una por línea, colores y padding de las tablas, botón principal, logo, favicon, acentos naranja y, en todas las pantallas, solo los colores de la marca de cada modo y contraste AA). Usan su propia configuración de demostración (`tests/e2e/config-pruebas.ts`), así que pasan igual aunque `config.json` ya tenga los valores de producción. **En una PC nueva**, antes de la primera vez: `npx.cmd playwright install chromium` (descarga el navegador de pruebas; `npm.cmd ci` no lo trae). |
| `npm run build` | "Compila" la app: primero ejecuta `typecheck` y `lint` (si hay un error, **se detiene** y no compila) y después crea la carpeta `dist/` con Vite. |
| `npm run build:netlify` | Lo que ejecuta **Netlify** al publicar desde GitHub: `build` y después quita de `dist/` el Excel de ejemplo cuando la app lee el Excel real (`scripts/limpiar-dist.mjs`); también se detiene si falta `_redirects`. |
| `npm run preparar-publicacion` | Ejecuta `build` y deja una copia **lista para Netlify** en `publicar/` (para revisar o para una publicación manual) (sin archivos temporales de Office `~$…`, con `_redirects` para las rutas: si faltara, se detiene). Al final muestra el modo, la fuente de datos y los permisos de `config.json`. |
| `npm run preview` | Muestra la versión compilada (`dist/`) en http://localhost:4173 con la configuración real. |
| `npm run preview:demo` | Lo mismo, pero en modo demo. |
| `npm run generar-ejemplo` | Vuelve a crear el Excel de ejemplo con datos ficticios. |

Antes de fusionar un cambio a `main` (que se publica solo): `npm run typecheck` → `npm run lint` → `npm test` → `npm run test:e2e`.

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
├── .gitattributes                     ← componentes de shadcn/ui con finales de línea LF, como los escribe shadcn (8.2)
├── GUIA-CONFIGURACION-MICROSOFT.md    ← paso a paso para el administrador de Microsoft 365 y la publicación
├── datos/                             ← archivos recibidos para el proyecto (vacía por ahora)
├── pruebas/plan-de-pruebas.md         ← pruebas que hace una persona antes de entregar (con casillas)
├── publicar/                          ← copia lista para Netlify (la crea npm run preparar-publicacion; no se edita)
└── app/                               ← la aplicación (React 19 + TypeScript)
    ├── index.html                     ← la página: solo <div id="raiz"> vacío y los scripts (todo lo dibuja React)
    ├── redirect.html                  ← página "puente" a la que vuelve Microsoft tras el inicio de sesión (sin React)
    ├── public/                        ← se copia tal cual a dist/
    │   ├── config.json                ← CONFIGURACIÓN (la única copia que se edita; npm run build la copia a dist/)
    │   ├── tema-inicial.js            ← pone la clase light/dark del ThemeProvider antes de pintar (sin destello)
    │   ├── datos/centros-ejemplo.xlsx ← Excel de ejemplo con datos ficticios (modo demo)
    │   ├── netlify.toml / _headers    ← Netlify: publicar la carpeta tal cual y no guardar config.json en caché
    │   ├── _redirects                 ← Netlify: en las rutas de la app (/centros/A2338PY01…) entregar index.html
    │   ├── staticwebapp.config.json   ← Azure Static Web Apps (otra opción de hosting): cabeceras de seguridad y rutas
    │   │                                 (navigationFallback = lo mismo que _redirects)
    │   ├── marca/                     ← logo de AIC (aic-logo-claro.png / aic-logo-oscuro.png, 305×160) e ícono
    │   │                                 para el celular (aic-icono-180.png) (8.5)
    │   └── favicon.svg                ← ícono de la pestaña: la "i" del logo con la señal wifi (8.5)
    ├── src/
    │   ├── main.tsx                   ← punto de entrada: monta <Enrutador><App /></Enrutador> en index.html
    │   ├── App.tsx                    ← la aplicación: ThemeProvider de shadcn/ui (modo claro/oscuro) + las rutas (RutasApp)
    │   ├── redirect.ts                ← lógica de redirect.html (MSAL v5, sin React)
    │   ├── estilos.css                ← Tailwind CSS + la marca de AIC: variables del tema de shadcn/ui (claro = paleta
    │   │                                     de AIC, oscuro = paleta propia; 8.5), letra Calibri, columna y foco
    │   ├── components/ui/             ← componentes de shadcn/ui TAL CUAL los genera "npx shadcn add" (no se editan)
    │   ├── lib/utils.ts               ← cn() para juntar clases de Tailwind (lo usa la herramienta de shadcn/ui)
    │   ├── componentes/               ← piezas de la pantalla (.tsx = TypeScript + JSX, el "HTML" de React)
    │   │   ├── Cabecera.tsx                             ← logo de AIC, título, usuario, "Cerrar sesión", botón de tema
    │   │   ├── PantallaCarga.tsx, PantallaLogin.tsx     ← "Cargando…" y "Bienvenido" (botón de Microsoft)
    │   │   ├── Mensaje.tsx                              ← "Tu cuenta no tiene acceso", "Falta configurar…", errores
    │   │   ├── Enrutador.tsx                            ← React Router (BrowserRouter) para main.tsx y las pruebas
    │   │   ├── RutasApp.tsx                             ← TABLA DE RUTAS: /, /ordenes, /centros, /centros/:codigo, 404
    │   │   ├── DisenoApp.tsx                            ← diseño ("layout") de TODAS las rutas: "Saltar al …", cabecera,
    │   │   │                                               <main> y aviso flotante; en el <main>, la pantalla que toque
    │   │   │                                               (cargando, mensaje, login) o, con la sesión iniciada, la ruta
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
    │   │   ├── OpcionesBoton.tsx                        ← "Por orden / Por centro": RadioGroup + ButtonGroup + Button
    │   │   └── Iconos.tsx                               ← íconos SVG (16–18 px) y la ruedita de "Cargando…"
    │   ├── hooks/                     ← "estado" y efectos reutilizables (funciones use… de React)
    │   │   ├── useArranque.ts         ← lee config.json, prepara MSAL y decide qué pantalla va
    │   │   ├── useExcel.ts            ← descarga y lee el Excel; Actualizar y auto-actualización
    │   │   ├── useBusqueda.ts         ← búsqueda, filtros, vista, orden y página (espera de 200 ms al escribir)
    │   │   ├── useEstadoUrl.ts        ← lee y guarda ese estado en la dirección con React Router (enlace para
    │   │   │                             compartir; botón atrás/adelante)
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
    │       ├── tabla.ts, formato.ts   ← reglas de la tabla (▲▼, aria-sort, contador, encabezado de marca, filas
    │       │                             alternas y fila con el mouse encima) y formato de horas/fechas
    │       ├── estado-url.ts          ← convierte la búsqueda en la query de la dirección (?q=…) y viceversa
    │       ├── rutas.ts               ← rutas (/ordenes, /centros…), enlaces viejos (?vista=centro), archivos desde "/"
    │       ├── centro.ts              ← detalle de un centro: buscarlo por su código y sus estados
    │       ├── ordenes.ts             ← varias órdenes en una celda: separarOrdenes() (una por línea) y cómo contarlas
    │       ├── exportar.ts            ← descarga a Excel (órdenes una por línea + "Ajustar texto")
    │       ├── portapapeles.ts          ← "copiar código"
    │       └── listas.ts              ← en(lista, i): leer una posición que se sabe que existe (ver noUncheckedIndexedAccess)
    ├── scripts/
    │   ├── generar-ejemplo.mjs        ← crea el Excel de ejemplo
    │   ├── preparar-publicacion.mjs   ← compila y copia a publicar/ (npm run preparar-publicacion)
    │   ├── archivos-temporales.mjs    ← deja afuera los "~$…" que crea Excel (llevan tu nombre de usuario)
    │   └── config-demo.mjs            ← modo demo en la PC sin tocar config.json (npm run dev:demo)
    ├── tests/unit/                    ← pruebas unitarias (Vitest, .ts/.tsx); graph-resolver.test.ts = cómo se encuentra
    │                                     el Excel real; componentes.test.tsx = componentes de React con clics y teclado;
    │                                     rendimiento.test.tsx = escribir no redibuja la tabla; strictmode.test.tsx = la app
    │                                     dentro de <StrictMode>; pagina-inicial.test.tsx = index.html vacío y diseño de React;
    │                                     tipos.test.tsx = tipos que deben dar error; lint.test.ts, codigo-fuente.test.ts
    │                                     y documentacion.test.ts = revisiones del código y de esta documentación;
    │                                     rutas.test.ts + rutas-app.test.tsx = rutas, detalle y botón atrás;
    │                                     despliegue.test.ts = _redirects, staticwebapp y base "/";
    │                                     shadcn-natural.test.ts = los componentes de shadcn/ui sin cambios a mano;
    │                                     marca.test.tsx = paleta de cada modo en estilos.css, logo y favicon
    ├── tests/e2e/                     ← pruebas en navegador (Playwright, .ts); config-pruebas.ts = su configuración fija;
    │                                     colores.ts = leer colores en cualquier notación (rgb, oklab…) y las paletas
    │                                     (oficial, naranja del logo y tonos del modo oscuro);
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
| **`index.html` solo con `<div id="raiz">`** *(16/10/2026)* | Antes traía una copia en HTML de la cabecera y de "Cargando…" (había que mantenerla igual a React a mano). Ahora todo lo dibuja React: la cabecera, "Saltar al …", el `<main>` y el aviso flotante son el **diseño de las rutas** (`DisenoApp.tsx`, ruta "layout" de React Router en `RutasApp.tsx`). Mientras baja el código la página queda vacía pero con el fondo del modo elegido (`tema-inicial.js`): sin destello blanco. Lo revisan `pagina-inicial.test.tsx` y 2 pruebas en navegador. |
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
3. **Clases en el lugar de uso**, solo de **medidas** (anchos, márgenes, grid, alto máximo, scroll) y, en las tablas, el **encabezado de marca** (`bg-encabezado-tabla` = Primary Blue en claro y Dark Blue en oscuro, texto blanco en negrita y centrado), las **filas alternas** (`bg-muted` = Light Gray) y la **fila con el mouse encima** (`hover:bg-accent` = Light Blue). Están en `src/logica/tabla.ts` (`CLASE_ENCABEZADO`, `CLASE_FILA`, `CLASE_FILA_ALTERNA`, `claseFila()`). Desde el 19/10/2026 también los **acentos naranja del logo** (8.5). El **centro abierto** de "Por centro" (su fila y la de sus órdenes) no lleva una clase de color: usa el estado "seleccionada" que ya trae la `TableRow` de shadcn/ui (`data-state="selected"` → `data-[state=selected]:bg-muted`) *(por confirmar con Gustavo)*.

Sombras, esquinas redondeadas (`--radius` = 0,625rem: avisos 10 px, tarjetas 14 px, botones 8 px), transiciones, anillos de foco, opacidades y fundidos son **los de shadcn/ui**: esa es la "suavidad". Por eso ahora se ven, por ejemplo, el Primary Blue al 80 % en un botón con el mouse encima, el anillo de foco Medium Blue al 50 % o sombras negras muy suaves: son **transparencias de colores de la paleta** y el criterio nuevo las acepta. Lo que **no** se acepta (y la prueba lo detecta) es un color ajeno a la marca: el azul del navegador, un color de Tailwind que no sale del tema, el rojo de shadcn/ui… La paleta no tiene rojo: `--destructive` es Primary Blue, así que un error se distingue por su texto azul, su ícono y `role="alert"`. El **texto seleccionado** usa la paleta (`::selection`: blanco sobre Primary Blue; en oscuro, `#0E1726` sobre el azul claro `#8FB0E0`) en vez del azul del navegador. Única excepción: el logo de Microsoft del botón de inicio de sesión (es la marca de Microsoft).

Qué se ve distinto respecto de la versión anterior (la que adaptaba los componentes):

- **Avisos:** el Alert de shadcn/ui (tarjeta blanca con borde gris) en vez de la "caja de nota" (fondo Light Blue con borde izquierdo grueso); el error, con texto Primary Blue.
- **Tablas:** encabezado Primary Blue con texto blanco en negrita (igual), filas alternas Light Gray (igual), pero con las líneas y el espacio de la Table de shadcn/ui: una línea gris entre filas (sin bordes verticales ni bordes Dark Blue en el encabezado) y 8 px de espacio en las celdas. La fila con el mouse encima toma **Light Blue** (`hover:bg-accent`, en oscuro `#24395E`; desde el 19/10/2026: antes era el `hover:bg-muted/50` de shadcn/ui, que casi no se notaba y aclaraba las filas alternas). El **centro abierto** de "Por centro" y la fila con sus órdenes toman el fondo de fila "seleccionada" de shadcn/ui (`--muted`: Light Gray; en oscuro, `#1C2B47`), el mismo de las filas alternas: antes era Light Blue con una raya de 4 px; ahora lo abierto se reconoce por ese fondo, la flecha girada y la tabla de órdenes *(por confirmar con Gustavo)*. El ▲▼ de una columna sin ordenar va al 60 % del color del texto del encabezado.
- **Página:** fondo White (antes Light Gray), como shadcn/ui; las tarjetas se distinguen por su contorno fino y su sombra.
- **Botones, cajas y desplegables:** esquinas, sombra y anillo de shadcn/ui; desactivados al 50 % de opacidad; la ayuda flotante y el aviso flotante aparecen con un fundido.
- **Foco:** el de shadcn/ui (borde del color `--ring` + anillo de 3 px de ese color al 50 %): Medium Blue en claro y **un Light Blue más intenso (`#BDD0EC`) en oscuro**. En los botones aparece solo con el teclado; en cajas de texto y desplegables, también al hacer clic (así es shadcn/ui: el navegador las marca `:focus-visible`; antes la app lo quitaba con `logica/modalidad.ts`, que se eliminó) *(por confirmar con Gustavo)*. Los enlaces y demás elementos propios llevan un contorno de 2 px del color `--ring`. En claro, el anillo al 50 % es más tenue que antes (2,1:1 sobre White; 2,0:1 sobre las filas alternas): lo que marca el foco con el contraste que pide WCAG es el **borde** Medium Blue (5,4:1 sobre White, 5,0:1 sobre Light Gray, 4,6:1 sobre Light Blue). Como los componentes dejan el anillo fijo al 50 %, ningún azul de la paleta llega a 3:1 (Dark Blue 2,4:1; Primary Blue 2,7:1): solo Black lo logra (3,95:1), pero se ve menos de marca. Lo decide Gustavo (sección 9) *(por confirmar con Gustavo)*.
- **Letra más chica en tablas y controles:** Calibri a **14 px** (la de shadcn/ui, `text-sm`) en las tablas, los botones, los desplegables y, en escritorio, las cajas de texto; antes era 16 px (15 px en el celular). El resto de la página va a 16 px, también en el celular (antes 15 px), y las cajas de texto del celular a 16 px. Calibri se ve más chica que otras letras del mismo tamaño *(por confirmar con Gustavo)*.
- **Cajas de filtros desactivadas:** shadcn/ui no les deja recibir el mouse (`pointer-events: none`); el `title` con el motivo ("No se encontró esta columna en el Excel"…) va **también en la caja del campo** (`Filtros.tsx`), así que sigue apareciendo al pasar el mouse, como antes; los lectores de pantalla lo leen del control.
- **Opciones de los desplegables en oscuro:** al abrir la lista, el `NativeSelectOption` de shadcn/ui usa los colores del **sistema** (`Canvas` / `CanvasText`): en oscuro, Chromium pinta las opciones casi negras (`rgb(18, 18, 18)`) en vez de Black. Es la única excepción a la paleta (la dibuja el sistema, no la página) y la prueba de colores la acepta de forma explícita *(por confirmar con Gustavo)*.

**Tema suave** *(16/10/2026, pedido de Gustavo: "el modo oscuro suave, todo suavízalo")*: se mantienen las esquinas un poco más redondeadas (`--radius` 0,75rem) y el modo oscuro **nativo de shadcn/ui** (ver 8.4): clase `dark` en `<html>`, variables en `.dark { … }` y `@custom-variant dark (&:is(.dark *))` en `estilos.css`. Los **colores** del tema suave (tonos derivados del Primary Blue también en claro) se reemplazaron el 19/10/2026 por la paleta oficial en claro y una paleta propia en oscuro: tabla de colores y contrastes en la sección **8.5**.

`tests/e2e/guia-aic.spec.ts` recorre todas las pantallas en claro y en oscuro (lista con búsqueda resaltada, "Por centro" abierto, detalle, mensajes, error del Excel, inicio de sesión, celular con filtros y aviso flotante, foco y ayuda flotante) y falla si aparece un color **ajeno a la marca** —en cualquier notación: `rgb()`, `oklab()`, `oklch()`…— o un texto con contraste menor que AA (con el color **real**: las transparencias se mezclan con lo que hay debajo). Las opciones de los desplegables (que no ocupan lugar en la página) se revisan aparte, aceptando solo la paleta y los colores del sistema `Canvas`/`CanvasText`. Otra prueba comprueba que el revisor sí detecta el azul del navegador, un azul de Tailwind, el rojo de shadcn/ui, un anillo rojo, una opción de desplegable roja y un texto con poco contraste. Desde el 19/10/2026 los colores aceptados son **los de cada modo** (8.5): en claro, un tono del modo oscuro también falla.

### 8.2 Componentes shadcn/ui sin cambios + Tailwind CSS *(15/10/2026)*

**shadcn/ui** no es una librería que se instala y queda "cerrada": es un catálogo de componentes accesibles (desde el 16/10/2026, hechos sobre **Base UI**; antes, Radix UI) que la herramienta `shadcn` **copia** al proyecto (`app/src/components/ui/`). Se pintan con **Tailwind CSS** (clases cortas como `px-2`, `bg-primary`). Se instaló con la guía oficial para Vite (Tailwind v4 con `@tailwindcss/vite`, alias `@/` = `src/`, `components.json`).

**Desde el pedido de Gustavo del 15/10/2026, esos archivos no se editan:** quedan exactamente como los genera `npx.cmd shadcn add` con la versión instalada (`shadcn` 4.21.5 en `devDependencies`) y el `components.json` actual (estilo `base-vega`, color base `neutral`, `cn()` del paquete `cn`). La marca va solo en el tema (8.1). Si un componente necesita otra cosa, se resuelve **afuera**: con sus props públicas, con clases de medidas en el lugar de uso o con un componente propio en `src/componentes/` que lo envuelva.

| Componente shadcn/ui | Dónde |
|---|---|
| `Button` | Todos los botones (Actualizar, Exportar, Limpiar filtros, Cerrar sesión, paginación, copiar, flecha de "Por centro", tema…) y los enlaces con forma de botón ("Volver a la lista", "Ir al buscador", con `asChild`). |
| `RadioGroup` + `ButtonGroup` + `Button` | "Por orden / Por centro de negocio" (`src/componentes/OpcionesBoton.tsx`): botones pegados que son un grupo de opciones (`role="radiogroup"`, cada opción `role="radio"` con `aria-checked`) y se usan como los `<input type="radio">`: **las flechas mueven el foco y eligen** (patrón de WAI-ARIA). La elegida va con el estilo principal (`variant="default"`) y la otra con `outline`. `ButtonGroup` es nuevo: reemplaza al `RadioGroupBoton` que se había agregado dentro de `radio-group.tsx`. |
| `Input` | Buscador y filtros "contiene" (Código, Descripción, Orden). |
| `NativeSelect` | Cliente, Tipo de orden, Estado y Filas por página. **Se eligió en vez de `Select`:** es el `<select>` del navegador, el más accesible (en el celular abre la lista del sistema, se elige escribiendo las primeras letras, todos los lectores de pantalla lo conocen) y va bien con listas largas (los clientes del Excel). |
| `Table` | Las tablas (por orden, por centro, centro abierto, detalle, columnas detectadas), con el encabezado de marca y las filas alternas. |
| `Card` | Tarjetas (cargando, bienvenida, mensajes, "Página no encontrada", ficha del centro) con sus partes `CardHeader`/`CardContent`/`CardFooter`, y las cajas de las tablas. |
| `Badge`, `Alert`, `Separator`, `Kbd` | Insignias (Modo demostración, N° de órdenes, filtros activos), avisos (`default` y `destructive`), línea entre avisos y la tecla `/`. |
| `Collapsible` | "Columnas detectadas en el Excel" (antes `<details>`): botón con `aria-expanded`. |
| **No se usaron** | `Select`: ver `NativeSelect`. `Pagination`: está hecho con enlaces (`<a>`), que no se pueden desactivar ni cuidan el foco como la paginación actual (botones; al llegar a la última página el foco pasa a "Página X de Y"); se usó `Button` dentro de la misma paginación. `Spinner`: su texto para lectores de pantalla viene en inglés ("Loading"); la ruedita propia va con el texto visible "Cargando…". |

**Accesibilidad que antes dependía de cambiar componentes y ahora se resuelve sin tocarlos:**

| Qué | Antes (componente cambiado) | Ahora (sin editar `src/components/ui`) |
|---|---|---|
| "Por orden / Por centro": las flechas eligen | `RadioGroupBoton` agregado en `radio-group.tsx` | `OpcionesBoton.tsx`: `RadioGroup` de shadcn/ui + `ButtonGroup` con `role="presentation"` (prop pública) + `Radio.Root` de Base UI con `render={<Button />}` y `nativeButton`. |
| Encabezado fijo arriba al bajar en la caja con scroll | opción `container={false}` agregada en `table.tsx` | `CajaTabla` (`Celdas.tsx`, una `Card`): clase de medidas `[&>[data-slot=table-container]]:overflow-visible` para que la caja de la `Table` no tenga su propio scroll; el `<th>` lleva `sticky top-0`. |
| Foco visible en el modo de alto contraste de Windows (ahí no se dibujan sombras y el anillo de shadcn/ui es una sombra) | contorno transparente en utilidades propias | regla de `estilos.css` que **solo** actúa con `forced-colors: active` (contorno de 2 px del color del sistema). No cambia nada en el modo normal: la opción menos invasiva. |
| Sin animaciones para quien pidió "reducir el movimiento" en su sistema (WCAG 2.3.3) | regla de `estilos.css` (ya estaba) | la misma regla global (`prefers-reduced-motion: reduce`, con `!important`): quita transiciones y fundidos **también** a los componentes de shadcn/ui (Button, Input, TableRow, Tooltip…), **solo** a esas personas; las demás ven los de shadcn/ui. Es la segunda excepción de accesibilidad *(por confirmar con Gustavo; la alternativa es quitarla y que esas personas también vean las animaciones de shadcn/ui)*. |
| Foco de lo que no es de shadcn/ui (enlace del código, caja de la tabla, "Página X de Y", títulos que ordenan) | utilidades `foco-*` | contorno de 2 px del color `--ring` (`estilos.css`); los títulos que ordenan, un contorno blanco por dentro de la celda (11,1:1). |
| El motivo de un filtro desactivado aparece al pasar el mouse | el `title` en el control (el control recibía el mouse) | el Input y el NativeSelect de shadcn/ui desactivados no reciben el mouse (`disabled:pointer-events-none`): el mismo `title` va también en la caja del campo (`Filtros.tsx`). |
| "Saltar a la paginación" (aparece solo con Tab) | — | `sr-only focus:not-sr-only` dejaba el botón sin alto ni espacio interior; `focus:h-9 focus:px-2.5` (clases de medidas) le devuelven las del Button de shadcn/ui. |

**Reglas globales de `estilos.css` que también alcanzan a los componentes** (no editan sus archivos, pero se aplican a todo; ninguna cambia sus colores fuera del tema):

| Regla | Qué hace en los componentes | Por qué |
|---|---|---|
| `* { border-border outline-ring/50 }` | color de bordes y contornos por defecto | la agrega `shadcn init` (es de shadcn/ui) |
| `font-family` en `html` | letra Calibri en todo | la letra de la marca (8.1) |
| `button:not(:disabled), [role="button"]:not(:disabled) { cursor: pointer }` | la "manito" al pasar el mouse por un Button | Tailwind v4 dejó la flecha; es la regla que recomienda la guía de shadcn/ui para Tailwind v4 |
| `::selection` | el texto seleccionado (ej. dentro del buscador, un Input) en Primary Blue con texto blanco (en oscuro, Light Blue con Primary Blue) | marca: sin el azul del navegador (8.1). El NativeSelect ya trae lo mismo (`selection:bg-primary`) |
| `prefers-reduced-motion: reduce` | sin transiciones ni fundidos | accesibilidad (ver la tabla de arriba); solo si la persona lo pidió en su sistema |
| `forced-colors: active` | contorno de foco de 2 px del color del sistema | accesibilidad (ver la tabla de arriba); solo en alto contraste |

**Único control que no es de shadcn/ui:** el **título que ordena** cada columna (`EncabezadoOrdenable` en `Celdas.tsx`) es un `<button>` simple dentro del encabezado Primary Blue. Las variantes del Button de shadcn/ui están pensadas para fondos claros: con `ghost`, al pasar el mouse pondría un fondo claro en el encabezado y en oscuro el texto no llegaría al contraste AA; con `link`, el texto sería del color `--primary`, igual que el fondo del encabezado (invisible). Por eso toma el color del texto del encabezado, se subraya con el mouse y con el teclado lleva un contorno de 2 px por dentro *(por confirmar con Gustavo; la alternativa es `Button variant="ghost"` aceptando su fondo claro al pasar el mouse)*. Una prueba unitaria (`shadcn-natural.test.ts`) avisa si aparece otro control nativo fuera de `src/components/ui`.

- **Accesibilidad que se mantiene:** mismos ids, roles, etiquetas y textos; foco visible con el teclado; `aria-sort` en los títulos; "Saltar al buscador / al contenido" y "Saltar a la paginación"; atajo `/`; avisos que se vuelven a leer en voz alta; contraste AA en claro y en oscuro.
- **Pruebas que cambiaron con los componentes "naturales" (y por qué):** las de apariencia, porque el pedido cambió la apariencia esperada; las de funcionamiento (`rutas.spec.ts`, `microsoft-simulado.spec.ts` y las unitarias de lógica) pasan sin cambios, y a `app.spec.ts` solo se le **agregaron** comprobaciones (el motivo de un filtro desactivado aparece al pasar el mouse; "Saltar a la paginación" tiene las medidas de un botón) y, en "Por orden / Por centro", las flechas se pulsan como una persona (50 ms abajo): el `RadioGroup` de Radix elige la opción solo si la flecha sigue pulsada cuando mueve el foco, y Playwright la soltaba al instante (a veces fallaba con la computadora ocupada).
  - `guia-aic.spec.ts`: la prueba "solo colores de la paleta" pasó al criterio de Gustavo (paleta **y sus transparencias** + sombras neutras) y ahora lee cualquier notación de color (`tests/e2e/colores.ts`; antes solo `rgb()`, así que un color de Tailwind en `oklch()` se le habría escapado); el contraste se mide con el color real (mezclando transparencias). Nueva prueba del propio revisor (detecta el azul del navegador, un azul de Tailwind, el rojo de shadcn/ui, un anillo rojo y poco contraste). Las demás comprueban lo nuevo: encabezado de marca y filas alternas sobre la Table de shadcn/ui (más el encabezado fijo al bajar), Alert y Card de shadcn/ui en vez de la caja de nota, fondos con el mouse encima de shadcn/ui (`bg-muted/50`, `bg-primary/80`) en vez de la raya izquierda, fundido de la ayuda y del aviso flotante (antes se exigía que **no** hubiera), modo oscuro con el tema nuevo.
  - `guia-aic.spec.ts` (revisión): el centro abierto es la fila "seleccionada" de shadcn/ui (`--muted`, sin aclararse con el mouse); la ayuda flotante espera al menos 300 ms con el mouse (medido dentro de la página); nueva prueba de "menos movimiento" (con la preferencia: sin transiciones ni fundidos; sin ella: los 0,15 s de shadcn/ui).
  - `diseno.spec.ts`: el foco esperado es el de shadcn/ui (borde `--ring` + anillo de 3 px al 50 %) en vez del anillo sólido de 2 px; `#contenedor-tabla` es una Card (su contorno de 1 px es un `ring-1`, no un borde); la prueba "al hacer clic en una caja no aparece el anillo" pasó a "el anillo sigue a `:focus-visible`" (botones: solo con el teclado; cajas y desplegables: también con el clic, como shadcn/ui, y se exige el borde y el anillo **justo después del clic**, también en los desplegables); se agregaron el foco de los títulos que ordenan y el modo de alto contraste. El contraste del foco se mide **tal como se dibuja** (el anillo con su 50 %, sobre la página, las tarjetas y las filas alternas): antes se medía la variable `--ring` opaca y el anillo pasaba aunque no llegara a 3:1. Ahora se exige 3:1 al borde en los dos modos y al anillo en oscuro. Nueva prueba del tamaño de letra (14 px en tablas y controles; 16 px en el resto).
  - Unitarias: se quitó `modalidad.test.ts` (probaba `logica/modalidad.ts`, que ya no existe); `tabla.test.tsx` mira el ▲▼ tenue con `opacity-60` (antes, una variable propia) y el centro abierto con `data-state="selected"`; nueva `shadcn-natural.test.ts` (los archivos de `src/components/ui` no tienen las adaptaciones de antes ni texto agregado a mano, tienen finales de línea LF y fuera de ellos no hay controles nativos salvo el título que ordena).
- **Seguridad (CSP):** Base UI pone algunos estilos en línea (posición de la ayuda flotante): la CSP ya permite `style-src 'unsafe-inline'`; los scripts siguen solo `'self'`. Lo comprueban las pruebas en navegador (sin errores de consola, con la CSP activa).
- **`npm audit`:** las librerías que se publican no tienen avisos (`npm.cmd audit --omit=dev`). El paquete `shadcn` (en `devDependencies`) trae avisos de dependencias suyas que no llegan a la app.
- **El paquete `shadcn` no es solo la herramienta para agregar componentes:** `src/estilos.css` importa **`shadcn/tailwind.css`** (de ese paquete), que define las variantes de Tailwind que usan los componentes (`data-open:`, `data-checked:`, `data-horizontal:`…). Se usa **al compilar** (`npm run build`), por eso tiene que quedar instalado: si se quitara de `package.json`, la compilación fallaría. No se publica como código (solo las reglas de CSS que se usan).

**Cómo comprobar que los componentes siguen sin cambios** (necesita internet; cada archivo debe decir *"skip (identical)"*):

```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npx.cmd shadcn add alert badge button button-group card collapsible input kbd native-select radio-group separator table --dry-run
```

`--dry-run` compara el contenido sin mirar los finales de línea. Para una comparación **byte a byte** (ej. con `cmp`), los archivos deben estar con LF, como los escribe shadcn: de eso se encarga `.gitattributes` (en la raíz del repositorio: `app/src/components/ui/** text eol=lf`). Sin él, con `core.autocrlf=true` (lo normal en Windows), Git los sacaba con CRLF y `cmp` decía "distintos" aunque el contenido fuera el mismo. Otra forma de comprobarlo: regenerarlos con `--overwrite --yes` (receta de abajo) y ver que `git status` no muestre cambios.

**Cómo agregar un componente de shadcn/ui** (ej. un diálogo):

```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npx.cmd shadcn add dialog
```

Eso crea `src/components/ui/dialog.tsx` y agrega las librerías que necesite. Se escribe **sin** `@latest`: así usa la versión de la herramienta instalada en el proyecto (`shadcn` en `devDependencies`), la misma que generó los componentes actuales (con `shadcn@latest` se descargaría otra versión, que podría generar otro estilo u otras librerías). Para probar sin escribir nada: `npx.cmd shadcn add dialog --dry-run`. Después: (1) **no** editar el archivo: usarlo con `import { Dialog } from '@/components/ui/dialog'` y, en el lugar de uso, solo clases de medidas (los colores ya salen del tema); (2) si hace falta otro comportamiento, envolverlo en un componente propio en `src/componentes/` (como `AyudaFlotante.tsx`); (3) correr `npm.cmd run lint`, `npm.cmd test` y `npm.cmd run test:e2e` (la prueba de colores avisa si se coló un color ajeno a la marca).

**Cómo actualizar los componentes** (ej. al subir la versión de la herramienta **a propósito**: `npm.cmd install -D shadcn@<versión>`):

```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npx.cmd shadcn add alert badge button button-group card collapsible input kbd native-select radio-group separator table --overwrite --yes
git diff src/components/ui
```

`--overwrite` reemplaza los archivos por los que genera la herramienta (por eso no se les hacen cambios a mano: se perderían). Revisar con `git diff` qué cambió, ajustar **la app** si hace falta (nunca los componentes) y correr todas las pruebas.

### 8.3 Base UI + diseño de rutas con React Router *(16/10/2026)*

- **shadcn/ui sobre Base UI:** `components.json` pasó de `radix-vega` a `base-vega` y los componentes se regeneraron con `npx.cmd shadcn add … --overwrite --yes` (siguen **sin cambios a mano**). El paquete `radix-ui` se quitó; se usa `@base-ui/react`. En la app, `asChild` pasó a ser la prop `render` de Base UI (`CollapsibleTrigger render={<Button …/>}`, `Radio.Root render={<Button …/>}`, `TooltipTrigger render={…}`). Los enlaces con forma de botón ("Volver a la lista", "Ir al buscador") usan `buttonVariants()` sobre el `<Link>`: con `Button render` Base UI les pondría `role="button"` y dejarían de ser enlaces.
- **Diferencias de Base UI que se notan en las pruebas:** el Collapsible marca el disparador con `data-panel-open`; el orden de los atributos del `<button>` cambió.
- **index.html sin HTML de la app:** solo `<div id="raiz">`. El diseño común (cabecera, "Saltar al …", `<main>`, aviso flotante) es la ruta "layout" `DisenoApp` (React Router, `<Outlet />`): con la sesión iniciada, el `<Outlet>` muestra las rutas y les pasa configuración, sesión y aviso por su contexto (`useContextoSesion`); antes, muestra "Cargando…", el inicio de sesión o el mensaje que toque. Las pruebas abren las rutas sin el arranque con `rutasConSesion()` (`tests/unit/ayuda-rutas.tsx`).

### 8.4 Modo oscuro nativo de shadcn/ui y logo de AIC *(16/10/2026)*

- **Modo claro / oscuro como lo indica shadcn/ui para Vite:** `src/components/theme-provider.tsx` es el `ThemeProvider` de la guía de shadcn/ui (copiado tal cual) y envuelve la app en `App.tsx`. Pone la clase `light` o `dark` en `<html>` y guarda la elección en `localStorage` (`vite-ui-theme`); sin elección sigue el modo del sistema (al cargar la página; si el sistema cambia con la página abierta, se ve al recargar, como en la guía). El CSS usa la variante de shadcn/ui (`@custom-variant dark (&:is(.dark *))`) y un solo bloque `.dark { … }`. `public/tema-inicial.js` pone esa misma clase antes de pintar, para que no haya destello blanco. Se quitaron `useTema.ts`, `logica/tema.ts`, `BotonTema.tsx`, `AyudaFlotante.tsx` y el `Tooltip` (ya no se usaba).
- **Botón de tema** (`src/components/mode-toggle.tsx`, `ModeToggle`): un solo botón; **cada clic pasa al siguiente** modo: claro → oscuro → sistema → claro. Muestra el ícono del modo actual (sol, luna o pantalla) y su nombre lo dice: "Tema claro. Cambiar a tema oscuro". La elección anterior (`buscador-cn.tema`) no se migra: la primera vez se usa el modo del sistema.
- **Diferencia que se nota:** con la variante nativa (`.dark`), en oscuro `dark:border-input` gana a `focus-visible:border-ring` en los botones `outline`: el foco con teclado lo marca el anillo (`--ring` al 50 %, ≥ 3:1), el borde sigue en `--input`. Así es shadcn/ui.
- **Logo de AIC** (pedido de Gustavo: "en modo oscuro no hay mucho contraste en el logo y está muy simple"): el ícono genérico se cambió por el logo oficial de www.aic.pe ("AIC" con la señal wifi naranja y "Embracing the future"), recortado en `public/marca/`: azul marino en claro y blanco en oscuro (`LogoAic` en `Iconos.tsx`). Va en la cabecera (enlaza a www.aic.pe), separado del título por un `Separator`. Bajo la cabecera, una línea de marca de 3 px del azul principal al **naranja del logo** (solo decorativo, nunca texto). *(19/10/2026: el logo se regeneró desde el archivo oficial y el naranja pasó a `#F28818`, el medido en el logo; ver 8.5.)*

### 8.5 Paleta de AIC (modo claro), paleta propia (modo oscuro), logo y favicon *(19/10/2026)*

Pedido que recibió Aaron el 19/10/2026 (*por confirmar* quién lo pidió): poner el logo de la empresa, usar la **paleta de la empresa en el modo claro** y, en el **modo oscuro**, otra paleta elegida aquí, **igual o parecida** a la de la empresa, que combine y se vea bien.

**Cómo se aplica** (igual que la marca de antes, sin tocar `src/components/ui`; el `ThemeProvider` y el botón claro → oscuro → sistema de Gustavo no cambian):
- **Variables del tema** en `src/estilos.css` (`:root` = claro, `.dark` = oscuro). Además de las de shadcn/ui hay tres colores propios de la marca, cada uno con su `-foreground` y su utilidad de Tailwind: `--encabezado-tabla` (`bg-encabezado-tabla`), `--resaltado` (lo encontrado, `<mark>`) y `--marca-naranja` (`bg-marca-naranja`).
- **Clases en el lugar de uso**, solo para los acentos: fila con el mouse encima (`CLASE_FILA = 'hover:bg-accent'` en `tabla.ts`; reemplaza al `hover:bg-muted/50` de la `TableRow`), barra naranja de 3 px bajo la vista elegida (`OpcionesBoton.tsx`, una sombra interior: no cambia el tamaño del botón) y contador de filtros naranja (`Filtros.tsx`).
- **"Volver a la lista"** (detalle de un centro) es un enlace con el aspecto del botón `outline` (`buttonVariants` de shadcn/ui). Sus clases pasan por `cn()`, igual que en el `Button`, para que quede el borde de la variante (Border Gray) y no el transparente de la base: sin `cn()`, en claro se veía sin borde junto a "Actualizar" y el botón de tema *(20/10/2026)*.

**Modo claro = paleta oficial + el naranja del logo.** Solo los 9 colores de la guía y el naranja medido en el logo oficial (más su tono claro para lo encontrado). El naranja **nunca es texto** sobre blanco (2,5:1, no llega a AA): va como acento o con texto oscuro encima.

**Modo oscuro = paleta propia, parecida a la de AIC.** Fondos de azul AIC muy oscuro (a partir del Primary Blue), texto Light Blue, encabezado de tablas Dark Blue con texto blanco y el **mismo naranja del logo** (sobre el fondo oscuro ya da 7,1:1, así que no hizo falta un naranja más claro).

Colores y contrastes medidos (fórmula de WCAG 2.1, la misma que usa la prueba; AA pide 4,5:1 en texto normal y 3:1 en bordes de controles y foco):

| Para qué | Variable | Claro | Oscuro |
|---|---|---|---|
| Página / texto | `--background` / `--foreground` | White `#FFFFFF` / Black `#000000` (21:1) | `#0E1726` / Light Blue `#E8EEF5` (15,4:1) |
| Tarjetas, avisos, cajas de las tablas | `--card`, `--popover` | White / Black (21:1) | `#16233A` / Light Blue (13,5:1) |
| Textos secundarios | `--muted-foreground` | Gray `#666666` (5,7:1 con White; 5,3:1 con filas alternas; 4,9:1 con Light Blue) | `#A8B6CC` (8,7:1 con la página; 6,9:1 con filas alternas; 5,6:1 con la fila con el mouse) |
| Títulos, enlaces, botón principal, vista elegida, texto seleccionado | `--primary` / `--primary-foreground` | Primary Blue `#1E3A6E` / White (11,1:1); enlaces 9,5:1 sobre Light Blue | `#8FB0E0` / `#0E1726` (8,1:1); enlaces 7,1:1 sobre tarjetas, 5,2:1 sobre la fila con el mouse |
| Botón principal con el mouse encima (shadcn/ui: `--primary` al 80 %) | — | ≈ `#4B618B` / White (6,2:1) | ≈ `#7591BB` / `#0E1726` (5,6:1) |
| Encabezado de tablas | `--encabezado-tabla` | Primary Blue / White (11,1:1) | Dark Blue `#2C5282` / White (8,0:1) |
| Filas alternas y centro abierto | `--muted` | Light Gray `#F5F5F5` (texto 19,3:1) | `#1C2B47` (texto 12,1:1) |
| Fila con el mouse encima | `--accent` | Light Blue `#E8EEF5` (texto 18,0:1) | `#24395E` (texto 9,9:1) |
| Insignias (N° de órdenes) e iniciales | `--secondary` | Light Blue / Primary Blue (9,5:1) | Dark Blue / White (8,0:1) |
| Lo encontrado por el buscador (`<mark>`) | `--resaltado` | naranja claro `#FFE3BF` / Primary Blue (9,0:1) | `#5A3A0E` / `#FFE3BF` (8,3:1) |
| Acentos: línea de la cabecera, barra de la vista elegida, contador de filtros | `--marca-naranja` | `#F28818`; contador con texto Black (8,3:1); barra sobre Primary Blue 4,4:1 | `#F28818` (7,1:1 con la página); contador con texto `#0E1726` (7,1:1) |
| Bordes decorativos (tablas, avisos; botones `outline` en claro) | `--border` | Border Gray `#CCCCCC` | `#33476B` |
| Borde de cajas y desplegables; en oscuro, también el de los botones `outline` (≥ 3:1) | `--input` | Gray `#666666` (5,7:1) | `#7086AC` (4,9:1 con la página; 4,3:1 con tarjetas; 3,8:1 con filas alternas; 3,1:1 con la fila con el mouse encima) |
| Foco con el teclado (borde + anillo de 3 px al 50 %) | `--ring` | Medium Blue `#3B6BAA` (borde 5,4:1 con White, 5,0:1 con filas alternas, 4,6:1 con la fila con el mouse; anillo 2,1:1: ver 8.1) | `#BDD0EC` (borde 11,5:1 con la página y 7,3:1 con la fila con el mouse encima; anillo 3,8:1 con la página, 3,6:1 con tarjetas, 3,4:1 con filas alternas y 3,1:1 con la fila con el mouse encima) |
| Errores | `--destructive` | Primary Blue | `#8FB0E0` |

**Ajustes al medir** (respecto de la primera propuesta): el foco en oscuro quedó en `#B8CCEA` y no en `#8FB0E0` (con ese, el anillo al 50 % daba 2,95:1 sobre la página: no llegaba a 3:1); el borde de cajas en oscuro quedó en `#6B80A6` (con `#5D7398`, 2,95:1 sobre las filas alternas); el naranja es el del logo en los dos modos. **Revisión del 20/10/2026:** en oscuro, el botón de expandir de "Por centro" (un botón `outline`, que en oscuro lleva el borde `--input`) se apoya sobre la fila con el mouse encima, y ahí `#6B80A6` daba 2,89:1 y el anillo de foco con `#B8CCEA`, 2,97:1. Se aclararon lo justo: `--input` `#7086AC` (3,1:1) y `--ring` `#BDD0EC` (3,1:1); a la vista casi no cambian. La barra naranja sobre el azul claro de la vista elegida en oscuro casi no cambia de luminosidad (1,1:1): se distingue por el color y es solo decorativa (lo elegido se reconoce por el fondo lleno y `aria-checked`).

**Qué cambió a la vista respecto del tema suave (16/10/2026):** página White (antes Light Gray) y texto Black (antes `#1A2333`); bordes Border Gray y cajas con borde Gray (antes grises azulados); fila con el mouse encima Light Blue (antes casi no se notaba); encabezado de tablas en oscuro Dark Blue con texto blanco (antes azul claro con texto oscuro); lo encontrado en naranja claro (antes blanco sobre Primary Blue, igual que el encabezado y los botones); barra naranja en la vista elegida y contador de filtros naranja.

**Logo** (`public/marca/`, `LogoAic` en `Iconos.tsx`): se regeneró desde el archivo oficial que pasó Aaron (1248×832 px), porque los PNG de antes (sacados de www.aic.pe, 230×120 y 221×120 px) no coincidían del todo: el de modo oscuro tenía otra letra en "Embracing the future" y la señal wifi en otro lugar, y el de claro tenía bordes borrosos. Se recortó sin márgenes, se quitó el fondo blanco (cada punto pasa a azul marino o naranja con su transparencia, sin halo blanco) y se achicó con un filtro que no inventa colores: **claro** = azul marino `#22256A` y naranja `#F28818` (los del logo, medidos en el archivo); **oscuro** = blanco y el mismo naranja. Los dos miden 305×160 px (4 veces los 40 px de alto con que se muestra). En la cabecera: 40 px de alto (36 px en el celular), centrado con el título, `alt="AIC"` y enlace a www.aic.pe. Se hizo una sola vez con Python + Pillow; si cambia el logo, reemplazar los dos PNG (o actualizar `width`/`height` en `Iconos.tsx`: `marca.test.tsx` avisa si no coinciden con el archivo).

**Favicon** (`public/favicon.svg`): la "i" del logo con su señal wifi: cuadrado redondeado azul marino del logo, señal naranja y palo blanco (antes, una cuadrícula azul genérica `#1D5BBF`, fuera de la marca). Para el iPhone (pantalla de inicio) y Safari, `public/marca/aic-icono-180.png` con el mismo dibujo (`<link rel="apple-touch-icon">` en `index.html`). La página puente `redirect.html` usa en oscuro el fondo y el texto de la paleta oscura.

**Pruebas:**
- `guia-aic.spec.ts`: el revisor de colores ahora recibe **los colores de cada modo** (`COLORES_CLARO` y `COLORES_OSCURO` en `tests/e2e/colores.ts`): en claro falla con un tono del modo oscuro y con texto naranja sobre blanco (contraste); sigue fallando con el azul del navegador, colores de Tailwind fuera del tema, rojo, opciones de desplegable de otro color y contraste bajo. Nuevas: acentos naranja (línea, barra de la vista elegida en las dos vistas, contador de filtros, `<mark>`) en claro y oscuro; logo (carga, el de cada modo visible y el otro oculto, `alt`, 40/36 px, nitidez, centrado con el título, colores del logo oficial, sin márgenes); favicon e ícono de 180 px. Las demás pruebas de colores pasaron de los tonos suaves a la paleta nueva (mismas comprobaciones).
- `diseno.spec.ts` y `app.spec.ts`: solo cambian los colores esperados (foco en oscuro, borde de cajas, fondo antes de cargar).
- Revisión del 20/10/2026: los botones `outline` (Actualizar, tema, Exportar y "Volver a la lista") tienen su borde de 1 px en claro (Border Gray) y en oscuro (`--input`); en oscuro, el borde y el anillo de foco también llegan a 3:1 sobre la fila con el mouse encima (con los colores del tema y midiendo el botón de expandir de verdad); la prueba de que el centro abierto no cambia con el mouse espera a que termine la transición de 150 ms antes de comparar (antes podía leer el color a mitad de camino y pasar aunque cambiara).
- Unitarias (`marca.test.tsx`): en `estilos.css` el modo claro solo tiene colores de la paleta oficial y del naranja del logo, y el oscuro define los mismos colores, solo con la paleta, el naranja y sus tonos propios (cada color del tema se revisa en cualquier notación —`rgb()`, `oklch()`, un nombre como `gray`—, una variable nueva tiene que declararse como color o como medida, y una prueba comprueba que la revisión detecta todo eso); `claseFila()`; el logo usa los PNG con sus medidas reales y `alt="AIC"`; favicon e ícono enlazados en `index.html`.

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
- [ ] **Paleta y logo del 19/10/2026 (rama `paleta-aic`)**: que lo vea quien lo pidió (`npm.cmd run dev:demo`, en claro y en oscuro; plan de pruebas 1.20) y publicarlo (`npm.cmd run preparar-publicacion` → arrastrar `publicar/`). *(por confirmar quién lo pidió y cuándo se publica)*
- [ ] **Naranja del logo fuera de los 9 colores de la guía**: la guía dice que no se usen colores fuera de su paleta; el naranja se usa porque es el del logo y solo como acento (línea, barra, contador, resaltado). ¿Está bien o se deja solo en el logo? (sección 8.5) *(por confirmar con Gustavo)*
- [ ] **Paleta propia del modo oscuro** (`#0E1726`, `#16233A`, `#1C2B47`, `#24395E`, `#8FB0E0`…): la guía no define un modo oscuro. ¿Se aprueba? Al abrir una lista desplegable, las opciones salen casi negras (color del sistema, `rgb(18, 18, 18)`). (sección 8.5) *(por confirmar con Gustavo)*
- [ ] **Texto Black y fondo White en modo claro** (los de la guía): reemplazan al texto `#1A2333` y al fondo Light Gray del "tema suave" del 16/10/2026. ¿Se ve bien así o se prefiere el de antes? (sección 8.5) *(por confirmar con Gustavo)*
- [ ] **Lema "Embracing the future" del logo**: a 40 px de alto queda muy chico (unos 3,5 px; 3,2 px en el celular) y en pantallas comunes (1x) no se lee. ¿Se puede usar en la cabecera el logo sin el lema? Si se aprueba, se genera desde el mismo archivo oficial una versión solo con "AIC" y la señal: en los mismos 40 px las letras se verían 1,33 veces más grandes. *(por confirmar con quien lo pidió o con Gustavo)*
- [ ] **Anillo de foco en modo claro**: el de shadcn/ui va al 50 % y sobre blanco se ve tenue (2,1:1; 2,0:1 sobre las filas alternas); lo que cumple WCAG es el borde Medium Blue de 1 px (5,4:1). Opciones: **(a)** dejarlo así (el borde es el indicador) o **(b)** `--ring: #000000` (Black, de la paleta): anillo 3,95:1 y borde 21:1, pero se ve menos de marca. Ningún azul de la paleta llega a 3:1 con el anillo al 50 % (Dark Blue 2,4:1; Primary Blue 2,7:1). (sección 8.1) *(por confirmar con Gustavo)*
- [ ] **Letra de 14 px en tablas, botones, desplegables y cajas** (la de shadcn/ui; antes 16 px, 15 px en el celular): Calibri se ve más chica que otras letras del mismo tamaño. ¿Se deja así? (sección 8.1) *(por confirmar con Gustavo)*
- [ ] **Centro abierto en "Por centro"**: ahora usa el fondo de fila "seleccionada" de shadcn/ui (Light Gray; en oscuro, `#1C2B47`), el mismo de las filas alternas; antes era Light Blue con una raya de 4 px (desde el 19/10/2026 el Light Blue es el de la fila con el mouse encima). ¿Cuenta como parte de las "filas de marca" o se prefiere el Light Blue de antes? (sección 8.1) *(por confirmar con Gustavo)*
- [ ] **Título que ordena las columnas**: es el único botón que no es de shadcn/ui (un `<button>` simple, porque las variantes del Button de shadcn/ui no se ven bien sobre el encabezado Primary Blue). ¿Se deja así o se usa `Button variant="ghost"` con su fondo claro al pasar el mouse? (sección 8.2) *(por confirmar con Gustavo)*
- [ ] **"Reducir movimiento"**: para quien lo pidió en su sistema, la app quita las transiciones y fundidos también a los componentes de shadcn/ui (accesibilidad, WCAG 2.3.3). ¿Se mantiene esta excepción? (sección 8.2) *(por confirmar con Gustavo)*
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
