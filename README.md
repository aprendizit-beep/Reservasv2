# Sistema de Reservas de Espacios

Sistema web para que los empleados soliciten reservas de salas/espacios de la empresa, con validación automática de conflictos de horario, correos de confirmación/rechazo y un calendario público de disponibilidad.

## ⚠️ Lo más importante: cómo publicar un cambio

Esto es lo que más problemas trae, así que va primero.

Hay **dos formas distintas de publicar**, según qué archivo tocaste, y confundirlas es la causa más común de "hice el cambio y no pasa nada":

| Si tocaste... | Tenés que... |
|---|---|
| `app.js`, `index.html` o `styles.css` (frontend) | Hacer **commit y push** al repositorio de GitHub. Pages lo publica solo, en general en pocos minutos. |
| El **Apps Script** (`doGet`, `onFormSubmit`, correos, colores, lo que sea dentro del editor de Apps Script) | Guardar el script **no alcanza**. Tenés que ir a **Implementar → Administrar implementaciones → ícono de lápiz (editar) → Versión: "Nueva versión" → Implementar**. |

La URL pública del backend (la que termina en `/exec`) queda "congelada" en el momento en que hacés ese último paso. Si editás el código pero no creás una **nueva versión** de la implementación, la URL sigue sirviendo el código viejo — aunque en el editor se vea todo actualizado. Esto es exactamente lo que nos pasó al debuggear el problema de CORS: el código estaba bien, pero la implementación publicada no se había actualizado.

**Cómo verificar rápido que sí quedó publicado:** abrí en el navegador
```
https://script.google.com/macros/s/AKfycbw_Z-0HC_MAhYA7mW1yjo6cTgXfj7N2rKxpbiC0cPSwpqUPdy1mnQdffvgCJ24En_n8/exec?callback=test
```
Tiene que devolver `test([...]);`. Si ves solo `[...]` sin el `test(...)` envolviendo, o un comportamiento viejo, la implementación no se actualizó.

## Arquitectura

El sistema tiene 3 partes, cada una con una responsabilidad clara:

| Parte | Rol | Dónde vive |
|---|---|---|
| **Google Forms** | Formulario que llena el usuario para pedir una reserva | Enlazado desde `index.html` (iframe) |
| **Google Sheets + Apps Script** | Backend: guarda las respuestas, valida usuarios, detecta conflictos, confirma/rechaza, envía correos, expone las reservas activas como JSON | Editor de Apps Script del Sheet |
| **GitHub Pages** | Frontend: calendario visual (FullCalendar), estadísticas, filtros | Este repositorio (`index.html`, `app.js`, `styles.css`) |

El frontend se comunica con el backend por **JSONP** (no `fetch`), porque Apps Script no permite configurar cabeceras CORS y GitHub Pages es un dominio distinto. Si en algún momento hay que tocar la comunicación entre ambos, tiene que seguir siendo JSONP — no volver a `fetch()`.

## Cómo agregar una sala nueva

Hay que tocar **3 lugares**. Si te salteás alguno, la sala va a aparecer en unos lugares del sistema y en otros no.

### 1. Google Form

Abrí el formulario → editá la pregunta de "Sala" (tipo lista desplegable u opción múltiple) → agregá la nueva opción con el nombre exacto que va a tener la sala.

> ⚠️ El nombre que pongas acá tiene que ser **idéntico**, letra por letra (mayúsculas, tildes, paréntesis), al que uses en los pasos 2 y 3. Si no coinciden, la sala no va a tener color asignado y los filtros no van a funcionar para ella.

### 2. `app.js` — asignarle un color

Agregá una línea en el objeto `SALA_COLORES`, al principio del archivo:

```javascript
const SALA_COLORES = {
  "Salón Emaús":                    "#4a7c6f",
  "Salón Jericó":                   "#c8a96e",
  "Sala de juntas Peniel (Piso 1)": "#5b6abf",
  "Sala de juntas Bethel (Piso 3)": "#8e44ad",
  "Auditorio principal":            "#c0392b",
  "Mini templo Mkids":              "#16a085",
  "Casino":                         "#d35400",
  "Nombre exacto de la sala nueva": "#XXXXXX"   // 👈 agregar acá
};
```

Elegí un color hexadecimal que no se parezca a los que ya existen, para que se distinga bien en el calendario.

### 3. `index.html` — botón de filtro y leyenda

**a) Agregar un botón de filtro**, dentro del `<div class="filters">`:

```html
<button class="filter-btn" onclick="filtrarSala('Nombre exacto de la sala nueva', this)">Nombre corto</button>
```

El primer argumento de `filtrarSala(...)` tiene que ser **exactamente igual** al nombre usado en el Form y en `SALA_COLORES`. El texto del botón sí puede ser una versión corta/amigable.

**b) Agregar el ítem a la leyenda**, dentro del `<div class="legend" id="legend">`:

```html
<div class="legend-item"><div class="legend-dot" style="background:#XXXXXX"></div>Nombre corto</div>
```

Usá el mismo color hexadecimal que pusiste en `SALA_COLORES`.

### ¿Hay que tocar el Apps Script?

**No.** El backend no tiene ninguna lista fija de salas — simplemente guarda lo que el usuario eligió en el formulario y lo devuelve tal cual. Mientras el nombre coincida con los pasos 2 y 3, no hace falta tocar `doGet`, `onFormSubmit` ni ninguna otra función.

## Cómo quitar una sala

1. **Google Form**: eliminá la opción de la lista (o dejala pero marcala como "no disponible" en el nombre, para no romper reservas históricas que ya la usaron).
2. **`app.js`**: borrá su línea en `SALA_COLORES` (opcional — si la dejás no genera ningún problema, solo queda sin uso).
3. **`index.html`**: borrá su botón de filtro y su ítem de leyenda.

> No hace falta borrar nada del Google Sheet ni del Apps Script. Las reservas viejas de esa sala van a seguir mostrándose normalmente en el historial, solo que ya no se van a poder crear reservas nuevas para ella.

## Cómo cambiar el nombre de una sala existente

Esto es más delicado porque el nombre es la "clave" que conecta el Form, el Sheet, `app.js` y `index.html`.

1. Cambiá el nombre en el Google Form.
2. Actualizá esa misma clave en `SALA_COLORES` (`app.js`).
3. Actualizá el `filtrarSala('...')` correspondiente en `index.html`.

Las reservas **ya guardadas** en el Sheet con el nombre viejo van a seguir apareciendo con el nombre viejo (el Sheet no se actualiza retroactivamente). Si eso importa, hay que corregir manualmente esas filas en la pestaña "Respuestas de formulario 1", columna Sala.

## Publicar los cambios

- **Cambios en `app.js`, `index.html` o `styles.css`**: hacé commit y push al repositorio. GitHub Pages actualiza el sitio automáticamente en unos minutos.
- **Cambios en el Apps Script** (`doGet`, `onFormSubmit`, lógica de conflictos, correos, etc.): **guardar el script no alcanza**. Hay que ir a *Implementar → Administrar implementaciones → editar (ícono de lápiz) → Versión: Nueva versión → Implementar*. Si no hacés esto, la URL pública (`/exec`) sigue sirviendo el código viejo aunque lo hayas editado.

## Estados de una reserva

| Estado | Significado |
|---|---|
| `Activa` | Reserva vigente, sin conflicto (o hecha por un Pastor) |
| `Rechazada` | Había otra reserva en ese horario/sala y el solicitante no es Pastor |
| `Reemplazada` | Una reserva `Activa` fue desplazada porque un Pastor reservó encima |
| `Finalizada` | Ya pasó la hora de fin de la reserva (se marca automáticamente al recibir una nueva solicitud) |

Solo las reservas en estado `Activa` se muestran en el calendario del frontend.

## Roles

- **Usuario**: si su reserva choca con otra, se rechaza automáticamente.
- **Pastor**: puede reservar encima de una reserva existente; la reserva anterior pasa a `Reemplazada` y se le avisa por correo a la persona afectada.

Los roles se administran en la pestaña **Usuarios** del Google Sheet (columna de rol). Un usuario nuevo que nunca reservó se agrega automáticamente con rol `Usuario` la primera vez que llena el formulario.

## Apps Script — estructura del backend

### Configuración al inicio del archivo

```javascript
const CALENDAR_ID   = "...";                       // no se usa actualmente en la lógica, queda como referencia
const URL_APP        = "https://aprendizit-beep.github.io/Reservas/"; // enlace que se manda en los correos
const MODO_PRUEBA    = false;                       // true = todos los correos van a CORREO_PRUEBA en vez de al usuario real
const CORREO_PRUEBA  = "aprendiz.it@manantial.co";  // a dónde van los correos cuando MODO_PRUEBA = true
```

> **Tip:** si estás probando cambios en la lógica de correos y no querés spamear a empleados reales, poné `MODO_PRUEBA = true` antes de probar, y devolvelo a `false` (y hacé Nueva versión) antes de dejarlo en producción.

### `COL` — mapeo de columnas del Sheet

```javascript
const COL = {
  TIMESTAMP     : 0,
  CORREO        : 1,
  NOMBRE        : 2,
  APELLIDO      : 3,
  AREA          : 5,   // ⚠️ salta el 4 a propósito, revisá el orden real de columnas del Sheet antes de tocar esto
  SALA          : 6,
  FECHA         : 7,
  HORA_INICIO   : 8,
  HORA_FIN      : 9,
  ASISTENTES    : 10,
  REQUERIMIENTOS: 11,
  MESAS         : 12,
  COMENTARIOS   : 13,
  ESTADO        : 14
};
```

Esto le dice al script en qué columna (empezando en 0) está cada dato de la pestaña **Respuestas de formulario 1**. Si alguna vez reordenás preguntas en el Google Form, **el orden de las columnas en el Sheet cambia**, y hay que actualizar estos números para que coincidan — si no, el script va a leer, por ejemplo, la fecha donde debería leer la sala. Después de cualquier cambio acá: Nueva versión, obligatorio.

### Funciones principales

| Función | Qué hace |
|---|---|
| `onFormSubmit(e)` | Se dispara automáticamente cuando alguien envía el Form. Valida el usuario, busca conflictos de horario, decide el estado (`Activa`/`Rechazada`/`Reemplazada`) y envía el correo correspondiente. |
| `revisarFinalizadas(reservas)` | Recorre las reservas `Activa` y las pasa a `Finalizada` si ya pasó su hora de fin. Se llama automáticamente al inicio de cada `onFormSubmit`. |
| `doGet(e)` | Expone las reservas `Activa` como JSON (o JSONP si viene `?callback=...`). Es lo que consume `app.js` para pintar el calendario. |
| `plantillaCorreo(contenido)` / `bloqueDetalle(...)` | Arman el HTML de los correos. Si querés cambiar el diseño de los correos (colores, logo, texto fijo), es acá. |
| `parsearFechaString`, `normalizarHora`, `parsearFechaDesdeDate`, `parsearHoraDesdeDate`, `horaAMinutos` | Funciones auxiliares de formato de fecha/hora. No deberían necesitar cambios salvo que cambie el formato de respuesta del Form. |
| `marcarReservasFinalizadas()` | Versión manual de `revisarFinalizadas`, para correr desde el editor o programarla con un trigger de tiempo si en algún momento se quiere que las reservas se marquen `Finalizada` aunque no entren reservas nuevas ese día. |

### Cambios comunes y dónde hacerlos

- **Cambiar el texto o diseño de un correo**: buscá el bloque `MailApp.sendEmail({...})` correspondiente (hay 3: confirmación normal, rechazo, y aviso de reemplazo) y editá el `subject` o el HTML dentro de `htmlBody`. El diseño general (header oscuro, tarjeta blanca) vive en `plantillaCorreo()`.
- **Cambiar quién puede reemplazar reservas de otros**: hoy está hardcodeado a `rol === "Pastor"` en `onFormSubmit`. Para agregar otro rol con el mismo privilegio, cambiar esa condición (por ejemplo `rol === "Pastor" || rol === "Admin"`).
- **Cambiar la definición de "conflicto"**: está en el bucle de `onFormSubmit` bajo `// BÚSQUEDA DE CONFLICTOS` — compara `sala`, `fecha` y solapamiento de horas.
- **Cualquiera de estos cambios necesita Nueva versión de la implementación para que se vea reflejado.**
