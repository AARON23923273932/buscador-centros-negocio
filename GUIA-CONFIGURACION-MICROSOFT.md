# Guía: conectar el buscador de centros de negocio a Microsoft 365 y publicarlo

> **Para quién es:** la persona que administra Microsoft 365 en la empresa (Entra ID y SharePoint) y quien publique la app.
> **Tiempo aproximado:** 30 a 60 minutos.
> **Requisito:** la app ya funciona en modo demo (ver [README.md](README.md)).
>
> Los nombres de los menús son los del **centro de administración de Microsoft Entra** actual (entra.microsoft.com). Entre paréntesis va el nombre que tenían en el portal anterior, por si todavía se ve así. Pueden variar un poco según el idioma.

---

## 0. Resumen: qué hay que hacer

| # | Paso | Quién | Resultado |
|---|---|---|---|
| 1 | Registrar la app en **Entra ID** (inquilino único) | Administrador de Microsoft 365 | `clientId` y `tenantId` |
| 2 | Darle permisos **delegados** de solo lectura (`User.Read`, `Files.Read.All`) + consentimiento (**antes** de publicar la versión que lee el Excel real) | Administrador | La app puede leer el Excel *en nombre de* cada usuario |
| 3 | (Opcional, recomendado) Limitar quién puede entrar | Administrador | Solo el personal elegido |
| 4 | Ubicar el Excel en SharePoint/OneDrive, darle permiso de **lectura** al personal y sacar sus identificadores | Dueño del Excel / administrador | `driveId` + `itemId` (o el enlace) |
| 5 | Llenar `app/public/config.json` | Quien mantiene la app | App configurada |
| 6 | Publicar (hoy: Netlify, carpeta `publicar/`) y registrar la dirección final | Quien publica + administrador | App en internet con HTTPS |

---

## Conceptos en 1 minuto

- **Tenant (inquilino):** el "espacio" de la empresa dentro de Microsoft 365 (sus cuentas, archivos, reglas). *Ej.: el tenant de AIC.*
- **Entra ID** (antes Azure AD): donde viven las cuentas de la empresa. Para tener "Iniciar sesión con Microsoft" hay que **registrar la app** ahí.
- **clientId** ("Id. de aplicación (cliente)"): el número que identifica a *esta app* en Entra ID. **No es secreto.**
- **tenantId** ("Id. de directorio (inquilino)"): el número que identifica a la empresa en Microsoft 365. **No es secreto.**
- **SPA** ("aplicación de página única"): una app web que corre completa en el navegador, sin servidor propio. Esta app es una SPA y **no usa contraseñas de aplicación ni "secretos"**.
- **Permiso delegado:** la app actúa *en nombre de* la persona que inició sesión y **solo puede ver lo que esa persona ya puede ver**.
- **Microsoft Graph:** la "puerta" (API) de Microsoft 365 por la que la app lee el Excel.
- **Redirect URI:** la dirección de la app a la que Microsoft devuelve a la persona después de iniciar sesión. Aquí siempre termina en `/redirect.html`.
- **UPN** ("nombre de inicio de sesión"): lo que la persona escribe para entrar a Microsoft 365, ej. `ana@aic.pe`. Casi siempre es igual al correo, pero no siempre.

---

## Paso 1. Registrar la app en Entra ID

1. Entrar a **https://entra.microsoft.com** con una cuenta de administrador.
2. Ir a **Entra ID → Registros de aplicaciones → + Nuevo registro** (en inglés *Entra ID → App registrations*; en el portal anterior: *Identidad → Aplicaciones → Registros de aplicaciones*).
3. Llenar:
   - **Nombre:** `Buscador de centros de negocio` (es el nombre que verán los usuarios).
   - **Tipos de cuenta compatibles:** **"Solo inquilino único – AIC"** (en inglés *Single tenant only*; en el portal anterior: *"Solo las cuentas de este directorio organizativo (inquilino único)"*). Ver el recuadro "¿Y Jaicos?" más abajo.
   - **URI de redirección:** plataforma **"Aplicación de página única (SPA)"** y la dirección:
     `http://localhost:5173/redirect.html`
     > ⚠️ Debe ser **SPA**, no "Web". Si se elige "Web", el inicio de sesión falla con el error `AADSTS9002326`.
4. Pulsar **Registrar**.
5. En la página **Información general** de la app, copiar:
   - **Id. de aplicación (cliente)** → será `microsoft.clientId`
   - **Id. de directorio (inquilino)** → será `microsoft.tenantId` (**obligatorio**: sin él la app no deja iniciar sesión, ver `AADSTS50194` en "Problemas comunes")
6. Ir a **Autenticación** (*Authentication*). En el portal actual las direcciones están en la pestaña **"Configuración de URI de redirección"** (*Redirect URI configuration*) → **Agregar URI de redirección** (*Add Redirect URI*). Agregar, siempre como **Aplicación de página única (SPA)**:
   - `http://localhost:4173/redirect.html` (para probar la versión compilada)
   - `http://localhost:5173/` y `http://localhost:4173/` (a dónde vuelve la persona después de **cerrar sesión**; si no están, Microsoft muestra su propia página de "sesión cerrada" en vez de volver a la app)
   - `https://<dirección-de-producción>/redirect.html` y `https://<dirección-de-producción>/` (se agregan en el paso 6, cuando se sepa la dirección)
   - En **"URL de cierre de sesión de front-channel"** no hace falta poner nada.
7. En esa misma página **no** marcar "Tokens de acceso" ni "Tokens de id." (flujo implícito): esta app usa el método moderno (código + PKCE) y no los necesita.

> ### ¿Y Jaicos? ✅ *(confirmado el 12/10/2026: mismo tenant, "JAICOS CORP S.A.C.", con los dominios `aic.pe` y `jaicoscorp.com`. No hay que hacer nada especial; lo de abajo queda solo como referencia.)*
> Primero hay que saber si las cuentas `@jaicoscorp.com` están **en el mismo tenant** que las de AIC.
> Cómo revisarlo: en Entra ID → **Configuración → Nombres de dominio** (o "Nombres de dominio personalizados"). Si aparece `jaicoscorp.com` junto a `aic.pe`, **es el mismo tenant** → no hay que hacer nada especial.
>
> Si Jaicos tiene **su propio tenant**, el único camino que sirve es **invitarlas (B2B)**:
> - Se invita a las personas de Jaicos como **invitados** en el tenant de AIC (Entra ID → Usuarios → **Invitar usuario externo**). Entran con su propia cuenta `@jaicoscorp.com`.
> - La app sigue registrada como **inquilino único** y en `config.json` va el `tenantId` **de AIC**. Así Microsoft les da un acceso "de invitado" dentro de AIC, que es lo que permite leer el Excel guardado en el SharePoint de AIC.
> - Hay que darles permiso de lectura sobre el Excel (paso 4.2).
>
> ❌ **No sirve** registrar la app como "multiinquilino" (*Multiple Entra ID tenants*) y dejar `tenantId` vacío: así cada persona de Jaicos entraría con un acceso de **su propio** tenant, que no puede leer archivos del SharePoint de AIC. (Microsoft lo indica: para que alguien entre como invitado a otro tenant, hay que usar el identificador de ese tenant.)

---

## Paso 2. Permisos de la API (solo lectura)

1. En la app registrada → **Permisos de API → + Agregar un permiso → Microsoft Graph → Permisos delegados**.
2. Marcar:
   - `User.Read` (normalmente ya viene agregado): permite iniciar sesión y leer el nombre y correo de quien entra.
   - `Files.Read.All`: permite **leer** archivos de SharePoint/OneDrive **a los que el usuario ya tiene acceso**. **Es el que necesita el Excel real** (desde el 12/10/2026 `config.json` lo pide en `"scopes"`). La app lo pide **al leer el Excel**, no al iniciar sesión (al iniciar sesión solo pide `User.Read`).
3. Pulsar **Agregar permisos**. Revisar que en la lista queden `User.Read` **y** `Files.Read.All`, los dos de tipo **Delegado**.
4. Pulsar **"Conceder consentimiento de administrador para <empresa>"** y confirmar. Así los usuarios no ven una pantalla pidiendo aceptar permisos.
   > ⚠️ Este botón **solo aprueba los permisos que están en la lista** del punto 3. Si `Files.Read.All` no aparece ahí, el administrador "concede" y el error sigue: primero agregarlo (2.1–2.3).

   > ⚠️ **Puede ser obligatorio, y conviene hacerlo ANTES de subir a Netlify la versión que lee el Excel real.** Si en la empresa los usuarios no pueden aprobar permisos por su cuenta (configuración de Entra ID → *Aplicaciones empresariales → Consentimiento y permisos*; desde 2025 Microsoft lo bloquea por defecto para `Files.Read.All` en muchas empresas, *por confirmar si aplica a una app registrada en la propia empresa*), pasa esto:
   > - La persona **sí puede iniciar sesión** (solo se pide `User.Read`) y ve su nombre arriba.
   > - Al leer el Excel, la app la lleva una vez a Microsoft, que muestra *"Se necesita aprobación del administrador"* (*Need admin approval*). Al volver, la app muestra: *"Tu organización exige que un administrador apruebe el permiso de lectura de archivos (Files.Read.All) para la app 'Buscador de centros de negocio'…"* (errores `AADSTS65001`, `AADSTS90093`, `AADSTS90094`, `AADSTS900941`) y el Excel no carga.
   > - Si la empresa tiene activada la **solicitud de aprobación** (*admin consent workflow*), la persona puede pedirla desde esa pantalla; al volver ve *"No se aprobaron los permisos de la app. Si pediste la aprobación de un administrador, espera a que la conceda…"* (`AADSTS65004`) hasta que un administrador la apruebe.
   >
   > Solución: este paso 2.4, hecho por un administrador (**Entra ID → Registros de aplicaciones → Buscador de centros de negocio → Permisos de API → Conceder consentimiento de administrador**). Después cada persona pulsa **"Volver a iniciar sesión"** en la app (o cierra sesión y entra de nuevo).

**¿Por qué estos permisos y no otros?**

| Permiso | ¿Por qué sí / por qué no? |
|---|---|
| `User.Read` | Mínimo para "Iniciar sesión con Microsoft". |
| `Files.Read.All` (delegado) | El Excel vive en **SharePoint o en el OneDrive de otra persona** (la del bot). `Files.Read` (sin "All") solo deja leer **tus propios** archivos, así que no alcanza. Al ser **delegado**, "All" **no** significa "todos los archivos de la empresa": significa "todos los archivos **que esa persona ya puede abrir**". Si a alguien no le compartieron el Excel, Graph le responde "sin permiso" y la app lo muestra. Es de **solo lectura**: la app no puede modificar ni borrar nada. |
| `Sites.Read.All` | Abarca también listas y páginas de SharePoint. **No se pide**: la app nunca consulta el sitio por separado (`GET /sites/{sitio}`, que según la documentación de Microsoft lo exige). Para el archivo por id y la búsqueda, la documentación acepta `Files.Read.All`. Para **listar las bibliotecas** del sitio, la documentación da `Files.Read.All` para `GET /sites/{id-del-sitio}/drives`, pero **no dice nada** de la forma que usa la app, con la dirección del sitio (`GET /sites/jaicoscorp.sharepoint.com/drives`) *(por confirmar)*. Si Graph exigiera `Sites.Read.All` ahí, la búsqueda de respaldo (paso 4.3, forma C) fallaría para **todas** las personas con el mensaje *"No se pudo ver las bibliotecas de documentos del sitio de SharePoint…"*. Plan B: fijar `driveId` + `itemId` (forma A, lo mejor) o agregar `Sites.Read.All` (delegado) con consentimiento de administrador. |
| `Sites.Selected` (avanzado) | Permite limitar la app a **un solo sitio** de SharePoint, pero requiere un trámite extra del administrador por cada sitio. Se puede evaluar más adelante si se quiere ser más estricto. *(por confirmar si aplica a este caso)* |
| Permisos de escritura (`Files.ReadWrite…`) | **No** se piden: la app es solo de consulta. |
| Permisos de **aplicación** (no delegados) | **No** se usan: le darían a la app acceso a archivos sin que haya una persona detrás. Una app web no puede guardar ese secreto de forma segura. |

> **Comprobarlo una vez** *(por confirmar)*: en el **Probador de Graph** (paso 4.3, forma A), con una cuenta **normal** que pueda abrir el Excel, en **Modificar permisos** (*Modify permissions*) debe figurar `Files.Read.All` como aprobado y `Sites.Read.All` **no**. Hacer `GET https://graph.microsoft.com/v1.0/sites/jaicoscorp.sharepoint.com/drives?$select=id,name`: si responde **200** con la lista de bibliotecas, basta `Files.Read.All`; si responde **403**, aplicar el plan B de la fila `Sites.Read.All`.

> ⚠️ **Detalle importante sobre `Files.Read.All` y el "enlace compartido"** *(por confirmar con una prueba)*: la documentación de Microsoft se contradice. La página de "abrir un archivo por su enlace" (`/shares/…`) solo menciona permisos de escritura, mientras que las de "listar bibliotecas", "buscar archivos" y "abrir un archivo por sus identificadores" (`/drives/{driveId}/items/{itemId}`) sí aceptan `Files.Read.All`. Por eso, si `/shares/…` falla con una dirección del navegador (`Doc.aspx`), la app **ya no se queda ahí**: busca el archivo por sus identificadores (paso 4.3, forma C). Si aun así **a todas las personas** les sale "Tu cuenta no tiene permiso para abrir el Excel" o "No se encontró el Excel", fijar **`driveId` + `itemId`** en `config.json`. **No** agregar permisos de escritura para "arreglarlo".

---

## Paso 3. (Opcional, recomendado) Decidir quién puede entrar

Por defecto, cualquier cuenta del tenant (incluidos los invitados) puede iniciar sesión en la app (y luego la app revisa el dominio). Para limitarlo a un grupo:

1. **Entra ID → Aplicaciones empresariales** (*Entra ID → Enterprise apps*; en el portal anterior: *Aplicaciones → Aplicaciones empresariales*) → buscar `Buscador de centros de negocio`.
2. **Propiedades → ¿Se requiere asignación?** = **Sí** → Guardar.
3. **Usuarios y grupos → + Agregar usuario o grupo** → elegir un grupo (ej. "Personal AIC", "Invitados Jaicos").

Quien no esté asignado verá un error de Microsoft (`AADSTS50105`) y la app le explica que pida acceso.

---

## Paso 4. El Excel: ubicación, permisos e identificadores

### 4.1 Dónde debe estar
- El Excel debe estar en **SharePoint** (recomendado: un sitio o equipo de Teams del área) o en **OneDrive de trabajo**.
- ⚠️ Si hoy el bot guarda el Excel en una **carpeta de red** (`\\servidor\…`) o en una PC, la app no puede leerlo: el bot debe guardarlo en SharePoint/OneDrive (o sincronizar esa carpeta con OneDrive). *(por confirmar dónde lo guarda el bot)*
- El bot debe **actualizar siempre el mismo archivo** (mismo nombre y mismo lugar). Si lo **borra y lo vuelve a crear**, el archivo cambia de identificador y la app deja de encontrarlo. *(por confirmar)*
- El bot debe escribir **valores**, no fórmulas sin calcular. Si escribe fórmulas con una librería que no calcula (ej. `openpyxl`), esas celdas se ven vacías; la app avisa "N celdas tienen una fórmula sin resultado guardado". *(por confirmar cómo escribe el bot)*

### 4.2 Permisos
- Dar permiso de **lectura** al personal que usará la app. Lo más ordenado: que el Excel esté en una biblioteca de SharePoint donde un **grupo** (ej. "Personal AIC") tenga permiso de **lectura**.
- Para personas de Jaicos (invitadas): agregarlas a ese grupo o compartirles el archivo.
- **Permiso de edición solo para la cuenta del bot** (y, si hace falta, una persona responsable). La app abre el Excel en el navegador de cada usuario: si alguien pudiera reemplazarlo por un archivo "trampa", podría aprovechar los avisos de seguridad conocidos de la librería que lee Excel (ver "Seguridad" al final).
- Recordatorio: la app **solo ve lo que cada persona ya puede ver**. Este paso es la seguridad real de los datos.

### 4.3 Identificar el Excel en `config.json`

Hay tres formas. Hoy (12/10/2026) se usa la **C** (la dirección del navegador del Excel real). La **A** es la más directa si alguna vez la C falla.

**A. `driveId` + `itemId` (la más directa)** — los identificadores internos del archivo. Es la forma que la documentación de Microsoft garantiza con el permiso `Files.Read.All`, y no depende de cómo esté configurado un enlace.

1. Abrir el **Probador de Graph** (*Graph Explorer*): https://developer.microsoft.com/graph/graph-explorer e iniciar sesión con una cuenta que pueda abrir el Excel.
2. Hacer una consulta **GET** con la ruta del archivo (cambiar las partes entre `< >`):
   - Si está en un **sitio de SharePoint**:
     `https://graph.microsoft.com/v1.0/sites/<empresa>.sharepoint.com:/sites/<NombreDelSitio>:/drive/root:/<Carpeta>/<Archivo>.xlsx?$select=id,name,parentReference`
     *Ej.:* `…/sites/aic.sharepoint.com:/sites/Operaciones:/drive/root:/Reportes/Centros de negocio.xlsx?$select=id,name,parentReference` *(nombres de ejemplo)*
   - Si está en el **OneDrive** de una cuenta (ej. la del bot):
     `https://graph.microsoft.com/v1.0/users/<cuenta-del-bot>/drive/root:/<Carpeta>/<Archivo>.xlsx?$select=id,name,parentReference`
   - Si el Probador pide permisos, aceptar `Files.Read.All` (o `Sites.Read.All`) para el Probador.
   - Si la consulta del sitio de SharePoint da error, hacerla en dos pasos: primero `GET https://graph.microsoft.com/v1.0/sites/<empresa>.sharepoint.com:/sites/<NombreDelSitio>` y copiar el `id` del sitio; luego `GET https://graph.microsoft.com/v1.0/sites/<id-del-sitio>/drive/root:/<Carpeta>/<Archivo>.xlsx?$select=id,name,parentReference`.
   - La ruta empieza **dentro** de la biblioteca "Documentos": no se escribe "Documentos compartidos" / "Shared Documents".
3. En la respuesta:
   - `id` → será `datos.itemId`
   - `parentReference.driveId` → será `datos.driveId`

> Con esta forma, cada persona necesita permiso **directo** sobre el archivo o su biblioteca (lo del 4.2). Un enlace "Personas de AIC con el vínculo" no basta.

**B. Enlace compartido (`urlCompartida`) — más simple de obtener**

1. Abrir la carpeta en SharePoint/OneDrive, seleccionar el Excel → **Compartir → Copiar vínculo** (o "…" → **Copiar vínculo**).
2. En **Configuración del vínculo** elegir **"Personas con acceso existente"** ✅ (el enlace solo sirve a quien ya tiene permiso, lo del 4.2). "Personas de AIC con el vínculo" también funciona, pero es más abierto.
3. Copiar el enlace (se ve parecido a `https://aic.sharepoint.com/:x:/s/Area/EAbc…?e=XyZ`) → será `datos.urlCompartida`.

> ⚠️ Ver el aviso del paso 2: con el enlace, Microsoft podría no aceptar `Files.Read.All` *(por confirmar)*. **Prueba obligatoria** antes de avisar al personal: iniciar sesión en la app con una cuenta **normal** (no administradora) que sí pueda abrir el Excel en SharePoint. Si aparece "Tu cuenta no tiene permiso para abrir el Excel", pasar a la forma **A**.

**C. La dirección del navegador al abrir el Excel en Excel Online (`Doc.aspx`) — la que se usa hoy**

Es lo que aparece en la barra del navegador al abrir el Excel desde SharePoint, por ejemplo:
`https://jaicoscorp.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BE20FAA1A-…%7D&file=centros-negocio-aic.xlsx&action=default&…`

- Se pega **completa, tal cual**, en `datos.urlCompartida` (igual que un enlace de la forma B).
- Se acepta con o sin `/:x:/r` y con o sin el sitio antes de `/_layouts` (`/sites/<Area>` o `/teams/<Area>`; sin nada = el sitio raíz).
- Las dos partes que usa la app: `sourcedoc` = el identificador único del archivo en SharePoint (no cambia aunque lo renombren o lo muevan dentro del sitio) y `file` = el nombre del archivo.

Cómo la encuentra la app (todo con la cuenta de la persona y `Files.Read.All`, solo lectura):
1. Primero la prueba como enlace para compartir (`GET /shares/u!…/driveItem`). Si Graph la acepta y devuelve el archivo con ese nombre, listo.
2. Si Graph responde 400/403/404, o devuelve una **carpeta** o un archivo con **otro nombre**, la app pide las **bibliotecas de documentos** de ese sitio (`GET /sites/<host>/drives`, o `GET /sites/<host>:/sites/<Area>:/drives`; lee hasta 5 páginas de la lista). *(por confirmar que alcanza `Files.Read.All`: ver paso 2)*
3. En cada biblioteca pide el archivo **directo por su identificador** `sourcedoc` (`GET /drives/<biblioteca>/items/<sourcedoc>`, Microsoft lo permite para archivos de SharePoint).
4. Si así no aparece, lo **busca por nombre** (`…/root/search(q='centros-negocio-aic.xlsx')`, hasta 5 páginas de resultados) y elige el que tenga el mismo identificador (`sharepointIds.listItemUniqueId`). Si ninguno lo tiene pero hay **un solo** archivo con ese nombre, usa ese (y lo anota en la consola del navegador). Si hay varios o ninguno, muestra un mensaje claro. (Si en el paso 1 se abrió un archivo con otro nombre y la búsqueda no encuentra nada, por ejemplo porque lo renombraron, usa el que abrió el enlace.)
5. Si una biblioteca responde con un error de Microsoft (500, 503…), la salta y sigue con las demás; solo si al final no encontró el archivo, muestra ese error. Una sesión vencida (401) o "Microsoft está ocupado" (429) cortan la búsqueda enseguida.
6. Lo encontrado se recuerda **en esa pestaña** (no se vuelve a buscar en cada actualización automática). Si un día el archivo ya no está ahí (por ejemplo, el bot lo borró y lo volvió a crear), lo vuelve a buscar una vez.
7. En **"Columnas detectadas en el Excel"** (al final de la página) aparecen el `driveId` y el `itemId` encontrados: si se copian en `config.json` (forma A), la app ya no necesita buscar. (Solo aparecen cuando el Excel **cargó**; si la carga falla, sacarlos con el Probador de Graph, forma A.)

> La búsqueda por nombre usa el índice de búsqueda de SharePoint: un archivo **recién subido** puede tardar unos minutos en aparecer. El paso 3 (por identificador) no depende de ese índice.

Si se llenan varias formas, la app usa `driveId` + `itemId`.

---

## Paso 5. Llenar `config.json`

El archivo que se edita es **`app/public/config.json`** (es la única copia "de verdad"). Al compilar (`npm run build`), se copia solo a `dist/config.json`, que es lo que se publica. **No editar `dist/config.json` a mano:** cada `npm run build` (y cada `npm run test:e2e`, que compila) borra `dist/` y lo vuelve a crear desde `public/`, así que el cambio se perdería sin aviso y se podría publicar la configuración de demostración.

No hace falta tocar el código: el archivo se lee cuando se abre la página. Las claves que empiezan con `_` son solo comentarios.

Ejemplo para producción (los valores entre `< >` son los del paso 1 y 4):

```json
{
  "modo": "microsoft",
  "titulo": "Buscador de centros de negocio",
  "microsoft": {
    "clientId": "<Id. de aplicación (cliente)>",
    "tenantId": "<Id. de directorio (inquilino) de AIC>",
    "tenantsPermitidos": ["<Id. de directorio (inquilino) de AIC>"],
    "redirectUri": "",
    "dominiosPermitidos": ["aic.pe", "jaicoscorp.com"],
    "scopes": ["User.Read", "Files.Read.All"],
    "guardarSesion": "localStorage"
  },
  "datos": {
    "fuente": "graph",
    "urlCompartida": "<enlace del Excel, paso 4.3 (forma B o C)>",
    "driveId": "",
    "itemId": "",
    "hoja": "",
    "filaEncabezado": null
  },
  "columnasOcultas": ["moneda", "monto"],
  "autoActualizarMinutos": 10,
  "filasPorPagina": 50
}
```

| Campo | Qué poner |
|---|---|
| `modo` | `"microsoft"` para pedir inicio de sesión. `"demo"` = sin inicio de sesión y con datos ficticios. |
| `titulo` / `subtitulo` | Textos de la cabecera de la página. |
| `microsoft.clientId` | Id. de aplicación (paso 1). |
| `microsoft.tenantId` | Id. de directorio de AIC (paso 1). **Obligatorio** en modo `microsoft`: la app es de inquilino único y, sin él, Microsoft rechaza el inicio de sesión (`AADSTS50194`). *(Avanzado, no recomendado: `"organizations"` = cualquier cuenta de trabajo; solo se acepta si también se llena `tenantsPermitidos`.)* |
| `microsoft.tenantsPermitidos` | Lista de Id. de directorio aceptados. Con el de AIC basta (los invitados de Jaicos también entran con el tenant de AIC). Vacía = no se revisa. Es una revisión **en el navegador** (comodidad), igual que los dominios. |
| `microsoft.redirectUri` | Vacío = `<dirección de la app>/redirect.html` (lo normal). |
| `microsoft.postLogoutRedirectUri` | A dónde vuelve la persona al cerrar sesión. Vacío = `<dirección de la app>/` (lo normal; debe estar registrada en el paso 1.6). |
| `microsoft.dominiosPermitidos` | Dominios que pueden entrar. Se compara el **nombre de inicio de sesión (UPN)**, no el correo: **el administrador debe confirmar que el UPN del personal termina en `@aic.pe` / `@jaicoscorp.com`** *(por confirmar)*. Si el UPN fuera otro (ej. `@aic.onmicrosoft.com`), agregar ese dominio a la lista. `jaicoscorp.com` *(por confirmar)*. Vacío = no se revisa el dominio. Siempre entre corchetes, aunque sea uno: `["aic.pe"]`. |
| `microsoft.scopes` | Dejar `["User.Read", "Files.Read.All"]` (paso 2). |
| `microsoft.guardarSesion` | `"localStorage"` recuerda la sesión entre pestañas; `"sessionStorage"` la olvida al cerrar la pestaña. |
| `datos.fuente` | `"graph"` = Excel real en SharePoint/OneDrive. (`"archivo-local"` es solo para el Excel de ejemplo.) |
| `datos.driveId` + `datos.itemId` | Identificadores del Excel (paso 4.3, forma A, recomendada). |
| `datos.urlCompartida` | Enlace del Excel: el de **Compartir → Copiar vínculo** (paso 4.3, forma B) o la **dirección del navegador** al abrirlo en Excel Online, `…/_layouts/15/Doc.aspx?sourcedoc=…&file=…` (forma C). Completo y tal cual; debe empezar con `https://`. |
| `datos.rutaLocal` | Solo con `"archivo-local"`: ruta del Excel de ejemplo (`datos/centros-ejemplo.xlsx`). |
| `datos.hoja` | Nombre de la hoja; vacío = la primera hoja **visible** (las ocultas se saltan). |
| `datos.filaEncabezado` | Fila de los títulos (1, 2, …); `null` = la app la detecta sola. |
| `datos.rellenarHaciaAbajo` | Si en el Excel el centro se escribe **una sola vez** y las filas de abajo (sus otras órdenes) dejan vacíos código/descripción/cliente, la app los copia de la fila de arriba. Solo se hace en filas que tienen orden y no tienen ni código ni descripción. `[]` = no copiar. *(por confirmar con el Excel real)* |
| `columnas` | Nombres posibles de cada columna (`codigoCentro`, `descripcionCentro`, `cliente`, `ordenCompra`, `tipoOrden`, `estado`). Con el Excel real, agregar aquí sus títulos si la app no los reconoce sola (ver "Columnas detectadas en el Excel" al final de la página). Cada campo es una lista entre corchetes. |
| `camposObligatorios` | Columnas que el Excel debería tener; si falta alguna, la app muestra un aviso. **Si el Excel real no tiene, por ejemplo, la columna de cliente, quitar `"cliente"` de esta lista para no ver el aviso.** Valores posibles: `codigoCentro`, `descripcionCentro`, `cliente`, `ordenCompra`, `tipoOrden`, `estado`. (`tipoOrden` y `estado` no van por defecto: si faltan, su filtro desplegable simplemente no aparece.) |
| `columnasOcultas` | Palabras: se ocultan las columnas del Excel que tengan una de ellas **como palabra completa** en el título (sin importar tildes, mayúsculas ni signos). Por defecto `["moneda", "monto"]`: oculta *Monto*, *Monto total*, *Monto (S/)*, *Moneda*, *Tipo de moneda* (pero no *Montos*). Esas columnas **no se muestran, no se buscan, no se exportan** y no aparecen en la vista por centro. **Nunca** se oculta una columna que la app usa como código, descripción, cliente, orden, tipo o estado. `[]` = mostrar todas. "Columnas detectadas en el Excel" dice cuáles se ocultaron. |
| `autoActualizarMinutos` | Cada cuántos minutos revisa si el Excel cambió (0 = nunca). |
| `filasPorPagina` | 25, 50, 100 o 250. |

> ⚠️ **No usar `"fuente": "archivo-local"` con datos reales:** un archivo publicado junto a la app lo puede descargar **cualquiera** que tenga la dirección, sin iniciar sesión. Ese modo es solo para el Excel de ejemplo.

Si `config.json` tiene un error de escritura (una coma de más, comillas faltantes) o un valor con la forma equivocada (ej. `"dominiosPermitidos": "aic.pe"` sin corchetes, `"filasPorPagina": 30`), la app muestra la pantalla **"Falta configurar la aplicación"** con la lista de lo que hay que corregir. Para revisar comas y llaves se puede pegar el contenido en cualquier "validador de JSON".

**Probar en la computadora antes de publicar:**
```powershell
cd C:\dev\AIC\automatizaciones\sitio-web\app
npm run dev        # http://localhost:5173 → "Iniciar sesión con Microsoft" (configuración real)
npm run dev:demo   # http://localhost:5173 → modo demo (sin login, Excel de ejemplo), sin tocar config.json
```
- La app siempre usa el puerto **5173** (y `npm run preview`, el **4173**), porque son los registrados en Entra ID. Si ese puerto está ocupado (por ejemplo, otro `npm run dev` abierto), Vite **avisa y no arranca** en vez de usar otro puerto: cerrar el otro programa y volver a intentar.
- Si PowerShell responde *"No se puede cargar el archivo …\npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema"*, ver el recuadro "PowerShell bloquea npm" del paso 6.

---

## Paso 6. Publicar la app (hosting)

> ### PowerShell bloquea `npm` o `swa`
> En muchas PC de empresa, PowerShell no deja ejecutar "scripts" (política de ejecución *Restricted*). Como `npm` y `swa` se instalan como scripts `.ps1`, sale el error *"…npm.ps1 no se puede cargar porque la ejecución de scripts está deshabilitada en este sistema"*. Cualquiera de estas opciones lo resuelve:
> - Escribir **`npm.cmd`** en vez de `npm` (y **`swa.cmd`** en vez de `swa`). Ej.: `npm.cmd run build`.
> - Usar el **Símbolo del sistema** (`cmd`) en vez de PowerShell: ahí `npm` y `swa` funcionan igual.
> - Ejecutar una sola vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (solo para tu usuario). **Pedir permiso a quien administra el equipo antes**, porque cambia una configuración de seguridad.

### Opción usada hoy: Netlify (https://aic-centros-negocio.netlify.app)
La app se publica **a mano**: se compila en la PC y se arrastra una carpeta a Netlify (Netlify no compila nada).

1. **Antes de la primera vez con el Excel real:** que el administrador haya hecho el **paso 2** (`Files.Read.All` en la lista + consentimiento, si la empresa lo exige). Si no, la gente entra pero el Excel no carga.
2. **Cerrar el Excel de ejemplo** si está abierto (`app/public/datos/centros-ejemplo.xlsx`). Mientras está abierto, Excel crea al lado `~$centros-ejemplo.xlsx`, que lleva **el nombre del usuario de Windows**. La compilación y el script lo dejan afuera y avisan, pero es mejor que no exista.
3. Preparar la carpeta:
   ```powershell
   cd C:\dev\AIC\automatizaciones\sitio-web\app
   npm.cmd run preparar-publicacion   # compila y copia todo a ..\publicar (sin archivos ~$…)
   ```
   Al terminar muestra el modo, la fuente de datos y los permisos de `config.json` (deben ser `microsoft`, `graph` y `User.Read, Files.Read.All`).
4. **https://app.netlify.com** → el sitio `aic-centros-negocio` → **Deploys** → arrastrar la carpeta **`publicar`** al recuadro *"Drag and drop your project folder here"*.
5. La primera vez (ya hecho): registrar `https://aic-centros-negocio.netlify.app/redirect.html` y `https://aic-centros-negocio.netlify.app/` como URI de redirección **SPA** en Entra ID (paso 1.6).

`publicar/` incluye `netlify.toml` (publicar la carpeta tal cual) y `_headers` (que `config.json` no quede guardado en caché).

### Otra opción: Azure Static Web Apps — plan **Gratis**
Sirve justo para este tipo de app (página estática), da HTTPS automático y una dirección del tipo `https://<nombre>.azurestaticapps.net`. Se puede usar un subdominio propio después (ej. `buscador.aic.pe`, *por confirmar*).

1. **Compilar la app** (después de llenar `app/public/config.json`):
   ```powershell
   cd C:\dev\AIC\automatizaciones\sitio-web\app
   npm run build      # crea la carpeta dist/ (es lo único que se publica), con config.json incluido
   ```
2. **Crear el recurso** (una sola vez): https://portal.azure.com → **Crear un recurso → Static Web App** →
   - Suscripción y grupo de recursos de la empresa *(por confirmar cuál)*.
   - Nombre: `buscador-centros-negocio`. Plan: **Gratis**. Región: la más cercana disponible.
   - Origen de la implementación: **Otro** (se sube a mano; también se puede conectar a GitHub más adelante).
3. En el recurso creado → **Administrar token de implementación** → copiar el token.
   > El token es **secreto**: no guardarlo en archivos del proyecto ni enviarlo por chat.
4. **Subir la carpeta `dist/`** con la herramienta oficial de Static Web Apps (se instala una vez):
   ```powershell
   npm install -g @azure/static-web-apps-cli
   cd C:\dev\AIC\automatizaciones\sitio-web\app
   swa deploy ./dist --env production --deployment-token <TOKEN>
   ```
   Al terminar muestra la dirección de la app.
5. **Registrar la dirección final en Entra ID** (paso 1.6): agregar `https://<dirección>/redirect.html` y `https://<dirección>/` como URI de redirección **SPA**.
6. Abrir la dirección y probar (ver "Lista de verificación").

El archivo `staticwebapp.config.json` (ya incluido en `dist/`) agrega cabeceras de seguridad y evita que `config.json` quede guardado en caché.

**Para cambiar algo después** (con Netlify, cambiar "`swa deploy …`" por "`npm.cmd run preparar-publicacion` y arrastrar `publicar/`"):
- Solo configuración → editar **`app/public/config.json`**, `npm run build` y volver a ejecutar `swa deploy …`. (No editar `dist/config.json` ni `publicar/config.json`: se pierden en el siguiente `npm run build` / `preparar-publicacion`.)
- Código → `npm test`, `npm run test:e2e`, `npm run build` y `swa deploy …`.
  - Las pruebas usan **su propia configuración de demostración** (no la de `public/config.json`), así que pasan aunque `config.json` ya tenga los valores de producción.
  - En una PC nueva, antes del primer `npm run test:e2e`, ejecutar una vez `npx playwright install chromium` (descarga el navegador que usan las pruebas; `npm install` no lo trae).
  - Como `npm run test:e2e` vuelve a compilar `dist/`, ejecutar `npm run build` al final (justo antes de `swa deploy`) es lo más seguro.

### Otras opciones de hosting
Cualquier servicio que publique **archivos estáticos con HTTPS** sirve: un servidor web de la empresa (IIS, Nginx), Azure Storage (sitio web estático), Netlify, etc. Requisitos:
- Publicar el **contenido** de `dist/` tal cual (incluye `index.html`, `redirect.html`, `config.json`, `assets/`).
- **HTTPS obligatorio** (Microsoft no acepta direcciones `http://` salvo `localhost`).
- Que `config.json` no se guarde en caché por mucho tiempo.
- Registrar `https://<dirección>/redirect.html` y `https://<dirección>/` en Entra ID.
- Opcional: quitar `datos/centros-ejemplo.xlsx` de `dist/` en producción (son datos ficticios, pero no hacen falta).

---

## Lista de verificación (después de configurar)

- [ ] `Files.Read.All` (delegado) aparece en **Permisos de API** de la app y, si la empresa lo exige, tiene el consentimiento de administrador **antes** de subir la versión con el Excel real.
- [ ] Una cuenta `@aic.pe` **normal (no administradora)** entra y ve la tabla; arriba aparece su nombre y "Cerrar sesión".
- [ ] Una cuenta de Jaicos (invitada) entra *(cuando se confirme el dominio y el tenant)*.
- [ ] Una cuenta personal (`@gmail.com`, `@outlook.com`) o de otra empresa **no** entra ("Tu cuenta no tiene acceso" o un error de Microsoft).
- [ ] Una persona de la empresa **sin permiso sobre el Excel** ve el mensaje "Tu cuenta no tiene permiso para abrir el Excel". (Si lo ven **todas**, ver el aviso del paso 2.)
- [ ] "Excel modificado el …" coincide con la última actualización del bot.
- [ ] Cuando el bot agrega un centro nuevo, aparece al pulsar **Actualizar** (o solo, en máximo 10 minutos).
- [ ] "Columnas detectadas en el Excel" (al final de la página) muestra bien código, descripción, cliente y orden; si no, agregar los nombres en `columnas` de `config.json`.
- [ ] En la vista "Por centro de negocio", cada centro muestra la cantidad correcta de órdenes (si salen centros con 0 órdenes o un grupo "sin código" grande, revisar `rellenarHaciaAbajo` y los títulos de las columnas).

---

## Problemas comunes

| Mensaje / síntoma | Causa probable | Solución |
|---|---|---|
| `AADSTS50011` (redirect URI no coincide) | La dirección `…/redirect.html` no está registrada o tiene otra forma (http/https, barra final, **otro puerto**). | Agregarla **exactamente igual** en Entra ID → Autenticación → SPA. En la computadora, la app usa siempre los puertos 5173 y 4173 (si están ocupados, Vite no arranca: cerrar el otro programa). |
| `AADSTS50194` | Falta `microsoft.tenantId` en `config.json` (o está vacío) y la app es de inquilino único. | Poner el Id. de directorio de AIC (paso 1.5). La app ya avisa esto en "Falta configurar la aplicación". |
| `AADSTS9002326` | La dirección se registró como plataforma **Web** en vez de **SPA**. | Borrarla de "Web" y agregarla en "Aplicación de página única". |
| `AADSTS50105` "no está asignado" | Se activó "¿Se requiere asignación?" y la persona no está en el grupo. | Agregarla en Aplicaciones empresariales → Usuarios y grupos. |
| **"Se necesita aprobación del administrador"** (*Need admin approval*), `AADSTS65001`, `AADSTS90093`, `AADSTS90094`, `AADSTS900941` o la app dice *"Tu organización exige que un administrador apruebe el permiso de lectura de archivos (Files.Read.All)…"* (la persona entra, pero el Excel no carga) | Se pide `Files.Read.All` y en la empresa los usuarios no pueden aprobar permisos por su cuenta (o una directiva lo impide). | Un administrador: **Entra ID → Registros de aplicaciones → Buscador de centros de negocio → Permisos de API**. Revisar que `Files.Read.All` (delegado) **esté en la lista** (si no, agregarlo: pasos 2.1–2.3) y pulsar **Conceder consentimiento de administrador** (paso 2.4). Luego cada persona pulsa "Volver a iniciar sesión" (o "Cerrar sesión" y entra de nuevo). |
| `AADSTS65004` o *"No se aprobaron los permisos de la app…"* | La persona canceló la pantalla de permisos, o **pidió la aprobación al administrador** (*admin consent workflow*) y volvió a la app antes de que se la dieran. | Si la pidió: el administrador la aprueba (Entra ID → Aplicaciones empresariales → **Solicitudes de consentimiento de administrador**, o el paso 2.4) y la persona vuelve a iniciar sesión. Si canceló: volver a iniciar sesión y aceptar (es solo lectura). |
| `AADSTS700016` | `clientId` incorrecto o de otro tenant. | Revisar `config.json`. |
| `AADSTS50020` | La cuenta es de otro tenant y no fue invitada. | Ver recuadro "¿Y Jaicos?" (invitar como B2B). |
| "Tu cuenta no tiene acceso" | El **nombre de inicio de sesión (UPN)** no termina en un dominio permitido (o el tenant no está en la lista). | Revisar `dominiosPermitidos` / `tenantsPermitidos`. Confirmar con el administrador cómo es el UPN del personal (paso 5). |
| "Tu cuenta no tiene permiso para abrir el Excel" (403) a **una** persona | A esa persona no le compartieron el Excel. | Paso 4.2. |
| "Tu cuenta no tiene permiso para abrir el Excel" (403) a **todas** | El permiso `Files.Read.All` no alcanza para abrir por enlace (`urlCompartida`). | Usar `driveId` + `itemId` (paso 4.3, forma A). |
| *"No se pudo ver las bibliotecas de documentos del sitio de SharePoint…"* (403) | Con la dirección del navegador (forma C), Graph no dejó listar las bibliotecas del sitio: a **una** persona, porque no tiene acceso a ese sitio; a **todas**, porque `Files.Read.All` no alcanza para esa consulta *(por confirmar, paso 2)*. | A una persona: darle lectura (4.2). A todas: fijar `driveId` + `itemId` (forma A, sacados con el Probador de Graph) o agregar `Sites.Read.All` (delegado) con consentimiento de administrador. |
| "No se encontró el Excel" (404) | El archivo se movió, se volvió a crear, el enlace cambió, o no está compartido con la persona. | Volver a sacar los identificadores / el enlace (4.3) y revisar permisos. |
| "No se encontró el Excel "<nombre>" en SharePoint (…)" | Con la dirección del navegador (forma C) la app buscó el archivo en las bibliotecas del sitio y no lo vio con esa cuenta: no tiene acceso, lo renombraron o lo llevaron a otro sitio. | Abrir el Excel en SharePoint con esa misma cuenta; si no lo ve, darle acceso de lectura (4.2). Si lo renombraron o movieron, copiar de nuevo la dirección del navegador en `datos.urlCompartida`. Si es un archivo recién subido, esperar unos minutos. |
| "Se encontraron N archivos llamados …, pero ninguno es el del enlace" | Hay copias con el mismo nombre y ninguna tiene el identificador del enlace. | Copiar de nuevo la dirección del navegador del Excel correcto, o fijar `driveId` + `itemId` (forma A). |
| "No se pudo descargar el Excel desde SharePoint/OneDrive" | Graph encontró el archivo pero la descarga falló (red, o un bloqueo del navegador/proxy de la empresa). | Reintentar; si sigue, revisar que el proxy o la política de seguridad permitan `*.sharepoint.com`. |
| "N celdas tienen una fórmula sin resultado guardado" | El bot escribe fórmulas sin calcularlas. | Abrir y guardar el Excel en Excel, o que el bot escriba valores (paso 4.1). |
| "Falta configurar la aplicación" | Falta un dato en `config.json` o tiene la forma equivocada. | La pantalla dice qué corregir. Paso 5. |
| "No se encontraron estas columnas en el Excel" | Los títulos del Excel real tienen otros nombres, o se leyó otra hoja. | Agregar los nombres en `columnas`, fijar `filaEncabezado` o elegir la hoja en `datos.hoja` (el aviso muestra las hojas del Excel). |
| PowerShell: "…npm.ps1 no se puede cargar…" | La política de ejecución de PowerShell bloquea scripts. | Recuadro "PowerShell bloquea npm o swa" (paso 6). |
| `npm run test:e2e`: "Executable doesn't exist… run npx playwright install" | En esa PC no está el navegador de pruebas. | `npx playwright install chromium` (una vez). |

---

## Seguridad: qué protege qué

| Capa | Qué hace | ¿Es seguridad real? |
|---|---|---|
| Registro de la app como **inquilino único** (+ invitados B2B) | Solo cuentas del tenant de AIC (y las invitadas) pueden iniciar sesión. | ✅ Sí (lo controla Microsoft). |
| **¿Se requiere asignación? = Sí** (opcional) | Solo los usuarios/grupos elegidos. | ✅ Sí (lo controla Microsoft). |
| **Permisos del Excel en SharePoint** + permisos **delegados** | Cada persona solo puede leer el Excel si se lo compartieron. | ✅ Sí: es la protección principal de los datos. |
| Revisión del **dominio** y de **`tenantsPermitidos`** en la app | Muestra "Tu cuenta no tiene acceso" y borra la sesión local. | ⚠️ Solo comodidad: corre en el navegador del usuario y alguien con conocimientos podría saltársela. Por eso existen las capas de arriba. |
| **CSP** + "escapar" los datos | Si una celda del Excel trajera código, no se ejecuta. | ✅ Protege a los usuarios de datos raros en el Excel. |
| Solo el bot puede **editar** el Excel (paso 4.2) | Nadie más puede reemplazarlo por un archivo "trampa". | ✅ Necesario mientras se use SheetJS 0.18.5 (ver abajo). |

Otros puntos:
- `clientId`, `tenantId`, `driveId`, `itemId` y el enlace del Excel **no son secretos** (están en `config.json`, que cualquiera puede ver). Lo que protege los datos son los permisos de Microsoft 365.
- La app **no tiene** contraseñas ni "secretos de cliente" y **no pide permisos de escritura**.
- **Requisito antes de producción:** la librería que lee Excel (SheetJS `xlsx` 0.18.5, la que está en npm) tiene dos avisos de seguridad de nivel **alto** (`npm audit`: "prototype pollution" y "ReDoS") que se activan al abrir un Excel **hecho a propósito para atacar**. Como la app abre el Excel de SharePoint en el navegador de cada usuario, cualquiera con permiso de edición sobre ese archivo podría aprovecharlo. Hay que **actualizarla a la versión 0.20.x** (se descarga del sitio oficial `https://cdn.sheetjs.com/`, no de npm) y, mientras tanto, dejar el permiso de edición **solo a la cuenta del bot** (paso 4.2).
