# ✅ Plan de pruebas — Buscador de centros de negocio

> Pruebas que hace **una persona** (tú), en orden. Las pruebas automáticas (334 unitarias de lógica y componentes + 68 en navegador, al 14/10/2026, ya con **React Router** y los cambios de diseño de Gustavo) pasan; estas comprueban lo que solo se puede ver con **tu cuenta, el Excel real y tus ojos**.
> Marca `[x]` lo que pase. Si algo falla, anota qué viste (o toma captura) y me lo pasas.

**Cómo abrir la app en tu PC:**
```
cd C:\dev\AIC\automatizaciones\sitio-web\app
npm.cmd ci               # la primera vez y cada vez que cambie package-lock.json (instala las librerías)
npm.cmd run dev:demo     # Etapas 1 y 2: modo demo (sin login, Excel de ejemplo)
npm.cmd run dev          # Etapa 4: configuración real (login con Microsoft + Excel real)
```
Luego abrir http://localhost:5173. (Usar `npm.cmd` en vez de `npm` si PowerShell bloquea scripts.) `config.json` ya tiene los valores de producción: **no hace falta cambiarlo** para ver la demo, `dev:demo` lo hace solo en tu PC.

---

## Etapa 1 — Revisar la demo como usuario (15 min, no necesitas nada)

Objetivo: confirmar que **hace lo que pidieron** y que es fácil de usar.

- [ ] 1.1 Buscar un código escribiéndolo "mal": `cn5`, `cn0005`, `CN-0005` → aparece el mismo centro.
- [ ] 1.2 Buscar una palabra **sin tilde** (`camaras`) → encuentra "Cámaras" y la resalta.
- [ ] 1.3 Buscar **dos palabras** (ej. `demo red`) → solo filas que tienen las dos.
- [ ] 1.4 Filtrar por **Cliente**, luego por **Orden de compra** → el contador "Mostrando X de Y" baja y todas las filas cumplen.
- [ ] 1.5 **Limpiar filtros** → vuelven las 80 filas.
- [ ] 1.6 Clic en el título **Código** (y otra vez) → ordena de menor a mayor y al revés.
- [ ] 1.7 Cambiar a **"Por centro de negocio"** → abrir un centro → ves todas sus órdenes.
- [ ] 1.8 **Exportar a Excel** con un filtro puesto → el archivo tiene solo esas filas.
- [ ] 1.9 Copiar la dirección de la página con un filtro puesto (ej. `…/centros?q=cableado&estado=Abierta`), pegarla en otra pestaña → sale el mismo filtro y la misma vista.
- [ ] 1.10 Achicar la ventana a tamaño celular (o F12 → ícono de celular) → se puede usar.
- [ ] 1.11 Filtro **Estado**: es una lista para elegir (no se escribe) con los valores del Excel (*Abierta*, *Cerrada*, *En ejecución*…). Elegir uno → todas las filas tienen ese estado; queda en la dirección (`?estado=…`) y **Limpiar filtros** lo quita. **Tipo de orden** también es una lista para elegir.
- [ ] 1.12 Las columnas **Monto** y **Moneda** **no** aparecen: ni en la tabla, ni al abrir un centro en "Por centro de negocio", ni en el detalle `/centros/<código>`, ni en el Excel exportado. Buscar `USD` no encuentra nada.
- [ ] 1.13 Al final, **"Columnas detectadas en el Excel"** dice "Columnas ocultas: Monto (…), Moneda (…)".
- [ ] 1.14 **Tu opinión:** ¿falta alguna columna, filtro o algo que el jefe pidió? ¿algún texto confuso?
- [ ] 1.15 **Versión React + TypeScript (13/10/2026):** todo lo de 1.1–1.13 se ve y funciona **igual que antes** (mismos textos, colores, botón ☀️/🌙, teclado: `/`, Tab, "Saltar a la paginación").
  **Cómo ver la versión anterior (JavaScript) al lado de la nueva**, las dos en modo demo:
  ```
  cd C:/dev/AIC/automatizaciones/sitio-web
  git worktree add --detach ../sitio-web-anterior ee86217   # copia aparte de la última versión JavaScript (no toca esta carpeta)
  cd ../sitio-web-anterior/app
  npm.cmd ci                                 # sus librerías (las de antes)
  npx.cmd vite --mode demo --port 5174       # versión ANTERIOR → http://localhost:5174
  ```
  En otra terminal, la versión nueva: `npm.cmd run dev:demo` en `sitio-web/app` → http://localhost:5173. Comparar las dos pestañas. Al terminar: **Ctrl + C** en las dos terminales y, desde `sitio-web`, `git worktree remove ../sitio-web-anterior`. (Otra opción: comparar con https://aic-centros-negocio.netlify.app **antes** de volver a publicar; esa tiene login y el Excel real.)
  - [ ] 1.15.1 **Pantalla de carga:** recargar con **red lenta** (F12 → pestaña **Red** / *Network* → cambiar "Sin limitación" por **3G lento** / *Slow 3G*) → la cabecera, el título y el botón ☀️/🌙 se ven **desde el primer momento** (antes de "Cargando…" no hay una pantalla sin cabecera) y la tarjeta "Cargando…" no salta hacia abajo al terminar de cargar. Volver a poner "Sin limitación" al terminar.
- [ ] 1.16 **Rutas con React Router (14/10/2026, pedido de Gustavo):** cada pantalla tiene su dirección.
  - [ ] 1.16.1 Abrir `http://localhost:5173/?q=cableado` → la dirección pasa a **`/ordenes?q=cableado`** y la búsqueda se mantiene.
  - [ ] 1.16.2 **Por orden / Por centro de negocio** → la dirección cambia entre **`/ordenes`** y **`/centros`** sin perder la búsqueda ni los filtros. El botón **atrás** del navegador vuelve a la vista anterior con sus filtros (y su orden de columnas).
  - [ ] 1.16.3 Clic en un **código de centro** (está subrayado) → **`/centros/<código>`**: se ven el código, la descripción, el/los cliente(s), el/los estado(s), el N° de órdenes y la tabla con **todas** sus órdenes. **Volver a la lista** regresa a la lista con los mismos filtros. El ícono de **copiar** al lado del código sigue copiando (y no abre el detalle). En el detalle **no** aparecen Monto ni Moneda.
    - Con el **teclado**: llegar al código con **Tab**, **Enter**, después **Shift+Tab** hasta "Volver a la lista" y **Enter** → en la lista, el foco (contorno azul) queda **en el mismo código** que se abrió. También si antes se usa el enlace "Saltar al contenido" (Tab al inicio de la página): "Volver" sigue regresando a la lista de origen.
  - [ ] 1.16.4 En el detalle, **recargar (F5)** → sigue el mismo centro. Escribir en la dirección un código que no existe (`/centros/NO-EXISTE`) → mensaje claro "No se encontró el centro de negocio…".
  - [ ] 1.16.5 Una dirección que no es de la app (`http://localhost:5173/hola`) → **"Página no encontrada"** con el botón **Ir al buscador**.
  - [ ] 1.16.6 Un enlace **viejo** `http://localhost:5173/?vista=centro&q=cableado` → lleva a **`/centros?q=cableado`**.
- [ ] 1.17 **Diseño (14/10/2026, pedido de Gustavo):**
  - [ ] 1.17.1 **Más margen a los lados:** en una pantalla grande el contenido (avisos, buscador, filtros, tabla, pie) va en una columna centrada con espacio a los lados, alineada con la cabecera; en el celular queda un margen de 16 px y la página no se mueve de costado (la tabla sí tiene su propio desplazamiento).
  - [ ] 1.17.2 **Contornos menos agresivos:** cajas, desplegables, botones y la tabla tienen bordes finos y suaves. Al hacer **clic** con el mouse en un botón **no** aparece contorno (en una caja de texto o un desplegable solo se pone azul el borde); al moverse con **Tab** aparece un **anillo azul suave** que se ve bien en claro y en oscuro, también en el botón **copiar** de cada fila y si el mouse queda encima del control. En la pantalla "Bienvenido" (login) el botón no aparece remarcado al abrir la página.
  - [ ] 1.17.3 **Íconos alineados** con su texto (acercar con **Ctrl + rueda** para revisar): lupa y "×" del buscador, flechas de los desplegables, copiar junto al código, ▲▼ de los títulos, flecha de "Por centro", Actualizar, Exportar, Filtros (celular), ☀️/🌙, flechas de la paginación y el logo de Microsoft del botón de login.

---

## Etapa 2 — Probar con el Excel REAL, sin login (20 min)

Objetivo: comprobar que la app **entiende el Excel que llena el bot** (columnas, centros con varias órdenes).

Necesitas: **una copia** del Excel real (en SharePoint/Teams: "…" → **Descargar**).

- [ ] 2.1 Guardar la copia en `C:\dev\AIC\automatizaciones\sitio-web\datos\` y avisarme. **No la modifiques.**
- [ ] 2.2 Anotar **dónde está** el original (sitio de SharePoint / canal de Teams / OneDrive de quién / carpeta de red).
- *(Yo hago: la conecto a la app solo en tu PC, ajusto los nombres de columnas y reviso centros/órdenes.)*
- [ ] 2.3 Abrir la app → al final, **"Columnas detectadas en el Excel"**: código, descripción, cliente y orden apuntan a la columna correcta.
- [ ] 2.4 Elegir **3 centros que conozcas** y comparar con el Excel: mismo código, descripción, cliente y **misma cantidad de órdenes**.
- [ ] 2.5 Buscar 2 órdenes de compra reales → las encuentra.
- [ ] 2.6 El total "de N en total" coincide con las filas con datos del Excel.

> ⚠️ Esta copia es **solo para probar en tu PC**. Nunca se publica la app con el Excel dentro (cualquiera podría descargarlo). En producción la app lee el original desde SharePoint con login.

---

## Etapa 3 — ¿Puedes registrar la app tú mismo? (10 min)

Objetivo: saber si el login real lo puedes probar tú o necesitas al administrador de Microsoft 365.

- [ ] 3.1 Entrar a https://entra.microsoft.com con tu cuenta **@aic.pe**.
- [ ] 3.2 Ir a **Entra ID → Registros de aplicaciones → + Nuevo registro** (en inglés *App registrations → New registration*).
  - Si **te deja**: seguir la [guía, paso 1](../GUIA-CONFIGURACION-MICROSOFT.md#paso-1-registrar-la-app-en-entra-id) (nombre `Buscador de centros de negocio`, **inquilino único**, plataforma **SPA**, dirección `http://localhost:5173/redirect.html`) y el **paso 2** (permisos `User.Read` y `Files.Read.All`).
  - Si sale **"no tienes acceso"** o el botón está gris: anótalo; esta parte la tendrá que hacer el administrador.
- [ ] 3.3 Pasarme el **Id. de aplicación (cliente)** y el **Id. de directorio (inquilino)** (no son secretos).

> Nota: registrar una app crea un registro visible en el directorio de la empresa (los administradores lo ven). Es algo normal si la empresa lo permite; no da acceso a nada que tu cuenta no tenga ya.

---

## Etapa 4 — Login real y Excel real en tu PC (30 min)

Necesitas: etapa 3 hecha + que **tu cuenta pueda abrir** el Excel original en SharePoint.

- [x] 4.1 Enlace del Excel original: ya está en `config.json` (la **dirección del navegador** de Excel Online, `…/Doc.aspx?sourcedoc=…&file=centros-negocio-aic.xlsx`, guía 4.3 forma C). *(12/10/2026)*
- [ ] 4.2 Abrir la app → **Iniciar sesión con Microsoft** con tu cuenta @aic.pe (**normal**, no administradora) → arriba aparece tu nombre y la tabla carga.
  - Al entrar solo se pide el permiso básico; el de **leer archivos** (`Files.Read.All`) se pide al cargar el Excel. Si pide **aceptar permisos**: acéptalo (es solo lectura).
  - Si sale *"Tu organización exige que un administrador apruebe el permiso de lectura de archivos (Files.Read.All)…"* o *"No se aprobaron los permisos de la app…"*: anótalo (con el código `AADSTS…` del final). Lo tiene que aprobar un administrador (guía, paso 2).
  - Si sale "Tu cuenta no tiene permiso para abrir el Excel" o *"No se pudo ver las bibliotecas de documentos del sitio…"* pero **sí** puedes abrirlo en SharePoint → avísame (cambiamos al método `driveId` + `itemId`, [guía 4.3 A](../GUIA-CONFIGURACION-MICROSOFT.md#43-identificar-el-excel-en-configjson)).
  - Al final, **"Columnas detectadas en el Excel"**: anota el `driveId` y el `itemId` que muestra (sirven para fijarlos en `config.json`) y revisa qué columnas dice que ocultó (deben ser solo las de moneda y monto).
  - El filtro **Estado** muestra los estados reales del Excel (si no aparece, el Excel real no tiene esa columna o se llama distinto: avísame el nombre).
- [ ] 4.3 "Excel modificado el …" coincide con la fecha que muestra SharePoint.
- [ ] 4.4 Repetir 2.3–2.5 con los datos en vivo.
- [ ] 4.5 **Cerrar sesión** → vuelve a la pantalla de inicio.
- [ ] 4.6 Entrar con una cuenta **personal** (@gmail/@outlook/@hotmail) → **no** entra (error de Microsoft o "Tu cuenta no tiene acceso").
- [ ] 4.7 **Actualización:** hacer una copia del Excel en **tu** OneDrive, apuntar la app a esa copia (me pasas su enlace), agregarle una fila → pulsar **Actualizar** → aparece la fila. *(Así no se toca el Excel del bot.)*
- [ ] 4.8 (Si hay el caso) Esperar a que el bot cree un centro nuevo → aparece al pulsar Actualizar.
- [ ] 4.9 **Iniciar sesión desde una ruta** (14/10/2026): con la sesión cerrada, abrir `http://localhost:5173/centros/<un código real>?q=<algo>` → pide iniciar sesión → al volver de Microsoft queda en **esa misma dirección** (el detalle de ese centro, con la búsqueda en la dirección).

---

## Etapa 5 — Otras personas (cuando se pueda)

- [ ] 5.1 Un **compañero de AIC** con acceso al Excel entra desde su PC (requiere la app publicada, etapa 6, o probar en tu PC con su cuenta).
- [ ] 5.2 Una persona de AIC **sin** acceso al Excel → ve "Tu cuenta no tiene permiso para abrir el Excel".
- [ ] 5.3 Una cuenta **@jaicoscorp.com** entra (mismo tenant que AIC, confirmado el 12/10/2026).
- [ ] 5.4 Se prueba desde un **celular**.

---

## Etapa 6 — Antes de entregar (lo hago yo + decisión de dónde publicar)

- [x] 6.1 Actualizar SheetJS a 0.20.x (aviso de seguridad) — hecho: 0.20.3 desde cdn.sheetjs.com (13/10/2026).
- [x] 6.2 Correr de nuevo todas las revisiones automáticas — **yo**: `npm.cmd run typecheck` (tipos de TypeScript), `npm.cmd test` (unitarias), `npm.cmd run test:e2e` (en navegador) y `npm.cmd run build` (compilación). Hecho con la versión React + TypeScript: sin errores de tipos, 268 unitarias y 39 en navegador pasan, `build` y `preparar-publicacion` OK. *(13/10/2026)*
- [x] 6.3 Publicada en internet con HTTPS en **Netlify**: https://aic-centros-negocio.netlify.app (se sube a mano: `npm.cmd run preparar-publicacion` y arrastrar `publicar/`, [guía, paso 6](../GUIA-CONFIGURACION-MICROSOFT.md#paso-6-publicar-la-app-hosting)). *(12/10/2026)*
- [ ] 6.4 Antes de subir la versión con el Excel real: que el administrador haya hecho el **paso 2** de la guía (`Files.Read.All` en la lista + consentimiento). Después, cerrar el Excel de ejemplo, `npm.cmd run preparar-publicacion`, subir `publicar/` y repetir 4.2–4.6 en https://aic-centros-negocio.netlify.app.
- [ ] 6.5 **Versión con rutas (React Router):** `publicar/` tiene el archivo **`_redirects`** (el script se detiene si falta). Ya publicada, abrir directamente `https://aic-centros-negocio.netlify.app/centros/<un código real>` y **recargar (F5)** → se ve el detalle, no *"Page not found"* de Netlify. Repetir 1.16 y 4.9 en la dirección publicada ([guía, paso 6 → "Rutas de la app y `_redirects`"](../GUIA-CONFIGURACION-MICROSOFT.md#rutas-de-la-app-y-_redirects-14102026-react-router)).

---

## Resultados

| Etapa | Fecha | Resultado | Notas |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
