// Url Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_Z-0HC_MAhYA7mW1yjo6cTgXfj7N2rKxpbiC0cPSwpqUPdy1mnQdffvgCJ24En_n8/exec";

// Colores por sala 
const SALA_COLORES = {
  "Salón Emaús":                    "#4a7c6f",
  "Salón Jericó":                   "#c8a96e",
  "Sala de juntas Peniel (Piso 1)": "#5b6abf",
  "Sala de juntas Bethel (Piso 3)": "#8e44ad",
  "Auditorio principal":            "#c0392b",
  "Mini templo Mkids":              "#16a085",
  "Casino":                         "#d35400"
};

// estado global
let calendar;
let todosLosEventos = [];

// Inicio 
document.addEventListener("DOMContentLoaded", () => {
  cargarEventos();
  configurarModal();
  configurarPanelResumen(); // nuevo
});

// carga de datos web
async function cargarEventos() {
  try {

    const data = await cargarEventosJSONP();

    todosLosEventos = data.map(ev => ({
      title: ev.sala,
      start: ev.start,
      end:   ev.end,
      color: SALA_COLORES[ev.sala] || "#888888",
      extendedProps: {
        sala:   ev.sala,
        nombre: ev.nombre,
        area:   ev.area
      }
    }));

    actualizarStats(todosLosEventos);
    iniciarCalendario(todosLosEventos);

    document.getElementById("loading").style.display  = "none";
    document.getElementById("calendar").style.display = "block";
    document.getElementById("legend").style.display   = "flex";

  } catch (err) {
    console.error("Error cargando reservas:", err);
    document.getElementById("loading").style.display   = "none";
    document.getElementById("error-msg").style.display = "block";
  }
}


// cargar reservas mediante JSONP
function cargarEventosJSONP() {
  return new Promise((resolve, reject) => {

    const callbackName = "reservasCallback_" + Date.now();

    const script = document.createElement("script");

    window[callbackName] = function(data) {

      delete window[callbackName];
      script.remove();

      resolve(data);
    };

    script.src = `${SCRIPT_URL}?callback=${callbackName}`;

    script.onerror = () => {

      delete window[callbackName];
      script.remove();

      reject(new Error("No se pudieron cargar las reservas"));
    };

    document.body.appendChild(script);
  });
}


// =============================================
// CALENDARIO — FULLCALENDAR
// =============================================
function iniciarCalendario(eventos) {
  const calEl = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(calEl, {
    initialView: "dayGridMonth",
    locale:      "es",
    firstDay:    0,

    headerToolbar: {
      left:   "prev,next today",
      center: "title",
      right:  "dayGridMonth,timeGridWeek,timeGridDay"
    },

    buttonText: {
      today: "Hoy",
      month: "Mes",
      week:  "Semana",
      day:   "Día"
    },

    events: eventos,

    eventClick: info => abrirModal(info.event),

    eventTimeFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
    slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: false },

    allDaySlot:   false,
    slotMinTime:  "06:00:00",
    slotMaxTime:  "22:00:00",
    height:       "auto",
    dayMaxEvents: 3,
    moreLinkText: n => `+${n} más`
  });

  calendar.render();
}

// =============================================
// FILTROS POR SALA
// =============================================
function filtrarSala(sala, btn) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const filtrados = sala === "todas"
    ? todosLosEventos
    : todosLosEventos.filter(ev => ev.extendedProps.sala === sala);

  calendar.removeAllEvents();
  calendar.addEventSource(filtrados);
}

// =============================================
// STATS
// =============================================
function actualizarStats(eventos) {
  const hoy      = new Date().toISOString().split("T")[0];
  const hoyEvs   = eventos.filter(ev => ev.start.startsWith(hoy));
  const salasHoy = new Set(hoyEvs.map(ev => ev.extendedProps.sala));

  document.getElementById("stat-total").textContent = eventos.length;
  document.getElementById("stat-hoy").textContent   = hoyEvs.length;
  document.getElementById("stat-salas").textContent = salasHoy.size;
}

// =============================================
// MODAL — DETALLE DE RESERVA
// =============================================
function configurarModal() {
  const overlay  = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("modal-close-btn");

  overlay.addEventListener("click", e => {
    if (e.target === overlay) cerrarModal();
  });

  closeBtn.addEventListener("click", cerrarModal);

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") cerrarModal();
  });
}

function abrirModal(event) {
  const props = event.extendedProps;

  const inicio = event.start.toLocaleTimeString("es-CO", {
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  const fin = event.end
    ? event.end.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";

  const fecha = event.start.toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  document.getElementById("modal-sala").textContent   = props.sala;
  document.getElementById("modal-fecha").textContent  = fecha;
  document.getElementById("modal-hora").textContent   = `${inicio} – ${fin}`;
  document.getElementById("modal-nombre").textContent = props.nombre;
  document.getElementById("modal-area").textContent   = props.area;

  document.getElementById("modal-overlay").classList.add("open");
}

function cerrarModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}

// =============================================
// PANEL RESUMEN (NUEVO)
// =============================================

// configurar cierre
function configurarPanelResumen() {
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") cerrarPanel();
  });
}

// abrir panel segun tipo
function abrirPanel(tipo) {
  const overlay = document.getElementById("modal-overlay");
  const salaEl  = document.getElementById("modal-sala");
  const fechaEl = document.getElementById("modal-fecha");
  const horaEl  = document.getElementById("modal-hora");
  const nombreEl= document.getElementById("modal-nombre");
  const areaEl  = document.getElementById("modal-area");

  const hoy = new Date().toISOString().split("T")[0];

  let contenido = "";

  if (tipo === "activas") {
    salaEl.textContent = "Reservas activas";

    todosLosEventos.forEach(ev => {
      contenido += formatearItem(ev);
    });
  }

  if (tipo === "hoy") {
    salaEl.textContent = "Reservas de hoy";

    todosLosEventos
      .filter(ev => ev.start.startsWith(hoy))
      .forEach(ev => {
        contenido += formatearItem(ev);
      });
  }

  if (tipo === "salas") {
    salaEl.textContent = "Salas ocupadas hoy";

    const conteo = {};

    todosLosEventos
      .filter(ev => ev.start.startsWith(hoy))
      .forEach(ev => {
        const sala = ev.extendedProps.sala;
        conteo[sala] = (conteo[sala] || 0) + 1;
      });

    for (let sala in conteo) {
      contenido += `
        <div style="margin-bottom:8px;">
          <strong>${sala}</strong> (${conteo[sala]})
        </div>
      `;
    }
  }

  fechaEl.innerHTML  = contenido || "Sin datos";
  horaEl.textContent = "";
  nombreEl.textContent = "";
  areaEl.textContent = "";

  overlay.classList.add("open");
}

// cerrar panel
function cerrarPanel() {
  document.getElementById("modal-overlay").classList.remove("open");
}

// formatear item
function formatearItem(ev) {
  const inicio = new Date(ev.start).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return `
    <div style="margin-bottom:10px; padding:6px; border-bottom:1px solid #ccc;">
      <strong>${ev.extendedProps.sala}</strong><br>
      ${inicio} - ${ev.extendedProps.nombre}
    </div>
  `;
}