# ✅ Plan de pruebas — Buscador de centros de negocio

> Pruebas que hace **una persona** (tú), en orden. Las pruebas automáticas (268 unitarias de lógica y componentes + 39 en navegador, al 13/10/2026, ya con la versión **React + TypeScript**) pasan; estas comprueban lo que solo se puede ver con **tu cuenta, el Excel real y tus ojos**.
> Marca `[x]` lo que pase. Si algo falla, anota qué viste (o toma captura) y me lo pasas.

**Cómo abrir la app en tu PC:**
```
cd C:\dev\AIC\automatizaciones\sitio-web\app
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
- [ ] 1.9 Copiar la dirección de la página con un filtro puesto, pegarla en otra pestaña → sale el mismo filtro.
- [ ] 1.10 Achicar la ventana a tamaño celular (o F12 → ícono de celular) → se puede usar.
- [ ] 1.11 Filtro **Estado**: es una lista para elegir (no se escribe) con los valores del Excel (*Abierta*, *Cerrada*, *En ejecución*…). Elegir uno → todas las filas tienen ese estado; queda en la dirección (`?estado=…`) y **Limpiar filtros** lo quita. **Tipo de orden** también es una lista para elegir.
- [ ] 1.12 Las columnas **Monto** y **Moneda** **no** aparecen: ni en la tabla, ni al abrir un centro en "Por centro de negocio", ni en el Excel exportado. Buscar `USD` no encuentra nada.
- [ ] 1.13 Al final, **"Columnas detectadas en el Excel"** dice "Columnas ocultas: Monto (…), Moneda (…)".
- [ ] 1.14 **Tu opinión:** ¿falta alguna columna, filtro o algo que el jefe pidió? ¿algún texto confuso?
- [ ] 1.15 **Versión React + TypeScript (13/10/2026):** todo lo de 1.1–1.13 se ve y funciona **igual que antes** (mismos textos, colores, botón ☀️/🌙, teclado: `/`, Tab, "Saltar a la paginación").

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

---

## Etapa 5 — Otras personas (cuando se pueda)

- [ ] 5.1 Un **compañero de AIC** con acceso al Excel entra desde su PC (requiere la app publicada, etapa 6, o probar en tu PC con su cuenta).
- [ ] 5.2 Una persona de AIC **sin** acceso al Excel → ve "Tu cuenta no tiene permiso para abrir el Excel".
- [ ] 5.3 Una cuenta **@jaicoscorp.com** entra (mismo tenant que AIC, confirmado el 12/10/2026).
- [ ] 5.4 Se prueba desde un **celular**.

---

## Etapa 6 — Antes de entregar (lo hago yo + decisión de dónde publicar)

- [x] 6.1 Actualizar SheetJS a 0.20.x (aviso de seguridad) — hecho: 0.20.3 desde cdn.sheetjs.com (13/10/2026).
- [ ] 6.2 Correr de nuevo todas las revisiones automáticas — **yo**: `npm.cmd run typecheck` (tipos de TypeScript), `npm.cmd test` (unitarias), `npm.cmd run test:e2e` (en navegador).
- [x] 6.3 Publicada en internet con HTTPS en **Netlify**: https://aic-centros-negocio.netlify.app (se sube a mano: `npm.cmd run preparar-publicacion` y arrastrar `publicar/`, [guía, paso 6](../GUIA-CONFIGURACION-MICROSOFT.md#paso-6-publicar-la-app-hosting)). *(12/10/2026)*
- [ ] 6.4 Antes de subir la versión con el Excel real: que el administrador haya hecho el **paso 2** de la guía (`Files.Read.All` en la lista + consentimiento). Después, cerrar el Excel de ejemplo, `npm.cmd run preparar-publicacion`, subir `publicar/` y repetir 4.2–4.6 en https://aic-centros-negocio.netlify.app.

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
