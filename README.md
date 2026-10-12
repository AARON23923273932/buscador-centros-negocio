# 🌐 Sitio web — Buscador de centros de negocio

> Proyecto "Sitio web" en Notion (código PRY-2, id `3f2738bc3a6381408614e380da98edac`). Notion es la agenda; aquí está el trabajo.
> La app está en [`app/`](app/). La guía para conectarla a Microsoft 365 está en [`GUIA-CONFIGURACION-MICROSOFT.md`](GUIA-CONFIGURACION-MICROSOFT.md). Las pruebas manuales para entregarla están en [`pruebas/plan-de-pruebas.md`](pruebas/plan-de-pruebas.md).

## Estado actual (12/10/2026)
- **Publicada en Netlify:** https://aic-centros-negocio.netlify.app (en línea siempre, no depende de la PC).
- **Login con Microsoft activo:** app "Buscador de centros de negocio" registrada en Entra ID (tenant JAICOS CORP S.A.C.). Solo entran cuentas `@aic.pe` y `@jaicoscorp.com`. Permisos (solo lectura): al **iniciar sesión** solo se pide `User.Read`; `Files.Read.All` se pide **al leer el Excel**.
- **Datos: conectada al Excel real** `centros-negocio-aic.xlsx` (SharePoint de jaicoscorp, sitio raíz) por su enlace (`"fuente": "graph"`, `datos.urlCompartida` en `config.json`). El enlace es la **dirección del navegador** de Excel Online (`…/_layouts/15/Doc.aspx?sourcedoc=…&file=…`): si Microsoft Graph no lo abre como "enlace para compartir", la app **busca el archivo** en las bibliotecas de ese sitio por su identificador y su nombre (detalle en la guía, paso 4.3).
  - ⚠️ **Orden para publicar esta versión** *(por confirmar si la empresa exige la aprobación)*: **1)** en Entra ID → la app → **Permisos de API**, confirmar que `Files.Read.All` (delegado) esté en la lista (si no, agregarlo) y que un administrador pulse **"Conceder consentimiento de administrador"** (guía, paso 2); **2)** recién después, subir `publicar/` a Netlify. Si se sube antes y la empresa no deja que cada persona apruebe ese permiso, la gente **sí puede iniciar sesión**, pero **el Excel no carga**: Microsoft muestra *"Se necesita aprobación del administrador"* y la app *"Tu organización exige que un administrador apruebe el permiso de lectura de archivos (Files.Read.All)…"*.
  - **Primera prueba con el Excel real:** iniciar sesión con una cuenta normal (no administradora). Las columnas reales se revisan en **"Columnas detectadas en el Excel"** (al final de la página), que también muestra el `driveId` e `itemId` encontrados.
- **No se muestran la moneda ni el monto:** las columnas cuyo título tenga "moneda" o "monto" (ej. *Monto*, *Monto total*, *Moneda*) no se ven, no se buscan y no se exportan (`columnasOcultas` en `config.json`).
- **Filtro "Estado"** (desplegable, igual que Cliente y Tipo de orden): aparece si el Excel tiene una columna de estado con valores (*Estado*, *Estado de la orden*, *Situación*, *Status*…).
- ⚠️ **Se publica todavía con SheetJS 0.18.5 (riesgo asumido, pendiente):** la actualización a 0.20.x que pide la sección 7 **no está hecha** (hay que descargarla de `cdn.sheetjs.com`, con tu permiso). Mientras tanto, **solo la cuenta del bot** debe poder editar el Excel real (guía, paso 4.2).
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
| **Vista "Por centro de negocio"** | Una fila por centro (código, descripción, clientes, N° de órdenes) que se abre para ver sus órdenes. Se cambia con el interruptor **Por orden / Por centro de negocio**. |
| **Exportar a Excel** | Descarga lo que se está viendo (con filtros) en un `.xlsx` con fecha en el nombre, ej. `centros-de-negocio_2026-10-09_1432.xlsx`. Las fechas salen como fechas y los números como números (en Excel se pueden ordenar, filtrar y sumar); los códigos conservan sus ceros a la izquierda. Las columnas ocultas (moneda y monto) **no** se exportan. |
| **Copiar código** | Ícono pequeño al lado de cada código de centro. |
| **Enlace para compartir** | La búsqueda y los filtros quedan en la dirección (ej. `…/?q=cableado&estado=Abierta&vista=centro`). Se copia el enlace y quien lo abra ve lo mismo. |
| **Actualizar** | Botón **Actualizar** + actualización automática cada 10 minutos (configurable) **sin perder** la búsqueda ni los filtros. Muestra "Datos actualizados a las HH:MM" y la fecha en que se modificó el Excel. |
| **Celular y modo oscuro** | Se usa bien en un celular (la tabla tiene su propio desplazamiento lateral) y cambia a colores oscuros si el equipo está en modo oscuro. |
| **Accesible** | Todo se puede usar con teclado, con foco visible, etiquetas en cada campo y buen contraste. Con la tecla Tab aparece **"Saltar a la paginación"** antes de la tabla, para no recorrer todos sus botones. |

## 3. Cómo probarlo en modo demo (sin Microsoft)

El **modo demo** no pide inicio de sesión y lee un Excel de ejemplo con **datos ficticios** (`app/public/datos/centros-ejemplo.xlsx`: "Cliente Demo A", códigos `CN-0001`…). Sirve para probar y para mostrárselo al jefe.

`app/public/config.json` ya tiene los valores de **producción** (`"modo": "microsoft"`, Excel real). Para ver la demo **no hay que tocarlo**: el comando `dev:demo` le entrega a la app una copia de ese archivo cambiada a `"modo": "demo"` y `"fuente": "archivo-local"` (solo en tu PC; lo publicado no cambia).

Requisitos: **Node.js** (ya instalado: v24) — es el programa que ejecuta las herramientas de JavaScript en la computadora.

```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npm install          # solo la primera vez: descarga las librerías (carpeta node_modules)
npm run dev:demo     # demo (sin login, Excel de ejemplo) → http://localhost:5173
```

`npm run dev` (sin `:demo`) usa la configuración real: pide **Iniciar sesión con Microsoft** y lee el **Excel real** (sirve para probar el login en la PC; la dirección `http://localhost:5173/redirect.html` está registrada en Entra ID, guía paso 1).

> **Si PowerShell dice** *"No se puede cargar el archivo …\npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema"*: es una configuración de seguridad de Windows (normal en PC de empresa). Escribe **`npm.cmd`** en vez de `npm` (ej. `npm.cmd run dev`) o usa el **Símbolo del sistema** (`cmd`). Otra opción es ejecutar una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, pero **solo con permiso de quien administra el equipo**.
>
> **Puertos:** `npm run dev` usa siempre el 5173 y `npm run preview` el 4173 (son los registrados en Microsoft). Si están ocupados, la app **no arranca** y lo avisa: cierra el otro programa (por ejemplo, otro `npm run dev` abierto).

Otros comandos (siempre dentro de `app/`):

| Comando | Para qué sirve |
|---|---|
| `npm run dev:demo` | La app en **modo demo** (sin login, Excel de ejemplo) en http://localhost:5173, sin tocar `config.json`. |
| `npm run build` | "Compila" la app: crea la carpeta `dist/`. |
| `npm run preparar-publicacion` | Compila y deja la copia **lista para Netlify** en `publicar/` (sin archivos temporales de Office `~$…`). |
| `npm run preview` | Muestra la versión compilada (`dist/`) en http://localhost:4173 con la configuración real. |
| `npm run preview:demo` | Lo mismo, pero en modo demo. |
| `npm test` | Pruebas **unitarias** (revisan la lógica: búsqueda, filtros, lectura del Excel, reglas de acceso…). |
| `npm run test:e2e` | Pruebas **de punta a punta**: compila, abre la app en Chromium y hace clic como una persona (modo demo + un inicio de sesión de Microsoft **simulado**, sin internet). Usan su propia configuración de demostración (`tests/e2e/config-pruebas.js`), así que pasan igual aunque `config.json` ya tenga los valores de producción. **En una PC nueva**, antes de la primera vez: `npx playwright install chromium` (descarga el navegador de pruebas; `npm install` no lo trae). |
| `npm run generar-ejemplo` | Vuelve a crear el Excel de ejemplo con datos ficticios. |

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

## 5. Quién puede entrar (resumen)

- Botón **Iniciar sesión con Microsoft** (se usa la librería **MSAL** de Microsoft).
- Después del inicio de sesión la app revisa que el **nombre de inicio de sesión** (UPN, normalmente igual al correo) termine en `@aic.pe` o `@jaicoscorp.com` (y, si se configura, que la cuenta sea del tenant de la empresa). Si no: "Tu cuenta no tiene acceso" + cerrar sesión. *(por confirmar con el administrador que el UPN del personal termina en esos dominios)*
- **Importante:** esa revisión ocurre en el navegador, así que es solo una capa de comodidad. La **seguridad real** está en Microsoft 365: (1) la app registrada en Entra ID solo para la empresa, (2) opcionalmente "asignación de usuario requerida", y (3) **los permisos del propio Excel en SharePoint**: la app lee el archivo *con la cuenta de la persona*, así que si a alguien no le compartieron el Excel, no puede verlo aunque entre a la app. Detalle en la guía.

## 6. Estructura de carpetas

```
sitio-web/
├── README.md                          ← este archivo
├── GUIA-CONFIGURACION-MICROSOFT.md    ← paso a paso para el administrador de Microsoft 365 y la publicación
├── datos/                             ← archivos recibidos para el proyecto (vacía por ahora)
├── pruebas/plan-de-pruebas.md         ← pruebas que hace una persona antes de entregar (con casillas)
├── publicar/                          ← copia lista para Netlify (la crea npm run preparar-publicacion; no se edita)
└── app/                               ← la aplicación
    ├── index.html                     ← la página (estructura)
    ├── redirect.html                  ← página "puente" a la que vuelve Microsoft tras el inicio de sesión
    ├── public/
    │   ├── config.json                ← CONFIGURACIÓN (la única copia que se edita; npm run build la copia a dist/)
    │   ├── datos/centros-ejemplo.xlsx ← Excel de ejemplo con datos ficticios (modo demo)
    │   ├── netlify.toml / _headers    ← Netlify: publicar la carpeta tal cual y no guardar config.json en caché
    │   ├── staticwebapp.config.json   ← cabeceras de seguridad para Azure Static Web Apps (otra opción de hosting)
    │   └── favicon.svg                ← ícono de la pestaña
    ├── src/
    │   ├── main.js                    ← arranque y "pegamento" (estado, eventos, auto-actualización)
    │   ├── config.js                  ← lee config.json y revisa que esté completo
    │   ├── auth.js                    ← inicio de sesión con Microsoft (MSAL)
    │   ├── acceso.js                  ← reglas de quién puede entrar (dominios, tenant)
    │   ├── graph.js                   ← lee el Excel desde SharePoint/OneDrive (Microsoft Graph)
    │   ├── datos.js                   ← abre el Excel y limpia/ordena las filas (SheetJS)
    │   ├── filtros.js                 ← buscar, filtrar, ordenar, agrupar, paginar (funciones puras)
    │   ├── tabla.js                   ← arma el HTML de la tabla (siempre escapando los datos)
    │   ├── estado-url.js              ← guarda la búsqueda en la dirección (enlace para compartir)
    │   ├── exportar.js                ← descarga a Excel
    │   ├── redirect.js                ← lógica de redirect.html
    │   └── estilos.css                ← colores y diseño (claro/oscuro, celular)
    ├── scripts/
    │   ├── generar-ejemplo.mjs        ← crea el Excel de ejemplo
    │   ├── preparar-publicacion.mjs   ← compila y copia a publicar/ (npm run preparar-publicacion)
    │   ├── archivos-temporales.mjs    ← deja afuera los "~$…" que crea Excel (llevan tu nombre de usuario)
    │   └── config-demo.mjs            ← modo demo en la PC sin tocar config.json (npm run dev:demo)
    ├── tests/unit/                    ← pruebas unitarias (Vitest); graph-resolver.test.js = cómo se encuentra el Excel real
    ├── tests/e2e/                     ← pruebas en navegador (Playwright); config-pruebas.js = su configuración fija
    ├── vite.config.js                 ← configuración de compilación (+ política de seguridad CSP)
    ├── vitest.config.js / playwright.config.js
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

## 7. Decisiones tomadas (y por qué)

| Decisión | Por qué |
|---|---|
| **JavaScript sencillo (sin framework) + Vite** | Para que un principiante pueda leer y mantener el código. Vite solo sirve para probar en local y "compilar". |
| **La app no tiene servidor propio** (es una "página estática") | Más barata y simple de publicar (hoy en el plan gratuito de Netlify). El inicio de sesión lo hace Microsoft y los datos los da Microsoft Graph. |
| **Leer el Excel en vivo** en vez de copiar los datos | Así siempre se ve lo último que dejó el bot, sin otro proceso que sincronice. |
| **Permisos delegados `User.Read` + `Files.Read.All`** | Solo lectura y siempre limitado a lo que el usuario ya puede ver. Al iniciar sesión solo se pide `User.Read`: si falta que un administrador apruebe `Files.Read.All`, la persona igual entra y la app le explica qué pedir. Detalle en la guía. |
| **`redirect.html` como página de retorno** | Es lo que recomienda MSAL versión 5 (la instalada): una página "puente" mínima para el retorno del inicio de sesión. |
| **SheetJS (`xlsx` 0.18.5)** para leer y exportar Excel | Es la versión publicada en npm. Tiene 2 avisos de seguridad conocidos al abrir archivos **maliciosos** (ver abajo). |
| **Política de seguridad (CSP)** al compilar | Si una celda del Excel trajera código, el navegador no lo ejecuta. Además, todo dato del Excel se "escapa" antes de mostrarse (hay pruebas que lo verifican). |
| **Sesión guardada en el navegador (`localStorage`)** | Para no pedir inicio de sesión en cada pestaña. Se puede cambiar a `sessionStorage` en `config.json` si se prefiere que se cierre al cerrar la pestaña. |

**Sobre el aviso de seguridad de `xlsx` 0.18.5:** `npm audit` reporta 2 problemas de nivel **alto** ("prototype pollution" y "ReDoS") que se activan con un Excel **hecho a propósito para atacar**. El Excel lo genera el bot, pero la app lo abre en el navegador de cada usuario: **cualquier cuenta con permiso de edición** sobre ese archivo en SharePoint podría reemplazarlo por uno "trampa". Por eso:
- **Antes de publicar en producción es obligatorio** actualizar a SheetJS 0.20.x. Esa versión no está en npm: se instala desde el sitio oficial (`https://cdn.sheetjs.com/`).
- Mientras tanto (y siempre), **solo la cuenta del bot** debe tener permiso de edición sobre el Excel (guía, paso 4.2).

## 8. Qué falta / (por confirmar)

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
- [ ] **Obligatorio antes de producción:** actualizar SheetJS a 0.20.x (desde `https://cdn.sheetjs.com/`) y dejar el permiso de edición del Excel solo a la cuenta del bot. *(Hoy se publica con 0.18.5 asumiendo el riesgo: ver "Estado actual".)*
- [ ] **Formato del Excel real**: ¿el código/descripción del centro va en **cada fila**, en **celdas combinadas** o **una sola vez** (con las filas de abajo vacías)? ¿El bot escribe valores o fórmulas? Revisar "Columnas detectadas" y la vista "Por centro". *(por confirmar)*
- [ ] **Nombre de inicio de sesión (UPN)**: ¿termina en `@aic.pe` / `@jaicoscorp.com` para todo el personal? Lo confirma el administrador de Microsoft 365. *(por confirmar)*
- [ ] **Permiso para leer el Excel**: probar con una cuenta normal; si a todos les sale "sin permiso" o "No se encontró el Excel", sacar el `driveId` + `itemId` con el **Probador de Graph** (guía 4.3, forma A) y copiarlos en `config.json`. ("Columnas detectadas en el Excel" muestra esos dos valores solo cuando el Excel **sí** cargó: sirve para fijarlos de antemano, no cuando falla.) *(por confirmar)*

## 9. Para pasar de demo a producción (resumen)

1. ✅ El administrador registra la app en Entra ID (guía, pasos 1 y 3).
2. **Permiso `Files.Read.All`** (guía, paso 2): confirmar que está en **Permisos de API** y, si la empresa lo exige, que un administrador dio el **consentimiento**. Hacerlo **antes** del paso 6. *(por confirmar)*
3. Se da permiso de lectura al personal sobre el Excel (guía, paso 4.2).
4. ✅ En `app/public/config.json` (la única copia que se edita; **no** `dist/config.json` ni `publicar/config.json`): `"modo": "microsoft"`, `clientId`, `tenantId`, `"fuente": "graph"`, `urlCompartida` y `scopes` con `Files.Read.All` (guía, paso 5).
5. Actualizar SheetJS a 0.20.x (ver sección 7). *Pendiente: hoy se publica con 0.18.5.*
6. Con el Excel de ejemplo cerrado: `npm.cmd run preparar-publicacion` → Netlify → **Deploys** → arrastrar la carpeta `publicar/` (guía, paso 6).
