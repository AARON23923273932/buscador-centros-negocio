# 🌐 Sitio web — Buscador de centros de negocio

> Proyecto "Sitio web" en Notion (código PRY-2, id `3f2738bc3a6381408614e380da98edac`). Notion es la agenda; aquí está el trabajo.
> La app está en [`app/`](app/). La guía para conectarla a Microsoft 365 está en [`GUIA-CONFIGURACION-MICROSOFT.md`](GUIA-CONFIGURACION-MICROSOFT.md). Las pruebas manuales para entregarla están en [`pruebas/plan-de-pruebas.md`](pruebas/plan-de-pruebas.md).

## Estado actual (14/10/2026)
- **Cambios pedidos por Gustavo (14/10/2026, por WhatsApp)** — hechos y probados en la PC (rama `ui-react-router`; falta publicarlos):
  1. **Más margen a los lados** para leer mejor: el contenido va en una columna centrada (máx. 1240 px) con margen lateral de 16 px (celular) a 56 px (pantallas grandes); la cabecera tiene el fondo a todo el ancho pero su contenido alineado con la columna.
  2. **Contornos menos agresivos:** bordes de 1 px de color suave y, al usar el teclado, un **anillo suave** (borde azul + halo semitransparente) en vez del contorno grueso de 3 px. Solo aparece con el teclado (`:focus-visible`), no al hacer clic; el botón de login ya no aparece remarcado al abrir la página.
  3. **Íconos alineados:** todos son SVG de 16–18 px centrados con su texto (lupa y "×" del buscador, flecha propia en los desplegables, copiar código, ▲▼ de los títulos, flecha de "Por centro", Actualizar, Exportar, Filtros, ☀️/🌙, paginación, logo de Microsoft).
  4. **React Router** (librería de rutas) para escalar: cada pantalla tiene su dirección — `/ordenes`, `/centros` y **`/centros/<código>`** (nuevo: detalle de un centro) — y "Página no encontrada" para cualquier otra (tabla en la sección 2). La búsqueda y los filtros siguen en la dirección y funcionan con el botón **atrás** del navegador. El login sigue protegiendo **todas** las rutas y al volver de Microsoft se queda en la misma dirección.
  - Para publicar: `npm.cmd run preparar-publicacion` y arrastrar `publicar/` (ahora incluye **`_redirects`**, necesario para que Netlify entregue la app en `/centros/…`; guía, paso 6). Las pruebas automáticas: **320 unitarias** y **62 en navegador** (antes 297 y 42).
- **Código migrado a React 19 + TypeScript (estricto)** *(13/10/2026, pedido del supervisor: "priorizar el uso de TypeScript y una librería como React por temas de escalabilidad")*. La app **se ve y funciona igual** (mismos textos, diseño, login, filtros, exportar…), **también mientras carga**: la cabecera y el botón ☀️/🌙 se ven desde el primer momento, como antes. Lo comprueban las 39 pruebas en navegador de antes (sin cambiar sus selectores) + 3 nuevas de la pantalla de carga, y 297 pruebas unitarias (antes 234). Además, `npm run lint` revisa las reglas de React. Detalle en las secciones 7 y 8. Para que Netlify muestre esta versión hay que volver a publicar (`npm.cmd run preparar-publicacion` y arrastrar `publicar/`).
- **Publicada en Netlify:** https://aic-centros-negocio.netlify.app (en línea siempre, no depende de la PC).
- **Login con Microsoft activo:** app "Buscador de centros de negocio" registrada en Entra ID (tenant JAICOS CORP S.A.C.). Solo entran cuentas `@aic.pe` y `@jaicoscorp.com`. Permisos (solo lectura): al **iniciar sesión** solo se pide `User.Read`; `Files.Read.All` se pide **al leer el Excel**.
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
| **Buscador** | Una caja grande: "Buscar por código, descripción, cliente u orden…". No importan mayúsculas ni tildes (`electrico` encuentra "Eléctrico"). Varias palabras = deben aparecer **todas** (`cableado demo b`). `cn0005` encuentra `CN-0005` (y lo resalta). Las coincidencias se resaltan en amarillo. Atajo: tecla `/`. |
| **Filtros** | **Desplegables** (se elige una opción de la lista): Cliente, Tipo de orden y Estado (estos dos, si el Excel tiene esa columna). **De texto** ("contiene"): Código, Descripción y Orden de compra/servicio. Botón **Limpiar filtros**. Se combinan con el buscador. En el celular, el botón "Filtros" muestra cuántos hay activos. |
| **Tabla tipo Excel** | Títulos fijos al bajar, clic en un título para ordenar (▲/▼), filas de colores alternos, paginación (25/50/100/250) y contador "Mostrando 1–50 de 63 resultados (de 80 en total)". |
| **Vista "Por centro de negocio"** | Una fila por centro (código, descripción, clientes, N° de órdenes) que se abre para ver sus órdenes. Se cambia con el interruptor **Por orden / Por centro de negocio**, que lleva de `/ordenes` a `/centros` (y viceversa) sin perder la búsqueda ni los filtros. |
| **Detalle de un centro** | En las dos vistas, el **código del centro es un enlace** a su página `/centros/<código>`: código (con copiar), descripción, cliente(s), estado(s), N° de órdenes y la tabla con **todas** sus órdenes. **Volver a la lista** regresa a la lista con los mismos filtros. Si el código no existe, lo dice claramente. |
| **Exportar a Excel** | Descarga lo que se está viendo (con filtros) en un `.xlsx` con fecha en el nombre, ej. `centros-de-negocio_2026-10-09_1432.xlsx`. Las fechas salen como fechas y los números como números (en Excel se pueden ordenar, filtrar y sumar); los códigos conservan sus ceros a la izquierda. Las columnas ocultas (moneda y monto) **no** se exportan. |
| **Copiar código** | Ícono pequeño al lado de cada código de centro. |
| **Enlace para compartir** | La vista va en la ruta y la búsqueda y los filtros en la dirección (ej. `…/centros?q=cableado&estado=Abierta`). Se copia el enlace y quien lo abra ve lo mismo. Los enlaces viejos (`…/?q=cableado&vista=centro`) siguen funcionando: llevan a `/centros?q=cableado`. |
| **Actualizar** | Botón **Actualizar** + actualización automática cada 10 minutos (configurable) **sin perder** la búsqueda ni los filtros. Muestra "Datos actualizados a las HH:MM" y la fecha en que se modificó el Excel. |
| **Celular y modo oscuro** | Se usa bien en un celular (la tabla tiene su propio desplazamiento lateral) y cambia a colores oscuros si el equipo está en modo oscuro. |
| **Accesible** | Todo se puede usar con teclado, con foco visible (un anillo suave que aparece al usar el teclado, no al hacer clic), etiquetas en cada campo y buen contraste. Con la tecla Tab aparece **"Saltar a la paginación"** antes de la tabla, para no recorrer todos sus botones. Al abrir el detalle de un centro (o "Página no encontrada") el foco va a su título, para que el lector de pantalla lo anuncie. |

### Rutas (direcciones de la app) — React Router

Desde el 14/10/2026 la app usa **React Router** (`react-router` v7), la librería de rutas más usada con React: cada pantalla tiene su propia dirección, así se pueden agregar pantallas nuevas sin enredar las que ya existen (pedido del supervisor, por escalabilidad).

| Ruta | Qué muestra |
|---|---|
| `/` | Lleva a `/ordenes`, conservando la búsqueda del enlace (ej. `/?q=cableado` → `/ordenes?q=cableado`). |
| `/ordenes` | La lista **"Por orden"** (una fila por cada fila del Excel). Es la vista por defecto. |
| `/centros` | La lista **"Por centro de negocio"** (una fila por centro, que se abre para ver sus órdenes). |
| `/centros/<código>` | **Detalle de un centro** (ej. `/centros/A2338PY01`): sus datos y todas sus órdenes, con "Volver a la lista". El código va codificado si trae espacios, `/`, `#`… y no importan mayúsculas ni tildes. |
| cualquier otra | **"Página no encontrada"**, con el botón "Ir al buscador". No descarga el Excel. |
| `/?vista=centro…` (enlace viejo) | Lleva a `/centros` con el resto de la búsqueda. |

- **La búsqueda va en la "query"** (lo que va después de `?`): `q` (buscador), `cliente`, `codigo`, `desc`, `oc`, `tipo`, `estado`, `ord`/`dir` (orden), `pag` (página) y `tam` (filas por página). Ej.: `/centros/A2338PY01?q=cableado&estado=Abierta`.
- **Todas las rutas piden iniciar sesión** (en modo `microsoft`): mientras no hay sesión se ve "Bienvenido" en cualquier dirección. Al volver de Microsoft, la persona regresa a la **misma** dirección (ruta + búsqueda).
- **Publicación:** como `/centros/A2338PY01` no es un archivo, el hosting debe responder `index.html` en esas direcciones: en Netlify lo hace `app/public/_redirects` (`/*    /index.html    200`; Netlify entrega primero los archivos que sí existen) y en Azure Static Web Apps, `navigationFallback` de `staticwebapp.config.json`. La app se publica en la **raíz** del dominio (`base: '/'` en `vite.config.ts`, antes `'./'`): con rutas anidadas, los archivos (`assets/…`, `config.json`, `favicon.svg`, `tema-inicial.js`, el Excel de ejemplo, `redirect.html`) se piden siempre desde `/`. Detalle en la guía, paso 6.

## 3. Cómo probarlo en modo demo (sin Microsoft)

El **modo demo** no pide inicio de sesión y lee un Excel de ejemplo con **datos ficticios** (`app/public/datos/centros-ejemplo.xlsx`: "Cliente Demo A", códigos `CN-0001`…). Sirve para probar y para mostrárselo al jefe.

`app/public/config.json` ya tiene los valores de **producción** (`"modo": "microsoft"`, Excel real). Para ver la demo **no hay que tocarlo**: el comando `dev:demo` le entrega a la app una copia de ese archivo cambiada a `"modo": "demo"` y `"fuente": "archivo-local"` (solo en tu PC; lo publicado no cambia).

Requisitos: **Node.js** (ya instalado: v24) — es el programa que ejecuta las herramientas de JavaScript en la computadora.

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
| `npm test` | Pruebas **unitarias** con Vitest (320): la lógica (búsqueda, filtros, lectura del Excel, Graph, reglas de acceso, rutas…) y los componentes de React (buscador, tabla, paginación, botón de tema, avisos, rutas y detalle de un centro…), sin abrir un navegador. También revisan que escribir en el buscador no vuelva a dibujar la tabla, que la app funcione dentro de `<StrictMode>` y que la pantalla de carga de `index.html` sea igual a la de React. |
| `npm run test:e2e` | Pruebas **de punta a punta** con Playwright (62): compila, abre la app en Chromium y hace clic como una persona (modo demo + un inicio de sesión de Microsoft **simulado**, sin internet), incluidas las rutas (`rutas.spec.ts`: enlace directo, recargar, atrás, 404) y las medidas del diseño (`diseno.spec.ts`: márgenes, contornos en claro y oscuro, íconos). Usan su propia configuración de demostración (`tests/e2e/config-pruebas.ts`), así que pasan igual aunque `config.json` ya tenga los valores de producción. **En una PC nueva**, antes de la primera vez: `npx.cmd playwright install chromium` (descarga el navegador de pruebas; `npm.cmd ci` no lo trae). |
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
    │   ├── estilos.css                ← colores y diseño (claro/oscuro, celular; márgenes, contornos e íconos: 14/10/2026)
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
    │   │   ├── Celdas.tsx, Resaltado.tsx                ← títulos que ordenan, celdas (el código = enlace al detalle) y
    │   │   │                                               resaltado <mark> (sin HTML del Excel)
    │   │   ├── Paginacion.tsx                           ← « ‹ Página X de Y › » (el foco no se pierde)
    │   │   ├── Avisos.tsx, ColumnasDetectadas.tsx       ← avisos rojo/amarillo, aviso flotante y "Columnas detectadas"
    │   │   └── Iconos.tsx                               ← íconos SVG (16–18 px, clase "icono")
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
    │       ├── tabla.ts, formato.ts   ← reglas de la tabla (▲▼, aria-sort, contador) y formato de horas/fechas
    │       ├── estado-url.ts          ← convierte la búsqueda en la query de la dirección (?q=…) y viceversa
    │       ├── rutas.ts               ← rutas (/ordenes, /centros…), enlaces viejos (?vista=centro), archivos desde "/"
    │       ├── centro.ts              ← detalle de un centro: buscarlo por su código y sus estados
    │       ├── exportar.ts            ← descarga a Excel
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
    │                                     despliegue.test.ts = _redirects, staticwebapp y base "/"
    ├── tests/e2e/                     ← pruebas en navegador (Playwright, .ts); config-pruebas.ts = su configuración fija;
    │                                     rutas.spec.ts = rutas; diseno.spec.ts = márgenes, contornos e íconos
    ├── tsconfig.json                  ← reglas de TypeScript para src/ (modo estricto + noUncheckedIndexedAccess)
    ├── tsconfig.node.json             ← reglas de TypeScript para pruebas, configuración y scripts .mjs (con JSDoc)
    ├── .oxlintrc.json                 ← reglas de npm run lint (hooks de React y errores seguros)
    ├── vite.config.ts                 ← compilación: React, base "/" (raíz del dominio), CSP, sin "~$…", modo demo
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
| **React Router v7, modo "declarativo"** (`<BrowserRouter>` + `<Routes>`) *(14/10/2026)* | Pedido del supervisor, por escalabilidad: cada pantalla es una ruta (tabla en la sección 2). Se eligió el modo declarativo y no el de "datos" (`createBrowserRouter` con *loaders*) porque el inicio de sesión debe terminar **antes** de que las rutas hagan algo: las rutas solo se muestran con la sesión iniciada (fase `app` de `useArranque`), así MSAL procesa la vuelta de Microsoft en la dirección exacta donde empezó. `useTransitions={false}` (en `Enrutador.tsx`): la dirección y la búsqueda cambian juntas. |
| **La búsqueda sigue en la query; la vista pasa a la ruta** | Lo que filtra (`?q=…&cliente=…&ord=…&pag=…`) queda en la dirección como antes (enlace para compartir). Cambiar un filtro **reemplaza** la dirección (no se llena el historial con cada tecla); cambiar de vista o abrir un centro **agrega** una entrada, así el botón atrás vuelve a la pantalla anterior con sus filtros. Si la dirección cambia por fuera (atrás/adelante), `useEstadoUrl` la vuelve a leer en el mismo dibujo (no en un efecto, para no escribir un estado viejo encima). `?vista=centro` (enlaces viejos) se sigue leyendo y lleva a `/centros`. |
| **Un "layout" para las rutas** (`PantallaApp` + `<Outlet />`) | El Excel, la búsqueda y los centros abiertos viven en `PantallaApp`, que no cambia al pasar de `/ordenes` a `/centros` o al detalle: el Excel se descarga **una vez** y los filtros se conservan. "Página no encontrada" va fuera del layout (no descarga el Excel). |
| **Al volver de Microsoft, a la misma ruta** | MSAL guarda la dirección completa (ruta + query) al pulsar "Iniciar sesión" y `redirect.html` lleva de vuelta a ella. `redirect.html` está siempre en la **raíz** (la registrada en Entra ID), aunque se inicie sesión desde `/centros/…`. |
| **Diseño más sobrio** *(14/10/2026, pedido del supervisor)* | Columna de contenido de máx. 1240 px con margen lateral `clamp(16px, 4vw, 56px)`; bordes de 1 px (`--borde-control`); foco = borde primario + anillo semitransparente de 3 px solo con `:focus-visible` (más un contorno transparente que Windows muestra en alto contraste); íconos SVG de 16–18 px con `display:block` + `flex-shrink:0` dentro de botones `inline-flex`; flecha propia en los desplegables (SVG `data:`, permitido por la CSP). Lo mide `tests/e2e/diseno.spec.ts`. |

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
| **Mismos ids, textos y `aria-*`** | Las 39 pruebas en navegador (Playwright) son el "contrato" de comportamiento: pasan **sin cambiar ningún selector** (solo se les agregaron tipos al pasarlas a `.ts`; después se sumaron 3 de la pantalla de carga). `estilos.css` no cambió en la migración (salvo un comentario; el 14/10/2026 sí cambió, por el pedido de diseño). Con React Router (14/10/2026) solo se ajustaron las direcciones esperadas (`?vista=centro` → `/centros`), sin quitar comprobaciones. Los avisos (`#aviso-flotante`, `#aviso-error`) vuelven a leerse en voz alta aunque el mensaje se repita, como antes. |
| **`redirect.html` sin React** | Es una página puente mínima: solo le pasa la respuesta de Microsoft a la app (`src/redirect.ts`). Así carga rápido y no depende de la app. |

**Sobre SheetJS:** la versión de npm (0.18.5) tiene 2 avisos de seguridad de nivel **alto** ("prototype pollution" y "ReDoS") que se activan con un Excel **hecho a propósito para atacar**. Por eso la app usa la **0.20.3**, instalada desde el sitio oficial:
- Para actualizarla en el futuro: `npm.cmd install --save-exact https://cdn.sheetjs.com/xlsx-<versión>/xlsx-<versión>.tgz` (ver la versión vigente en `https://cdn.sheetjs.com/xlsx-latest/package/package.json`) y correr las pruebas.
- Igual (buena práctica), **solo la cuenta del bot** debe tener permiso de edición sobre el Excel (guía, paso 4.2).

## 9. Qué falta / (por confirmar)

- [x] **Ubicación del Excel real**: `centros-negocio-aic.xlsx` en el SharePoint de jaicoscorp (sitio raíz); enlace en `datos.urlCompartida`. *(12/10/2026)*
- [ ] **Columnas exactas del Excel real**: revisar "Columnas detectadas en el Excel" en la primera prueba → ajustar `columnas` en `config.json` si hace falta (y confirmar que el estado y los montos se reconocen). *(por confirmar)*
- [ ] **`Files.Read.All` agregado en Entra ID**: confirmar que aparece (tipo *Delegado*) en Entra ID → Registros de aplicaciones → Buscador de centros de negocio → **Permisos de API**. Si no está, agregarlo: "Conceder consentimiento de administrador" solo aprueba lo que está en esa lista (guía, paso 2). *(por confirmar)*
- [ ] **Consentimiento de `Files.Read.All`**: ¿la empresa deja que cada usuario lo apruebe o lo tiene que aprobar un administrador? Si lo tiene que aprobar, hacerlo **antes** de subir `publicar/` a Netlify (guía, paso 2). *(por confirmar)*
- [ ] **¿Basta `Files.Read.All` para listar las bibliotecas del sitio?** La búsqueda de respaldo pide `GET /sites/jaicoscorp.sharepoint.com/drives`; la documentación de Microsoft no lo confirma para esa forma (guía, paso 2). Si a todas las personas les sale *"No se pudo ver las bibliotecas de documentos del sitio…"*, fijar `driveId` + `itemId` o agregar `Sites.Read.All`. *(por confirmar)*
- [ ] **El bot**: ¿escribe siempre en el **mismo archivo** (mismo nombre y lugar)? Si borra y vuelve a crear el archivo, el enlace cambia. *(por confirmar)*
- [x] **Registro de la app en Entra ID**: hecho (clientId `f8547d9b-…`, tenant JAICOS CORP S.A.C.). *(12/10/2026)*
- [x] **Jaicos**: dominio `jaicoscorp.com`, y está en el **mismo tenant** que AIC ("JAICOS CORP S.A.C."; las cuentas @aic.pe están dentro). No hace falta invitar a nadie. *(confirmado el 12/10/2026)*
- [x] **Hosting**: Netlify, https://aic-centros-negocio.netlify.app (se sube a mano la carpeta `publicar/`). *(12/10/2026)*
- [ ] **"Actualizarse"**: confirmar que significa "mostrar siempre lo último del Excel" y no "editar desde la app". *(por confirmar)*
- [ ] ¿Qué columnas son más importantes para el equipo (para el orden de la tabla y los filtros)? *(por confirmar)*
- [x] **SheetJS actualizada a 0.20.3** (13/10/2026). Pendiente recomendado: dejar el permiso de edición del Excel solo a la cuenta del bot.
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
