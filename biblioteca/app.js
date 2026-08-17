// Biblioteca de Contenido — Mejora Continua
// Paso 2 del handoff: interfaz e interacción completas, datos en memoria
// (fotos/categorías/álbumes todavía no persisten — eso es el Paso 3).
"use strict";

// ---------- Datos base ----------
const DEFAULT_CATS = ["Trabajo con clientes", "Eventos y talleres", "Entrevistas", "Detrás de escena", "Capacitaciones", "Asociados (otras ciudades)", "Participaciones", "Notas periodísticas", "Menciones"];

const STAGES = [
  { key: "biblioteca", label: "En biblioteca" },
  { key: "confirmada", label: "Confirmada" },
  { key: "programada", label: "Programada" },
  { key: "publicada", label: "Publicada" },
];

const ICONS = {
  library: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>',
  quick: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 19V5"></path><path d="M5 12l7-7 7 7"></path></svg>',
  batch: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
  compose: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>',
  manual: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"></path></svg>',
  list: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>',
  thumb: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>',
  large: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  upload: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
  pencil: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"></path></svg>',
  trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  folder: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>',
  search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
  chevronL: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>',
  chevronR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>',
  help: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  plug: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 2v6"></path><path d="M15 2v6"></path><path d="M6 8h12v3a6 6 0 01-12 0z"></path><path d="M12 17v5"></path></svg>',
};

const TUTORIAL_STEPS = [
  { screen: "library", title: "Bienvenida a tu Línea de tiempo", body: "Acá entra todo lo que sacás — talleres, clientes, notas — y acá seguís su recorrido completo: de la biblioteca a etiquetada, programada y publicada. No reemplaza nada de lo que ya funciona: se suma como fuente." },
  { screen: "library", title: "Etiquetas, no carpetas únicas", body: "Una foto puede ser \"Capacitaciones\" y \"Trabajo con clientes\" a la vez. Elegí la vista — lista, miniaturas o íconos grandes — según cómo te resulte más cómodo mirar." },
  { screen: "library", title: "Álbumes por evento", body: "\"Taller en Chapadmalal\", \"13 años del primer after\" — un álbum agrupa fotos de un mismo momento, cruzando las etiquetas de arriba. Es otra forma de mirar lo mismo, no una jerarquía." },
  { screen: "library", title: "Cuatro etapas, una sola vista", body: "Filtrá por En biblioteca, Confirmada, Programada o Publicada. Programada y Publicada muestran datos de ejemplo del Monitor, siempre marcados como tal — la publicación real vive en esa herramienta." },
  { screen: "calendar", title: "Calendario de publicaciones", body: "Mirá de un vistazo lo que ya se publicó (rojo) y lo que está programado (azul). Tocá cualquier publicación para modificarla, reprogramarla a otra fecha o borrarla. Son datos de ejemplo del Monitor por ahora." },
  { screen: "quick", title: "Día a día: carga rápida", body: "Algo te llega por WhatsApp o Drive — lo soltás acá, sin fricción. El sistema propone etiquetas al toque; las confirmás con un toque." },
  { screen: "batch", title: "En bloque: después de un evento", body: "Subís la tanda entera y el sistema propone álbum y etiquetas para todas. Vos revisás y confirmás rápido — no escribís de cero." },
  { screen: "batch", title: "Propuesta vs. confirmada", body: "Ese detalle importa: cada corrección tuya queda guardada y ajusta la próxima propuesta. Con el tiempo vas a corregir cada vez menos." },
  { screen: "compose", title: "Tres formas de armar una pieza", body: "Foto con texto para un momento puntual, collage para 2 a 4 fotos de un álbum, cartel para una idea sin foto. La Regla de Oro: mucho blanco, color como puntuación." },
  { screen: "library", title: "Listo para empezar", body: "Cuantas más veces corrijas, menos vas a tener que corregir. Este manual queda siempre a un toque de distancia en el menú." },
];

const MANUAL_ITEMS = [
  { title: "Qué es y qué no es", content: "Es la puerta de entrada de fotos, video (guardado, sin usar todavía) y capturas hacia el sistema de Stories. No es un tablero de métricas ni sugerencias de IA — eso viene después, con semanas de datos reales. Tampoco rescata el archivo histórico completo: el foco es de hoy hacia atrás." },
  { title: "Cómo aprende el sistema", content: "No es un clasificador fijo. Arranca corrigiéndolo mucho vos, y cada corrección — una etiqueta que cambiás, un álbum que renombrás — queda guardada como señal para la próxima propuesta. Con el tiempo, el sistema propone bien y vos solo supervisás." },
  { title: "Etiquetas y álbumes", content: "Una pieza puede tener varias etiquetas a la vez — nunca se fuerza una sola categoría. Un álbum agrupa fotos de un evento o proyecto puntual, cruzando esas etiquetas — es una agrupación aparte, no una jerarquía." },
  { title: "Carga rápida vs. sesión en bloque", content: "Día a día: algo llega por WhatsApp o Drive, se sube rápido, sin fricción. En bloque: una tanda grande después de un evento se organiza en una sesión aparte, con el sistema proponiendo y vos confirmando rápido." },
  { title: "Tipos de pieza", content: "Foto con texto para un momento puntual. Collage para 2 a 4 fotos del mismo álbum. Cartel para una frase o idea sin foto, jugando con tipografía grande y el trazo del isotipo — nunca con más color saturado." },
  { title: "Línea de tiempo: de biblioteca a publicada", content: "Biblioteca y Monitor convergen en una sola vista: cada pieza se ve entrando, etiquetada, programada y publicada, sin cambiar de pantalla. Programada y Publicada muestran datos de ejemplo del Monitor real, siempre marcados como tal." },
  { title: "Cómo se conecta con Stories", content: "El sistema elige solo qué pieza usar cada día. Después de publicada, podés pedir que se cambie o regenere — incluso ya publicada. Lo que haya que borrar de una red social, lo borrás vos ahí directamente." },
];

const NAV_DEFS = [
  { key: "library", label: "Línea de tiempo", icon: ICONS.library },
  { key: "calendar", label: "Calendario", icon: ICONS.calendar },
  { key: "quick", label: "Carga rápida", icon: ICONS.quick },
  { key: "batch", label: "Sesión", icon: ICONS.batch },
  { key: "compose", label: "Armar pieza", icon: ICONS.compose },
  { key: "manual", label: "Manual", icon: ICONS.manual },
];

const SCREEN_TITLES = { library: "Línea de tiempo", calendar: "Calendario", quick: "Carga rápida", batch: "Sesión", compose: "Armar pieza", manual: "Manual" };

// Las 5 dimensiones del Manual de Marca — mapean 1:1 a las carpetas de
// content/inbox/<oferta>/ que consume el motor de story. Distinto de las
// categorías editoriales (que son etiquetas libres).
// "Sociales" agregada 2026-08-17 (Taller de la Oferta, respuesta real de
// Pablo y Sindy) — edición puntual de esta lista, no una reescritura de la
// app (ver CLAUDE.md, Fase 5, decisión de no reescribir la Biblioteca).
const DIMENSIONS = [
  { key: "personal", label: "Personal" },
  { key: "organizacional", label: "Organizacional" },
  { key: "comercial", label: "Comercial" },
  { key: "empresarial", label: "Empresarial" },
  { key: "profesionalizacion", label: "Profesionalización" },
  { key: "sociales", label: "Sociales" },
];

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// ---------- Utilidades ----------
function escapeAttr(str) {
  return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeHtml(str) { return escapeAttr(str); }
function uid(prefix) { return (prefix || "id") + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ---------- Estado ----------
const state = {
  screen: "library", viewMode: "thumb",
  // items arranca con la data de demo (seed-demo.js) si está cargada; en el
  // Paso 3 se reemplaza por la fuente real y el fallback vuelve a [].
  items: (typeof window !== "undefined" && window.__SEED_ITEMS) ? window.__SEED_ITEMS() : [],
  categoryFilters: [], albumFilter: null, search: "", stageFilter: "todo",
  categories: [...DEFAULT_CATS], editingCategory: null, editCategoryDraft: "", addingCategory: false, newCategoryDraft: "",
  previewId: null, draft: null, toast: null, lastSnapshot: null,
  batchSelected: [], batchAlbumName: "",
  composeMode: "photo", composeCollageStyle: "grid", composeSelection: [], composeCaptions: {},
  composeKicker: "", composeHeadline: "", composeSubtext: "",
  composePositions: {},
  tutorialActive: false, tutorialStep: 0, tutorialSeen: false,
  calYear: null, calMonth: null, calSelectedId: null, calDraftWhen: "",
  ghModalOpen: false, ghTokenDraft: "", ghChecking: false, ghStatus: null, ghUser: null,
  uploadDimension: "personal",
};

let _toastTimer = null;
let _reposition = null; // { id, startX, startY, startPosX, startPosY, rectW, rectH }

// ================================================================
// App — expuesto en window para los handlers inline (drag/drop, inputs)
// ================================================================
const App = { state };

App.isMobile = function () { return window.matchMedia("(max-width: 900px)").matches; };

App.setState = function (patch) {
  Object.assign(state, patch);
  render();
};

// ---------- Navegación / filtros ----------
App.setScreen = function (screen) { App.setState({ screen, previewId: null }); };
App.setViewMode = function (v) { App.setState({ viewMode: v }); };
App.toggleCategoryFilter = function (cat) {
  const on = state.categoryFilters.includes(cat);
  App.setState({ categoryFilters: on ? state.categoryFilters.filter((c) => c !== cat) : [...state.categoryFilters, cat] });
};
App.setAlbumFilter = function (album) { App.setState({ albumFilter: album, screen: "library" }); };
App.clearAlbumFilter = function () { App.setState({ albumFilter: null }); };
App.setStageFilter = function (stage) { App.setState({ stageFilter: stage }); };
App.goToNewAlbum = function () { App.setState({ screen: "batch", batchAlbumName: "" }); };

// ---------- Categorías ----------
App.startEditCategory = function (cat) { App.setState({ editingCategory: cat, editCategoryDraft: cat }); };
App.updateEditCategoryDraft = function (val) { state.editCategoryDraft = val; };
App.cancelEditCategory = function () { App.setState({ editingCategory: null, editCategoryDraft: "" }); };
App.saveEditCategory = function () {
  const oldName = state.editingCategory;
  const newName = state.editCategoryDraft.trim();
  if (!newName || newName === oldName) return App.cancelEditCategory();
  App.setState({
    categories: state.categories.map((c) => (c === oldName ? newName : c)),
    items: state.items.map((it) => ({ ...it, categories: it.categories.map((c) => (c === oldName ? newName : c)) })),
    categoryFilters: state.categoryFilters.map((c) => (c === oldName ? newName : c)),
    editingCategory: null, editCategoryDraft: "",
  });
  App.pushToast("Categoría renombrada", `"${oldName}" ahora es "${newName}".`, "info");
};
App.deleteCategory = function (cat) {
  const snap = App.snapshot();
  App.setState({
    categories: state.categories.filter((c) => c !== cat),
    items: state.items.map((it) => ({ ...it, categories: it.categories.filter((c) => c !== cat) })),
    categoryFilters: state.categoryFilters.filter((c) => c !== cat),
    lastSnapshot: snap,
  });
  App.pushToast("Categoría eliminada", `"${cat}" ya no está disponible.`, "info", true);
};
App.openAddCategory = function () { App.setState({ addingCategory: true, newCategoryDraft: "" }); };
App.updateNewCategoryDraft = function (val) { state.newCategoryDraft = val; };
App.confirmAddCategory = function () {
  const name = state.newCategoryDraft.trim();
  if (!name) return App.setState({ addingCategory: false });
  App.setState({ categories: state.categories.includes(name) ? state.categories : [...state.categories, name], addingCategory: false, newCategoryDraft: "" });
};

// ---------- Filtrado ----------
App.matchesFilters = function (it) {
  if (state.albumFilter && it.album !== state.albumFilter) return false;
  if (state.stageFilter !== "todo" && it.stage !== state.stageFilter) return false;
  if (state.categoryFilters.length && !state.categoryFilters.some((c) => it.categories.includes(c))) return false;
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    const hay = [it.title, it.album, it.context, ...it.categories].filter(Boolean).join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
};

// ---------- Toast / undo ----------
App.snapshot = function () { return JSON.stringify({ items: state.items, categories: state.categories }); };
App.pushToast = function (title, description, tone, undoable) {
  state.toast = { title, description, tone: tone || "info", undoable: !!undoable };
  renderToast();
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { state.toast = null; renderToast(); }, 4200);
};
App.dismissToast = function () { clearTimeout(_toastTimer); state.toast = null; renderToast(); };
App.undoLast = function () {
  if (!state.lastSnapshot) return;
  const prev = JSON.parse(state.lastSnapshot);
  App.setState({ items: prev.items, categories: prev.categories, lastSnapshot: null, toast: null });
  renderToast();
};

// ---------- Preview / draft ----------
App.openPreview = function (id) {
  const it = state.items.find((x) => x.id === id);
  if (!it) return;
  state.previewId = id;
  state.draft = { categories: [...it.categories], album: it.album || "", context: it.context || "" };
  render();
};
App.closePreview = function () { App.setState({ previewId: null, draft: null }); };
App.updateDraftContext = function (val) { state.draft.context = val; };
App.updateDraftAlbum = function (val) { state.draft.album = val; };
App.toggleDraftCategory = function (cat) {
  const has = state.draft.categories.includes(cat);
  state.draft.categories = has ? state.draft.categories.filter((c) => c !== cat) : [...state.draft.categories, cat];
  renderOverlay();
};
App.saveDraft = function () {
  const snap = App.snapshot();
  const id = state.previewId;
  const draft = state.draft;
  App.setState({
    items: state.items.map((it) => (it.id === id ? { ...it, categories: draft.categories, album: draft.album || null, context: draft.context || null, proposed: false } : it)),
    previewId: null, draft: null, lastSnapshot: snap,
  });
  App.pushToast("Corrección guardada", "El sistema aprende de esto para la próxima propuesta.", "success", true);
};
App.quickConfirm = function (id) {
  const snap = App.snapshot();
  App.setState({ items: state.items.map((it) => (it.id === id ? { ...it, proposed: false } : it)), lastSnapshot: snap });
  App.pushToast("Confirmado", "Etiquetas y álbum quedaron como están.", "success", true);
};
// Borrar una pieza desde la card (X arriba-izquierda). Con deshacer.
App.deleteItem = function (e, id) {
  if (e) e.stopPropagation();
  const it = state.items.find((x) => x.id === id);
  const snap = App.snapshot();
  App.setState({ items: state.items.filter((x) => x.id !== id), lastSnapshot: snap });
  App.pushToast("Foto eliminada", it ? `"${it.title}" se quitó de la biblioteca.` : "", "info", true);
};
// Guardar/confirmar rápido desde la card (✓ arriba-derecha).
App.confirmItem = function (e, id) {
  if (e) e.stopPropagation();
  const it = state.items.find((x) => x.id === id);
  if (it && !it.proposed) { App.pushToast("Ya estaba confirmada", `"${it.title}" no tenía cambios pendientes.`, "info"); return; }
  App.quickConfirm(id);
};

// ---------- Carga de archivos ----------
function randomCategory() { return state.categories[Math.floor(Math.random() * state.categories.length)]; }
App.setUploadDimension = function (dim) { App.setState({ uploadDimension: dim }); };

// Nombre de archivo único y seguro para el repo: <fecha-hora>-<base>.<ext>
function safeFilename(name) {
  const extMatch = name.match(/\.[a-z0-9]+$/i);
  const ext = (extMatch ? extMatch[0] : ".jpg").toLowerCase();
  let base = name.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "foto";
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const rnd = Math.random().toString(36).slice(2, 5);
  return `${stamp}-${rnd}-${base}${ext}`;
}

function dimLabel(key) { const d = DIMENSIONS.find((x) => x.key === key); return d ? d.label : key; }
// Actualiza el estado de subida de una card sin perder foco/scroll si se puede.
function renderItemStatus(id) {
  const it = state.items.find((x) => x.id === id);
  const el = document.querySelector(`.up-status[data-id="${id}"]`);
  if (el && it) { el.outerHTML = uploadStatusHTML(it); return; }
  render();
}
function uploadStatusHTML(it) {
  if (!it.uploadState || it.uploadState === "pending") {
    if (it.persisted) return `<span class="up-status saved" data-id="${escapeAttr(it.id)}" title="Guardada en el repo">${ICONS.check} En el repo</span>`;
    return `<span class="up-status" data-id="${escapeAttr(it.id)}"></span>`;
  }
  if (it.uploadState === "uploading") return `<span class="up-status uploading" data-id="${escapeAttr(it.id)}">Guardando…</span>`;
  if (it.uploadState === "saved") return `<span class="up-status saved" data-id="${escapeAttr(it.id)}" title="${escapeAttr(it.repoPath || "")}">${ICONS.check} En el repo</span>`;
  if (it.uploadState === "error") return `<span class="up-status error" data-id="${escapeAttr(it.id)}" title="${escapeAttr(it.uploadError || "")}">⚠ No se guardó</span>`;
  return `<span class="up-status" data-id="${escapeAttr(it.id)}"></span>`;
}

// Commit de una foto ya cargada en memoria al repo (content/inbox/<dim>/).
App.persistPhoto = async function (id) {
  const it = state.items.find((x) => x.id === id);
  if (!it || !it.filename) return;
  if (typeof GH === "undefined" || !GH.isConnected()) return;
  it.uploadState = "uploading"; renderItemStatus(id);
  try {
    await GH.commitPhoto(it.dimension, it.filename, it.img);
    it.uploadState = "saved"; it.persisted = true; it.repoPath = `content/inbox/${it.dimension}/${it.filename}`;
  } catch (e) {
    it.uploadState = "error"; it.uploadError = e.message || "Error al guardar";
  }
  renderItemStatus(id);
};

App.addFiles = function (fileList, targetAlbum) {
  const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  const connected = typeof GH !== "undefined" && GH.isConnected();
  const dimension = state.uploadDimension || "personal";
  const snap = App.snapshot();
  let done = 0;
  const newIds = [];
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const guess = randomCategory();
      const id = uid("up");
      newIds.push(id);
      state.items = [{
        id, title: file.name.replace(/\.[a-z0-9]+$/i, ""), categories: guess ? [guess] : [],
        album: targetAlbum || null, context: null, proposed: true, date: "hoy", img: reader.result, pos: "50% 50%", stage: "biblioteca", stageMeta: null,
        dimension, filename: safeFilename(file.name), persisted: false, uploadState: connected ? "pending" : null, when: null,
      }, ...state.items];
      done++;
      if (done === files.length) {
        state.lastSnapshot = snap;
        render();
        if (connected) {
          App.pushToast(`${files.length} foto${files.length > 1 ? "s" : ""} — guardando en el repo…`, `Dimensión: ${dimLabel(dimension)}. Se están commiteando a content/inbox/.`, "info");
          newIds.forEach((nid) => App.persistPhoto(nid));
        } else {
          App.pushToast(`${files.length} foto${files.length > 1 ? "s" : ""} subida${files.length > 1 ? "s" : ""} (en memoria)`, "Conectá GitHub para guardarlas de verdad en el repo.", "info", true);
        }
      } else {
        render();
      }
    };
    reader.readAsDataURL(file);
  });
};

App.onFileInput = function (e, zone) {
  const album = zone === "batch" ? state.batchAlbumName.trim() || null : null;
  App.addFiles(e.target.files, album);
  e.target.value = "";
};
App.onDrop = function (e, zone) {
  e.preventDefault();
  e.currentTarget.classList.remove("active");
  const album = zone === "batch" ? state.batchAlbumName.trim() || null : null;
  App.addFiles(e.dataTransfer.files, album);
};
App.onDragOver = function (e) { e.preventDefault(); e.currentTarget.classList.add("active"); };
App.onDragLeave = function (e) { e.preventDefault(); e.currentTarget.classList.remove("active"); };

// ---------- Sesión / batch ----------
App.updateBatchAlbumName = function (val) {
  state.batchAlbumName = val;
  renderBatchDynamic();
};
App.toggleBatchSelect = function (id) {
  state.batchSelected = state.batchSelected.includes(id) ? state.batchSelected.filter((x) => x !== id) : [...state.batchSelected, id];
  renderBatchDynamic();
};
App.confirmBatch = function (ids) {
  const snap = App.snapshot();
  App.setState({ items: state.items.map((it) => (ids.includes(it.id) ? { ...it, proposed: false } : it)), batchSelected: [], lastSnapshot: snap });
  App.pushToast("Sesión revisada", `${ids.length} piezas confirmadas de una vez.`, "success", true);
};

// ---------- Armar pieza / compose ----------
App.setComposeMode = function (m) { App.setState({ composeMode: m, composeSelection: [] }); };
App.setCollageStyle = function (v) { App.setState({ composeCollageStyle: v }); };
App.toggleComposeSelect = function (id) {
  let sel = state.composeSelection.includes(id) ? state.composeSelection.filter((x) => x !== id) : [...state.composeSelection, id];
  if (state.composeMode === "photo" || state.composeMode === "solo") sel = state.composeSelection.includes(id) ? [] : [id];
  App.setState({ composeSelection: sel });
};
App.removeComposeSelection = function (id) {
  const captions = { ...state.composeCaptions }; delete captions[id];
  const positions = { ...state.composePositions }; delete positions[id];
  App.setState({ composeSelection: state.composeSelection.filter((x) => x !== id), composeCaptions: captions, composePositions: positions });
};
App.composeAddFiles = function (fileList) {
  const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  let newIds = []; let done = 0;
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const id = uid("up");
      newIds.push(id);
      state.items = [{ id, title: file.name.replace(/\.[a-z0-9]+$/i, ""), categories: [], album: null, context: null, proposed: true, date: "hoy", img: reader.result, pos: "50% 50%", stage: "biblioteca", stageMeta: null }, ...state.items];
      done++;
      if (done === files.length) {
        state.composeSelection = (state.composeMode === "photo" || state.composeMode === "solo") ? [newIds[newIds.length - 1]] : [...state.composeSelection, ...newIds];
        render();
      } else {
        render();
      }
    };
    reader.readAsDataURL(file);
  });
};
App.onComposeFileInput = function (e) { App.composeAddFiles(e.target.files); e.target.value = ""; };
App.onComposeDrop = function (e) { e.preventDefault(); e.currentTarget.classList.remove("active"); App.composeAddFiles(e.dataTransfer.files); };

App.updateComposeKicker = function (val) { state.composeKicker = val; updateComposeLiveText(); };
App.updateComposeHeadline = function (val) { state.composeHeadline = val; updateComposeLiveText(); };
App.updateComposeSubtext = function (val) { state.composeSubtext = val; updateComposeLiveText(); };
App.updateComposeCaption = function (id, val) { state.composeCaptions[id] = val; updateComposeLiveText(); };

App.composeGenerate = function () { App.pushToast("Pieza generada", "Vista previa lista para revisar y publicar.", "success"); };

App.getComposePos = function (it) {
  const raw = state.composePositions[it.id] || it.pos || "50% 50%";
  const parts = raw.replace(/%/g, "").trim().split(/\s+/).map(Number);
  return { x: isNaN(parts[0]) ? 50 : parts[0], y: isNaN(parts[1]) ? 50 : parts[1] };
};
App.startReposition = function (e, id) {
  e.preventDefault();
  const it = state.items.find((i) => i.id === id);
  if (!it) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const { x, y } = App.getComposePos(it);
  _reposition = { id, startX: e.clientX, startY: e.clientY, startPosX: x, startPosY: y, rectW: rect.width, rectH: rect.height };
  e.currentTarget.classList.add("dragging");
  window.addEventListener("mousemove", onRepositionMove);
  window.addEventListener("mouseup", onRepositionEnd);
};
function onRepositionMove(e) {
  if (!_reposition) return;
  const dx = e.clientX - _reposition.startX, dy = e.clientY - _reposition.startY;
  const dxPct = (dx / _reposition.rectW) * 100, dyPct = (dy / _reposition.rectH) * 100;
  const nx = Math.max(0, Math.min(100, _reposition.startPosX - dxPct));
  const ny = Math.max(0, Math.min(100, _reposition.startPosY - dyPct));
  const posStr = nx.toFixed(0) + "% " + ny.toFixed(0) + "%";
  state.composePositions[_reposition.id] = posStr;
  document.querySelectorAll('.draggable-img[data-id="' + _reposition.id + '"]').forEach((img) => { img.style.objectPosition = posStr; });
}
function onRepositionEnd() {
  document.querySelectorAll(".draggable-img.dragging").forEach((img) => img.classList.remove("dragging"));
  _reposition = null;
  window.removeEventListener("mousemove", onRepositionMove);
  window.removeEventListener("mouseup", onRepositionEnd);
}

// ---------- Conexión con GitHub (Paso 3) ----------
App.openGhModal = function () {
  App.setState({ ghModalOpen: true, ghTokenDraft: "", ghStatus: null, ghUser: (typeof GH !== "undefined" && GH.isConnected()) ? "conectado" : null });
};
App.closeGhModal = function () { App.setState({ ghModalOpen: false, ghTokenDraft: "", ghStatus: null }); };
App.updateGhTokenDraft = function (val) { state.ghTokenDraft = val; };
App.saveGhToken = async function () {
  const t = (state.ghTokenDraft || "").trim();
  if (!t) { App.setState({ ghStatus: { ok: false, msg: "Pegá un token para conectar." } }); return; }
  GH.setToken(t);
  App.setState({ ghChecking: true, ghStatus: null });
  const r = await GH.whoami();
  if (r.ok) {
    App.setState({ ghChecking: false, ghUser: r.login, ghStatus: { ok: true, msg: `Conectado como ${r.login}` + (r.canWrite ? "" : " — pero el token NO tiene permiso de escritura sobre el repo") } });
    App.pushToast("GitHub conectado", `Sesión iniciada como ${r.login}.`, "success");
  } else {
    GH.setToken("");
    App.setState({ ghChecking: false, ghUser: null, ghStatus: { ok: false, msg: r.error } });
  }
};
App.disconnectGh = function () {
  GH.setToken("");
  App.setState({ ghUser: null, ghStatus: null, ghTokenDraft: "" });
  App.pushToast("GitHub desconectado", "El token se borró de este navegador.", "info");
};

// ---------- Calendario ----------
function calEnsureMonth() {
  if (state.calYear == null || state.calMonth == null) {
    const now = new Date();
    state.calYear = now.getFullYear();
    state.calMonth = now.getMonth();
  }
}
App.calPrevMonth = function () {
  let m = state.calMonth - 1, y = state.calYear;
  if (m < 0) { m = 11; y--; }
  App.setState({ calMonth: m, calYear: y });
};
App.calNextMonth = function () {
  let m = state.calMonth + 1, y = state.calYear;
  if (m > 11) { m = 0; y++; }
  App.setState({ calMonth: m, calYear: y });
};
App.calToday = function () {
  const now = new Date();
  App.setState({ calMonth: now.getMonth(), calYear: now.getFullYear() });
};
App.openCalEntry = function (id) {
  const it = state.items.find((x) => x.id === id);
  if (!it) return;
  App.setState({ calSelectedId: id, calDraftWhen: it.when || "" });
};
App.closeCalEntry = function () { App.setState({ calSelectedId: null, calDraftWhen: "" }); };
App.updateCalDraftWhen = function (val) { state.calDraftWhen = val; };
App.saveCalEntry = function () {
  const id = state.calSelectedId;
  const it = state.items.find((x) => x.id === id);
  if (!it) return App.closeCalEntry();
  const snap = App.snapshot();
  const when = state.calDraftWhen || null;
  // Si la nueva fecha es a futuro, queda "programada"; si es hoy o pasado, "publicada".
  let stage = it.stage, stageMeta = it.stageMeta;
  if (when) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(when + "T00:00:00");
    stage = d > today ? "programada" : "publicada";
    stageMeta = App.calRelLabel(when);
  }
  App.setState({
    items: state.items.map((x) => (x.id === id ? { ...x, when, stage, stageMeta } : x)),
    calSelectedId: null, calDraftWhen: "", lastSnapshot: snap,
  });
  App.pushToast("Publicación actualizada", "Se reprogramó en el calendario.", "success", true);
};
App.deleteCalEntry = function () {
  const id = state.calSelectedId;
  const it = state.items.find((x) => x.id === id);
  const snap = App.snapshot();
  App.setState({ items: state.items.filter((x) => x.id !== id), calSelectedId: null, calDraftWhen: "", lastSnapshot: snap });
  App.pushToast("Publicación eliminada", it ? `"${it.title}" se quitó del calendario.` : "", "info", true);
};
App.modifyCalEntry = function () {
  const id = state.calSelectedId;
  App.setState({ calSelectedId: null, calDraftWhen: "" });
  App.openPreview(id);
};
App.calRelLabel = function (iso) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1) return "En " + diff + " días";
  return "Hace " + Math.abs(diff) + " días";
};

// ---------- Manual / tutorial ----------
App.toggleAccordion = function (idx) {
  state._openAccordion = state._openAccordion === idx ? null : idx;
  render();
};
App.startTutorial = function () {
  const st = TUTORIAL_STEPS[0];
  App.setState({ tutorialActive: true, tutorialStep: 0, screen: st.screen, previewId: null });
};
App.nextTutorial = function () {
  const n = state.tutorialStep + 1;
  if (n >= TUTORIAL_STEPS.length) return App.setState({ tutorialActive: false });
  const st = TUTORIAL_STEPS[n];
  App.setState({ tutorialStep: n, screen: st.screen });
};
App.prevTutorial = function () {
  const n = Math.max(0, state.tutorialStep - 1);
  const st = TUTORIAL_STEPS[n];
  App.setState({ tutorialStep: n, screen: st.screen });
};
App.closeTutorial = function () { App.setState({ tutorialActive: false }); };
App.focusMobileSearch = function () {
  const el = document.getElementById("lib-search-mobile");
  if (el) el.focus();
};

App.setSearchLive = function (val) {
  state.search = val;
  const mobile = App.isMobile();
  const filtered = state.items.filter(App.matchesFilters);
  const grid = document.getElementById("lib-grid");
  if (grid) grid.innerHTML = gridHTML(filtered, mobile);
  const count = document.getElementById("lib-count");
  if (count) count.textContent = `${filtered.length} piezas · de la Biblioteca a publicada`;
};
App.confirmBatchSelected = function () { App.confirmBatch(state.batchSelected); };
App.confirmBatchAll = function () {
  const batchAlbum = state.batchAlbumName.trim();
  const ids = state.items.filter((i) => i.album === batchAlbum).map((i) => i.id);
  App.confirmBatch(ids);
};

// ================================================================
// Render — componentes compartidos
// ================================================================
function stepperHTML(it) {
  let idx = STAGES.findIndex((s) => s.key === it.stage);
  if (idx < 0) idx = 0;
  const isSimulated = it.stage === "programada" || it.stage === "publicada";
  const isPublished = it.stage === "publicada";
  const dots = STAGES.map((st, i) => {
    const width = i === idx ? 14 : 8;
    const bg = i > idx ? "var(--gray-100)" : (st.key === "publicada" ? "var(--red-500)" : "var(--color-primary)");
    return `<span style="width:${width}px;height:4px;border-radius:99px;background:${bg};"></span>`;
  }).join("");
  const label = STAGES[idx].label + (it.stageMeta ? " · " + escapeHtml(it.stageMeta) : "") + (idx === 0 && it.proposed ? " (propuesta)" : "");
  return `<div class="stepper">
    <div class="stepper-dots">${dots}</div>
    <div class="stepper-label-row">
      <span class="stepper-label ${isPublished ? "published" : ""}">${label}</span>
      ${isPublished ? '<span class="stepper-pub-dot"></span>' : ""}
      ${isSimulated ? '<span class="stepper-sim-badge">Dato de ejemplo · Monitor</span>' : ""}
    </div>
  </div>`;
}

function cardHTML(it, size) {
  const isList = size === "list";
  const h = size === "large" ? 210 : size === "thumb" ? 150 : 56;
  const imgStyle = isList ? `width:56px;height:${h}px;flex:0 0 auto;` : `height:${h}px;`;
  const actions = `<div class="card-actions">
      <button type="button" class="card-action-btn del" title="Borrar" aria-label="Borrar" onclick="App.deleteItem(event,'${escapeAttr(it.id)}')">${ICONS.x}</button>
      <button type="button" class="card-action-btn save ${it.proposed ? "" : "done"}" title="${it.proposed ? "Guardar / confirmar" : "Confirmada"}" aria-label="Guardar" onclick="App.confirmItem(event,'${escapeAttr(it.id)}')">${ICONS.check}</button>
    </div>`;
  return `<div class="card ${isList ? "list" : ""}" onclick="App.openPreview('${escapeAttr(it.id)}')" role="button" tabindex="0">
    <div class="card-img" style="${imgStyle}">${isList ? "" : actions}<img src="${escapeAttr(it.img)}" style="object-position:${escapeAttr(it.pos)}"></div>
    <div class="card-meta">
      <div class="card-title">${escapeHtml(it.title)}</div>
      ${stepperHTML(it)}
      ${it.album ? `<div class="card-album">${escapeHtml(it.album)}</div>` : ""}
      ${it.dimension ? `<div class="card-dim"><span class="dim-tag">${escapeHtml(dimLabel(it.dimension))}</span>${uploadStatusHTML(it)}</div>` : ""}
    </div>
    ${isList ? actions : ""}
  </div>`;
}

function dropzoneHTML(zone, compact) {
  return `<div class="dropzone ${compact ? "compact" : ""}" ondrop="App.onDrop(event,'${zone}')" ondragover="App.onDragOver(event)" ondragleave="App.onDragLeave(event)" onclick="document.getElementById('file-${zone}').click()">
    <div class="dropzone-icon">${ICONS.upload}</div>
    <div class="dropzone-title">Arrastrá tus fotos acá</div>
    <div class="dropzone-sub">De WhatsApp, Drive o donde estén — subí varias juntas</div>
    <input type="file" id="file-${zone}" multiple accept="image/*" style="display:none" onchange="App.onFileInput(event,'${zone}')">
  </div>`;
}
function composeDropzoneHTML() {
  return `<div class="dropzone mini" ondrop="App.onComposeDrop(event)" ondragover="App.onDragOver(event)" ondragleave="App.onDragLeave(event)" onclick="document.getElementById('file-compose').click()">
    Arrastrá fotos reales acá o tocá para elegir del dispositivo
    <input type="file" id="file-compose" multiple accept="image/*" style="display:none" onchange="App.onComposeFileInput(event)">
  </div>`;
}

function viewToggleHTML() {
  return `<div class="view-toggle">${["list", "thumb", "large"].map((v) => `<button type="button" class="${state.viewMode === v ? "active" : ""}" onclick="App.setViewMode('${v}')">${ICONS[v]}</button>`).join("")}</div>`;
}
function stageTabsHTML() {
  const tabs = [{ key: "todo", label: "Todo" }, ...STAGES];
  return `<div class="stage-tabs">${tabs.map((t) => {
    const count = t.key === "todo" ? state.items.length : state.items.filter((i) => i.stage === t.key).length;
    const active = state.stageFilter === t.key;
    return `<button type="button" class="stage-tab ${active ? "active" : ""}" onclick="App.setStageFilter('${t.key}')">${escapeHtml(t.label)} · ${count}</button>`;
  }).join("")}</div>`;
}
function gridHTML(filtered, mobile) {
  if (!filtered.length) return `<div class="empty-state">No hay piezas con estos filtros.</div>`;
  if (state.viewMode === "list") return `<div class="list-view">${filtered.map((it) => cardHTML(it, "list")).join("")}</div>`;
  const cols = mobile ? (state.viewMode === "large" ? 1 : 2) : (state.viewMode === "large" ? 3 : 4);
  return `<div class="grid-view" style="grid-template-columns:repeat(${cols},1fr)">${filtered.map((it) => cardHTML(it, state.viewMode)).join("")}</div>`;
}

// ---------- Sidebar / mobile chrome ----------
function navRowHTML(n) {
  const active = state.screen === n.key;
  return `<button type="button" class="nav-row ${active ? "active" : ""}" onclick="App.setScreen('${n.key}')"><span class="ico">${n.icon}</span>${escapeHtml(n.label)}</button>`;
}
function buildAlbumGrid() {
  const albums = [...new Set(state.items.map((i) => i.album).filter(Boolean))];
  const tiles = albums.map((a) => {
    const items_ = state.items.filter((i) => i.album === a);
    const cover = items_[0] ? `<img src="${escapeAttr(items_[0].img)}" style="object-position:${escapeAttr(items_[0].pos)}">` : ICONS.folder;
    const active = state.albumFilter === a;
    return `<button type="button" class="album-tile ${active ? "active" : ""}" data-album-action data-album="${escapeAttr(a)}">
      <div class="album-cover">${cover}</div>
      <span class="album-name">${escapeHtml(a)}</span>
      <span class="album-count">${items_.length} piezas</span>
    </button>`;
  }).join("");
  const newTile = `<button type="button" class="album-tile new" onclick="App.goToNewAlbum()">
    <div class="album-cover">${ICONS.plus}</div>
    <span class="album-name">Álbum nuevo</span>
  </button>`;
  return `<div class="album-grid">${tiles}${newTile}</div>`;
}
function buildCategoryList() {
  const rows = state.categories.map((c) => {
    if (state.editingCategory === c) {
      return `<div class="cat-row">
        <input class="cat-input" value="${escapeAttr(state.editCategoryDraft)}" oninput="App.updateEditCategoryDraft(this.value)" onkeydown="if(event.key==='Enter')App.saveEditCategory();if(event.key==='Escape')App.cancelEditCategory();">
        <button type="button" class="cat-edit-btn" onclick="App.saveEditCategory()">${ICONS.check}</button>
        <button type="button" class="cat-edit-btn" onclick="App.cancelEditCategory()">${ICONS.x}</button>
      </div>`;
    }
    const checked = state.categoryFilters.includes(c);
    return `<div class="cat-row">
      <div class="cat-check ${checked ? "on" : ""}" data-cat-action="toggle" data-cat="${escapeAttr(c)}">${checked ? ICONS.check : ""}</div>
      <button type="button" class="cat-name" data-cat-action="toggle" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>
      <button type="button" class="cat-edit-btn" data-cat-action="edit" data-cat="${escapeAttr(c)}">${ICONS.pencil}</button>
      <button type="button" class="cat-edit-btn" data-cat-action="delete" data-cat="${escapeAttr(c)}">${ICONS.trash}</button>
    </div>`;
  }).join("");
  const addRow = state.addingCategory
    ? `<div class="cat-row">
        <input class="cat-input" value="${escapeAttr(state.newCategoryDraft)}" placeholder="Nueva categoría" oninput="App.updateNewCategoryDraft(this.value)" onkeydown="if(event.key==='Enter')App.confirmAddCategory();">
        <button type="button" class="cat-edit-btn" onclick="App.confirmAddCategory()">${ICONS.check}</button>
      </div>`
    : `<button type="button" class="cat-add-btn" onclick="App.openAddCategory()">${ICONS.plus} Nueva categoría</button>`;
  return `<div class="cat-list">${rows}${addRow}</div>`;
}
function ghStatusButtonHTML() {
  const connected = typeof GH !== "undefined" && GH.isConnected();
  return `<button type="button" class="icon-btn gh-status ${connected ? "on" : ""}" title="${connected ? "GitHub conectado" : "Conectar con GitHub"}" aria-label="Conexión con GitHub" onclick="App.openGhModal()">
    ${ICONS.plug}<span class="gh-dot ${connected ? "on" : ""}"></span>
  </button>`;
}
function buildSidebar() {
  return `
    <div class="sidebar-brand">
      <div class="sidebar-brand-mark">
        <img src="assets/lockup-horizontal-color.png" alt="Mejora Continua">
        <div class="brand-dots"><span class="d-red"></span><span class="d-yellow"></span></div>
      </div>
      <div class="sidebar-brand-actions">
        ${ghStatusButtonHTML()}
        <button type="button" class="icon-btn" title="Ver tutorial" aria-label="Ver tutorial" onclick="App.startTutorial()">${ICONS.help}</button>
      </div>
    </div>
    <div class="nav-list">${NAV_DEFS.map(navRowHTML).join("")}</div>
    <div class="side-section">
      <div class="side-section-head">
        <span class="side-label">Álbumes</span>
        <button type="button" class="link-quiet ${state.albumFilter ? "on" : ""}" onclick="App.clearAlbumFilter()">Ver todos</button>
      </div>
      ${buildAlbumGrid()}
    </div>
    <div class="side-section">
      <div class="side-label">Categorías</div>
      ${buildCategoryList()}
    </div>
  `;
}
function buildMobileHeader() {
  return `
    <div class="mobile-header-brand"><img src="assets/isotipo-color.png" alt=""><div class="brand-dots"><span class="d-red"></span><span class="d-yellow"></span></div></div>
    <div class="mobile-header-title">${escapeHtml(SCREEN_TITLES[state.screen])}</div>
    <div style="display:flex;gap:4px;">
      ${ghStatusButtonHTML()}
      <button type="button" class="icon-btn" title="Ver tutorial" aria-label="Ver tutorial" onclick="App.startTutorial()">${ICONS.help}</button>
      <button type="button" class="icon-btn" title="Buscar" onclick="App.focusMobileSearch()">${ICONS.search}</button>
    </div>
  `;
}
function buildMobileNav() {
  return NAV_DEFS.map((n) => {
    const active = state.screen === n.key;
    return `<button type="button" class="mobile-nav-item ${active ? "active" : ""}" onclick="App.setScreen('${n.key}')"><span class="ico">${n.icon}</span><span class="lbl">${escapeHtml(n.label)}</span></button>`;
  }).join("");
}

// ---------- Pantalla: Línea de tiempo ----------
function buildLibraryScreen(mobile) {
  const filtered = state.items.filter(App.matchesFilters);
  const title = escapeHtml(state.albumFilter || "Línea de tiempo");
  const searchMobile = mobile ? `<input id="lib-search-mobile" class="lib-search mobile" placeholder="Buscar…" value="${escapeAttr(state.search)}" oninput="App.setSearchLive(this.value)">` : "";
  const headerSearch = !mobile ? `<input class="lib-search" placeholder="Buscar por etiqueta, álbum o contexto" value="${escapeAttr(state.search)}" oninput="App.setSearchLive(this.value)">` : "";
  return `
    ${searchMobile}
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div class="lib-top" style="${mobile ? "flex-direction:column;align-items:stretch;" : ""}">
        <div style="flex:1 1 auto;min-width:0;">
          <div class="screen-title ${mobile ? "mobile" : ""}" style="white-space:nowrap;">${title}</div>
          <div class="screen-sub" id="lib-count">${filtered.length} piezas · de la Biblioteca a publicada</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-shrink:0;">
          ${headerSearch}
          ${viewToggleHTML()}
        </div>
      </div>
      ${stageTabsHTML()}
      ${(state.stageFilter === "programada" || state.stageFilter === "publicada") ? `<div class="notice-box">Estas piezas muestran datos de ejemplo del Monitor — la publicación y programación reales viven en esa herramienta, no acá.</div>` : ""}
    </div>
    <div id="lib-grid">${gridHTML(filtered, mobile)}</div>
  `;
}

// ---------- Pantalla: Calendario ----------
function calItemsByDate() {
  const map = {};
  state.items.forEach((it) => {
    if (!it.when) return;
    (map[it.when] = map[it.when] || []).push(it);
  });
  return map;
}
function calChipHTML(it) {
  const cls = it.stage === "publicada" ? "published" : "scheduled";
  return `<button type="button" class="cal-chip ${cls}" title="${escapeAttr(it.title)}" onclick="event.stopPropagation();App.openCalEntry('${escapeAttr(it.id)}')">
    <img src="${escapeAttr(it.img)}" style="object-position:${escapeAttr(it.pos)}">
    <span class="cal-chip-txt">${escapeHtml(it.title)}</span>
  </button>`;
}
function buildCalendarScreen(mobile) {
  calEnsureMonth();
  const y = state.calYear, m = state.calMonth;
  const byDate = calItemsByDate();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const todayIso = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes primero
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  let cells = "";
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    if (!inMonth) { cells += `<div class="cal-cell out"></div>`; continue; }
    const iso = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(dayNum).padStart(2, "0");
    const items_ = byDate[iso] || [];
    const isToday = iso === todayIso;
    cells += `<div class="cal-cell ${isToday ? "today" : ""}">
      <div class="cal-daynum">${dayNum}${isToday ? '<span class="cal-today-dot"></span>' : ""}</div>
      <div class="cal-chips">${items_.map(calChipHTML).join("")}</div>
    </div>`;
  }
  const totalOnCal = state.items.filter((i) => i.when).length;
  return `
    <div class="cal-top">
      <div>
        <div class="screen-title ${mobile ? "mobile" : ""}">${escapeHtml(MONTH_NAMES[m])} ${y}</div>
        <div class="screen-sub">${totalOnCal} publicaciones en el calendario · tocá una para modificar, reprogramar o borrar</div>
      </div>
      <div class="cal-nav">
        <button type="button" class="icon-btn" title="Mes anterior" onclick="App.calPrevMonth()">${ICONS.chevronL}</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="App.calToday()">Hoy</button>
        <button type="button" class="icon-btn" title="Mes siguiente" onclick="App.calNextMonth()">${ICONS.chevronR}</button>
      </div>
    </div>
    <div class="cal-legend">
      <span><span class="cal-dot scheduled"></span>Programada</span>
      <span><span class="cal-dot published"></span>Publicada</span>
      <span class="cal-legend-note">Datos de ejemplo del Monitor</span>
    </div>
    <div class="cal-weekdays">${WEEKDAY_NAMES.map((w) => `<div>${w}</div>`).join("")}</div>
    <div class="cal-grid">${cells}</div>
  `;
}

// ---------- Pantalla: Carga rápida ----------
function quickCardHTML(it) {
  const tags = it.categories.map((c) => it.proposed
    ? `<button type="button" class="quick-tag proposed" onclick="App.quickConfirm('${escapeAttr(it.id)}')">${escapeHtml(c)} · tocar para confirmar</button>`
    : `<span class="quick-tag">${escapeHtml(c)}</span>`
  ).join("");
  return `<div class="quick-card">
    <img src="${escapeAttr(it.img)}" style="object-position:${escapeAttr(it.pos)}" onclick="App.openPreview('${escapeAttr(it.id)}')">
    <div style="flex:1;min-width:0;">
      <div style="font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(it.title)}</div>
      <div class="quick-tags">${tags}</div>
    </div>
  </div>`;
}
function dimensionSelectorHTML() {
  const connected = typeof GH !== "undefined" && GH.isConnected();
  const opts = DIMENSIONS.map((d) => `<button type="button" class="dim-opt ${state.uploadDimension === d.key ? "active" : ""}" onclick="App.setUploadDimension('${d.key}')">${escapeHtml(d.label)}</button>`).join("");
  return `<div class="dim-selector">
    <div class="dim-selector-label">Dimensión del Manual de Marca <span class="dim-hint">— define la carpeta de content/inbox/ (el sistema aprenderá a proponerla)</span></div>
    <div class="dim-opts">${opts}</div>
    ${connected
      ? `<div class="dim-note connected"><span class="gh-dot on"></span> Conectado a GitHub — las fotos se guardan de verdad en el repo.</div>`
      : `<div class="dim-note">⚠ No conectado: las fotos quedan solo en memoria. <button type="button" class="link-inline" onclick="App.openGhModal()">Conectar GitHub</button></div>`}
  </div>`;
}
function buildQuickScreen(mobile) {
  const recentItems = state.items.slice(0, 6);
  const list = recentItems.length
    ? `<div style="display:flex;flex-direction:column;gap:10px;">
        ${!mobile ? `<div class="side-label">Recién llegado</div>` : ""}
        ${recentItems.map(quickCardHTML).join("")}
      </div>`
    : "";
  return `
    ${!mobile ? `<div class="screen-title">Carga rápida</div>` : ""}
    ${dimensionSelectorHTML()}
    ${dropzoneHTML("quick", mobile)}
    ${list}
  `;
}

// ---------- Pantalla: Sesión (batch) ----------
function batchCardHTML(it, mobile) {
  const h = mobile ? 110 : 140;
  const selected = state.batchSelected.includes(it.id);
  return `<div class="batch-card">
    <img src="${escapeAttr(it.img)}" style="height:${h}px;object-position:${escapeAttr(it.pos)}" onclick="App.openPreview('${escapeAttr(it.id)}')">
    <div class="batch-chk ${selected ? "on" : ""}" onclick="App.toggleBatchSelect('${escapeAttr(it.id)}')">${selected ? ICONS.check : ""}</div>
    <div class="batch-card-meta">
      <div class="card-title">${escapeHtml(it.title)}</div>
      <span class="batch-badge ${it.proposed ? "" : "confirmed"}">${it.proposed ? "Propuesta" : "Confirmada"}</span>
    </div>
  </div>`;
}
function batchDynamicParts(mobile) {
  const batchAlbum = state.batchAlbumName.trim();
  const batchItems = batchAlbum ? state.items.filter((i) => i.album === batchAlbum) : [];
  const batchConfirmed = batchItems.filter((i) => !i.proposed).length;
  const sub = batchAlbum
    ? (batchItems.length ? `${batchConfirmed} de ${batchItems.length} confirmadas` : "Soltá acá la tanda de este evento para empezar")
    : "Ponele un nombre a la sesión para empezar a subir";
  let actions = "";
  if (state.batchSelected.length > 0) actions += `<button type="button" class="btn btn-secondary btn-sm" onclick="App.confirmBatchSelected()">Confirmar seleccionadas (${state.batchSelected.length})</button>`;
  if (batchItems.length > 0) actions += `<button type="button" class="btn btn-primary btn-sm" onclick="App.confirmBatchAll()">Confirmar todo</button>`;
  const dz = dropzoneHTML("batch", mobile);
  const grid = batchItems.map((it) => batchCardHTML(it, mobile)).join("");
  return { sub, actions, dz, grid };
}
function renderBatchDynamic() {
  const mobile = App.isMobile();
  const p = batchDynamicParts(mobile);
  const sub = document.getElementById("batch-sub"); if (sub) sub.textContent = p.sub;
  const actions = document.getElementById("batch-actions"); if (actions) actions.innerHTML = p.actions;
  const dz = document.getElementById("batch-dz"); if (dz) dz.innerHTML = p.dz;
  const grid = document.getElementById("batch-grid"); if (grid) grid.innerHTML = p.grid;
}
function buildBatchScreen(mobile) {
  const p = batchDynamicParts(mobile);
  return `
    <div class="batch-head" style="${mobile ? "flex-direction:column;align-items:stretch;" : ""}">
      <div>
        <input class="batch-title-input" value="${escapeAttr(state.batchAlbumName)}" placeholder="Nombrá esta sesión (ej: Taller en Chapadmalal)" oninput="App.updateBatchAlbumName(this.value)" style="${mobile ? "width:100%;font-size:19px;" : ""}">
        <div class="screen-sub" id="batch-sub" style="margin-top:6px;">${p.sub}</div>
      </div>
      <div id="batch-actions" style="display:flex;gap:10px;">${p.actions}</div>
    </div>
    ${dimensionSelectorHTML()}
    <div id="batch-dz">${p.dz}</div>
    <div id="batch-grid" class="batch-grid" style="grid-template-columns:repeat(${mobile ? 2 : 4},1fr)">${p.grid}</div>
  `;
}

// ---------- Pantalla: Armar pieza (compose) ----------
function composeSelectedItems() { return state.items.filter((i) => state.composeSelection.includes(i.id)); }
function composeEffective() {
  const selectedItems = composeSelectedItems();
  let effectiveMode = state.composeMode;
  let noticeMsg = null;
  let displaySelection = selectedItems;
  if (state.composeMode === "collage") {
    if (selectedItems.length === 1) { effectiveMode = "photo"; noticeMsg = "Con una sola foto, se arma como Foto con texto."; }
    else if (selectedItems.length > 4) { noticeMsg = `Se usan las primeras 4 fotos elegidas — ${selectedItems.length - 4} quedaron afuera. Elegí manualmente cuáles arriba si querés otras.`; displaySelection = selectedItems.slice(0, 4); }
  }
  const isDynamicCollage = state.composeMode === "collage" && state.composeCollageStyle === "dynamic";
  const hasPhotoContent = (effectiveMode === "photo" || effectiveMode === "solo") ? !!displaySelection[0] : displaySelection.length > 0;
  const hasTextContent = isDynamicCollage ? !!state.composeHeadline.trim() : !!(state.composeKicker.trim() || state.composeHeadline.trim() || state.composeSubtext.trim());
  const canGenerate = effectiveMode === "poster" ? hasTextContent : (hasPhotoContent || hasTextContent);
  return { selectedItems, effectiveMode, noticeMsg, displaySelection, isDynamicCollage, hasPhotoContent, hasTextContent, canGenerate };
}
function composeHeadlineFallback(eff) {
  if (eff.effectiveMode === "poster") return "Escribí tu frase";
  if (eff.effectiveMode === "solo") return eff.displaySelection[0] ? eff.displaySelection[0].title : "Título acá";
  if (eff.isDynamicCollage) return "Tema o servicio";
  return eff.displaySelection[0] ? eff.displaySelection[0].title : "Tu headline acá";
}
function footerBlockHTML() {
  return `<div class="canvas-footer">
    <div class="dots"><span class="dot-r"></span><span class="dot-y"></span></div>
    <span class="mc">Mejora Continua</span>
    <span class="url">mejoraok.com</span>
  </div>`;
}
function draggableImgHTML(it) {
  const pos = App.getComposePos(it);
  return `<img class="draggable-img" data-id="${escapeAttr(it.id)}" src="${escapeAttr(it.img)}" draggable="false" ondragstart="event.preventDefault()" onmousedown="App.startReposition(event,'${escapeAttr(it.id)}')" title="Arrastrá para reposicionar" style="object-position:${pos.x}% ${pos.y}%;">`;
}
function photoCaptionHTML(it) {
  const val = state.composeCaptions[it.id] || "";
  return `<div class="photo-caption" data-caption-for="${escapeAttr(it.id)}" style="display:${val ? "" : "none"}">${escapeHtml(val)}</div>`;
}
function canvasPoster(eff) {
  const headline = state.composeHeadline.trim() || composeHeadlineFallback(eff);
  return `<div style="width:1080px;height:1920px;background:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 110px;">
    <div class="canvas-kicker canvas-kicker-text" style="display:${state.composeKicker.trim() ? "" : "none"}">${escapeHtml(state.composeKicker)}</div>
    <div class="canvas-headline-text" style="font-family:var(--font-display);font-weight:500;font-size:104px;line-height:1.1;color:#1A3D84;margin-bottom:28px;">${escapeHtml(headline)}</div>
    <div class="canvas-rule"></div>
    <div class="canvas-subtext-text" style="display:${state.composeSubtext.trim() ? "" : "none"};font-family:var(--font-heading-alt);font-weight:400;font-size:46px;line-height:1.4;color:#2B2B2B;max-width:860px;margin-bottom:60px;">${escapeHtml(state.composeSubtext)}</div>
    ${footerBlockHTML()}
  </div>`;
}
function canvasSolo(eff) {
  const img = eff.displaySelection[0];
  const photoArea = `<div style="width:1080px;height:1300px;background:#F3F4F6;flex:0 0 auto;overflow:hidden;">${img ? draggableImgHTML(img) : `<div class="canvas-empty">Elegí o subí una foto</div>`}</div>`;
  const headline = state.composeHeadline.trim() || composeHeadlineFallback(eff);
  return `<div style="width:1080px;height:1920px;background:#fff;display:flex;flex-direction:column;">
    ${photoArea}
    <div style="flex:1;padding:64px 96px 0;display:flex;flex-direction:column;">
      <div class="canvas-headline-text" style="font-family:var(--font-display);font-weight:500;font-size:104px;line-height:1.1;color:#1A3D84;margin-bottom:28px;">${escapeHtml(headline)}</div>
      <div class="canvas-rule"></div>
      <div style="flex:1;"></div>
      ${footerBlockHTML()}
    </div>
  </div>`;
}
function canvasPhotoOrCollage(eff) {
  let photoArea;
  if (eff.effectiveMode === "photo") {
    const img = eff.displaySelection[0];
    photoArea = `<div style="width:1080px;height:1060px;background:#F3F4F6;flex:0 0 auto;overflow:hidden;">${img ? draggableImgHTML(img) : `<div class="canvas-empty">Elegí o subí una foto</div>`}</div>`;
  } else if (eff.isDynamicCollage) {
    const main = eff.displaySelection[0];
    const rest = eff.displaySelection.slice(1);
    if (!main) {
      photoArea = `<div style="width:1080px;height:1060px;display:flex;background:#fff;"><div class="canvas-empty" style="flex:1;">Elegí de 2 a 4 fotos del mismo álbum</div></div>`;
    } else {
      photoArea = `<div style="width:1080px;height:1060px;display:flex;gap:6px;background:#fff;">
        <div style="position:relative;flex:0 0 62%;overflow:hidden;">${draggableImgHTML(main)}${photoCaptionHTML(main)}</div>
        ${rest.length ? `<div style="flex:1;display:flex;flex-direction:column;gap:6px;">${rest.map((it) => `<div style="position:relative;flex:1;overflow:hidden;">${draggableImgHTML(it)}${photoCaptionHTML(it)}</div>`).join("")}</div>` : ""}
      </div>`;
    }
  } else {
    const n = eff.displaySelection.length;
    const rows = n <= 2 ? "1fr" : "1fr 1fr";
    if (!n) {
      photoArea = `<div style="width:1080px;height:1060px;display:grid;background:#fff;"><div class="canvas-empty">Elegí de 2 a 4 fotos del mismo álbum</div></div>`;
    } else {
      const cells = eff.displaySelection.map((it, i) => {
        const spanStyle = (n === 3 && i === 0) ? "grid-column:1/2;grid-row:1/3;" : "";
        return `<div style="position:relative;overflow:hidden;${spanStyle}">${draggableImgHTML(it)}${photoCaptionHTML(it)}</div>`;
      }).join("");
      photoArea = `<div style="width:1080px;height:1060px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:${rows};gap:6px;background:#fff;">${cells}</div>`;
    }
  }
  const headline = state.composeHeadline.trim() || composeHeadlineFallback(eff);
  let panel;
  if (eff.isDynamicCollage) {
    panel = `
      <div class="canvas-headline-text" style="font-family:var(--font-display);font-weight:500;font-size:82px;line-height:1.1;color:#1A3D84;margin-bottom:20px;">${escapeHtml(headline)}</div>
      <div class="canvas-rule" style="margin-bottom:20px;"></div>
      <div class="canvas-subtext-text" style="display:${state.composeSubtext.trim() ? "" : "none"};font-family:var(--font-heading-alt);font-weight:400;font-size:42px;line-height:1.3;color:#2B2B2B;">${escapeHtml(state.composeSubtext)}</div>
    `;
  } else {
    panel = `
      <div class="canvas-kicker canvas-kicker-text" style="display:${state.composeKicker.trim() ? "" : "none"}">${escapeHtml(state.composeKicker)}</div>
      <div class="canvas-headline-text" style="font-family:var(--font-display);font-weight:500;font-size:82px;line-height:1.1;color:#1A3D84;margin-bottom:28px;">${escapeHtml(headline)}</div>
      <div class="canvas-rule"></div>
      <div class="canvas-subtext-text" style="display:${state.composeSubtext.trim() ? "" : "none"};font-family:var(--font-heading-alt);font-weight:400;font-size:42px;line-height:1.4;color:#2B2B2B;max-width:860px;">${escapeHtml(state.composeSubtext)}</div>
    `;
  }
  return `<div style="width:1080px;height:1920px;background:#fff;display:flex;flex-direction:column;">
    ${photoArea}
    <div style="flex:1;padding:88px 96px 0;display:flex;flex-direction:column;">
      ${panel}
      <div style="flex:1;"></div>
      ${footerBlockHTML()}
    </div>
  </div>`;
}
function canvasHTML(eff) {
  if (eff.effectiveMode === "poster") return canvasPoster(eff);
  if (eff.effectiveMode === "solo") return canvasSolo(eff);
  return canvasPhotoOrCollage(eff);
}
function piecePreviewHTML(eff) {
  const CW = 1080, CH = 1920, SCALE = 230 / 1080;
  return `<div class="piece-preview" style="width:${CW * SCALE}px;height:${CH * SCALE}px;">
    <div style="width:${CW}px;height:${CH}px;transform:scale(${SCALE});transform-origin:top left;">${canvasHTML(eff)}</div>
  </div>`;
}
function composeTabsHTML() {
  const tabAccents = { photo: "var(--color-primary)", collage: "var(--red-500)", solo: "var(--yellow-500)", poster: "var(--color-primary)" };
  const tabs = [["photo", "Foto con texto"], ["collage", "Collage"], ["solo", "Foto simple"], ["poster", "Frase manual"]];
  return `<div class="compose-tabs">${tabs.map(([k, l]) => {
    const active = state.composeMode === k;
    return `<button type="button" class="compose-tab ${active ? "active" : ""}" style="border-bottom-color:${active ? tabAccents[k] : "transparent"}" onclick="App.setComposeMode('${k}')"><span class="compose-tab-dot" style="background:${tabAccents[k]}"></span>${escapeHtml(l)}</button>`;
  }).join("")}</div>`;
}
function collageStyleToggleHTML() {
  if (state.composeMode !== "collage") return "";
  const opts = [["grid", "Grilla"], ["dynamic", "Dinámico"]];
  return `<div class="collage-style-toggle">${opts.map(([k, l]) => `<button type="button" class="${state.composeCollageStyle === k ? "active" : ""}" onclick="App.setCollageStyle('${k}')">${escapeHtml(l)}</button>`).join("")}</div>`;
}
function pickerHTML(mobile) {
  const cols = mobile ? 4 : 5;
  const items = state.items.map((it) => {
    const selected = state.composeSelection.includes(it.id);
    return `<div class="picker-item ${selected ? "selected" : ""}" onclick="App.toggleComposeSelect('${escapeAttr(it.id)}')">
      <img src="${escapeAttr(it.img)}" style="object-position:${escapeAttr(it.pos)}">
      ${selected ? `<div class="picker-item-ov">${ICONS.check}</div>` : ""}
    </div>`;
  }).join("");
  return `<div class="picker-grid" style="grid-template-columns:repeat(${cols},1fr)">${items}</div>`;
}
function selectedStripHTML(eff) {
  if (state.composeMode === "poster") return "";
  const thumbs = eff.selectedItems.map((it) => `<div class="selected-thumb">
    <img src="${escapeAttr(it.img)}" style="object-position:${escapeAttr(it.pos)}">
    <button type="button" class="rm" onclick="App.removeComposeSelection('${escapeAttr(it.id)}')">${ICONS.x}</button>
  </div>`).join("");
  return `<div class="selected-strip">${thumbs}<button type="button" class="selected-add" onclick="document.getElementById('file-compose').click()">${ICONS.plus}</button></div>`;
}
function captionInputsHTML(eff) {
  if (eff.effectiveMode !== "collage" || !eff.displaySelection.length) return "";
  return `<div class="fields-col">${eff.displaySelection.map((it) => `<input class="caption-input" placeholder="Etiqueta opcional para &quot;${escapeAttr(it.title)}&quot; (2-4 palabras)" value="${escapeAttr(state.composeCaptions[it.id] || "")}" oninput="App.updateComposeCaption('${escapeAttr(it.id)}',this.value)">`).join("")}</div>`;
}
function textFieldsPanelHTML(eff) {
  if (eff.isDynamicCollage) {
    return `<div class="fields-col">
      <input class="field-input" placeholder="Tema o servicio (headline, azul)" value="${escapeAttr(state.composeHeadline)}" oninput="App.updateComposeHeadline(this.value)">
      <input class="field-input" placeholder="Cliente (línea chica debajo)" value="${escapeAttr(state.composeSubtext)}" oninput="App.updateComposeSubtext(this.value)">
    </div>`;
  }
  if (state.composeMode === "solo") {
    return `<div class="fields-col"><input class="field-input" placeholder="Título (headline, 104px)" value="${escapeAttr(state.composeHeadline)}" oninput="App.updateComposeHeadline(this.value)"></div>`;
  }
  return `<div class="fields-col">
    <input class="field-input" placeholder="Kicker (rojo, mayúsculas)" value="${escapeAttr(state.composeKicker)}" oninput="App.updateComposeKicker(this.value)">
    <input class="field-input" placeholder="Headline" value="${escapeAttr(state.composeHeadline)}" oninput="App.updateComposeHeadline(this.value)">
    <input class="field-input" placeholder="Subtexto" value="${escapeAttr(state.composeSubtext)}" oninput="App.updateComposeSubtext(this.value)">
  </div>`;
}
function updateComposeLiveText() {
  const eff = composeEffective();
  const headline = state.composeHeadline.trim() || composeHeadlineFallback(eff);
  document.querySelectorAll(".canvas-headline-text").forEach((el) => { el.textContent = headline; });
  document.querySelectorAll(".canvas-kicker-text").forEach((el) => { el.textContent = state.composeKicker; el.style.display = state.composeKicker.trim() ? "" : "none"; });
  document.querySelectorAll(".canvas-subtext-text").forEach((el) => { el.textContent = state.composeSubtext; el.style.display = state.composeSubtext.trim() ? "" : "none"; });
  Object.keys(state.composeCaptions).forEach((id) => {
    const val = state.composeCaptions[id] || "";
    document.querySelectorAll('[data-caption-for="' + id + '"]').forEach((el) => { el.textContent = val; el.style.display = val ? "" : "none"; });
  });
  document.querySelectorAll(".gen-btn").forEach((el) => { el.disabled = !eff.canGenerate; });
  document.querySelectorAll(".gen-why-text").forEach((el) => { el.style.display = eff.canGenerate ? "none" : ""; });
}
function buildComposeScreen(mobile) {
  const eff = composeEffective();
  return `
    <div class="screen-title ${mobile ? "mobile" : ""}">Armar pieza</div>
    ${composeTabsHTML()}
    ${collageStyleToggleHTML()}
    ${eff.noticeMsg ? `<div class="notice-box">${escapeHtml(eff.noticeMsg)}</div>` : ""}
    <div class="compose-body" style="${mobile ? "flex-direction:column;align-items:center;" : ""}">
      <div class="compose-left" style="${mobile ? "width:100%;" : ""}">
        ${state.composeMode !== "poster" ? composeDropzoneHTML() : ""}
        ${state.composeMode !== "poster" ? `<div><div class="picker-label">${(state.composeMode === "photo" || state.composeMode === "solo") ? "Elegí una foto" : "Elegí de 2 a 4 fotos"}</div>${pickerHTML(mobile)}</div>` : ""}
        ${selectedStripHTML(eff)}
        ${captionInputsHTML(eff)}
        ${textFieldsPanelHTML(eff)}
        <div class="gen-row">
          <button type="button" class="btn btn-primary btn-md gen-btn" ${eff.canGenerate ? "" : "disabled"} onclick="App.composeGenerate()">Generar pieza</button>
          <span class="gen-why-text" style="display:${eff.canGenerate ? "none" : ""}">Subí al menos una foto o escribí un texto para generar la pieza.</span>
        </div>
      </div>
      <div class="compose-right">${piecePreviewHTML(eff)}</div>
    </div>
  `;
}

// ---------- Pantalla: Manual ----------
function buildManualScreen(mobile) {
  const items = MANUAL_ITEMS.map((it, i) => {
    const open = state._openAccordion === i;
    return `<div class="accordion-item">
      <button type="button" class="accordion-head" onclick="App.toggleAccordion(${i})">${escapeHtml(it.title)}<span class="plus">${open ? "–" : "+"}</span></button>
      ${open ? `<div class="accordion-body">${escapeHtml(it.content)}</div>` : ""}
    </div>`;
  }).join("");
  return `
    <div class="screen-title ${mobile ? "mobile" : ""}">Manual</div>
    <button type="button" class="btn btn-secondary btn-sm manual-cta" onclick="App.startTutorial()">Ver tutorial interactivo</button>
    <div class="accordion">${items}</div>
  `;
}

// ---------- Overlays ----------
function previewOverlayHTML() {
  const it = state.items.find((i) => i.id === state.previewId);
  if (!it) return "";
  const chips = state.categories.map((c) => {
    const on = state.draft.categories.includes(c);
    return `<button type="button" class="chip ${on ? "on" : ""}" data-cat-action="draft-toggle" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`;
  }).join("");
  return `<div class="overlay" onclick="if(event.target===this)App.closePreview()">
    <div class="overlay-panel" onclick="event.stopPropagation()">
      <div class="overlay-img"><img src="${escapeAttr(it.img)}" style="object-position:${escapeAttr(it.pos)}"></div>
      <div class="overlay-form">
        <div class="overlay-top">
          <div class="overlay-title">${escapeHtml(it.title)}</div>
          <button type="button" class="overlay-close" onclick="App.closePreview()">${ICONS.x}</button>
        </div>
        <span class="badge-pill ${it.proposed ? "" : "confirmed"}">${it.proposed ? "Propuesta por el sistema" : "Confirmada por vos"}</span>
        ${stepperHTML(it)}
        <div>
          <div class="side-label" style="margin-bottom:8px;">Etiquetas</div>
          <div class="chip-list">${chips}</div>
        </div>
        <label class="field-label">Álbum<input value="${escapeAttr(state.draft.album)}" placeholder="Sin álbum" oninput="App.updateDraftAlbum(this.value)"></label>
        <label class="field-label">Contexto (lo que solo vos sabés)<textarea rows="3" placeholder="Ej: 13 años del primer after" oninput="App.updateDraftContext(this.value)">${escapeHtml(state.draft.context)}</textarea></label>
        <div class="overlay-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="App.closePreview()">Cancelar</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="App.saveDraft()">Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}
function calEntryModalHTML() {
  const it = state.items.find((x) => x.id === state.calSelectedId);
  if (!it) return "";
  const isPub = it.stage === "publicada";
  return `<div class="overlay" onclick="if(event.target===this)App.closeCalEntry()">
    <div class="overlay-panel cal-modal" onclick="event.stopPropagation()">
      <div class="overlay-img"><img src="${escapeAttr(it.img)}" style="object-position:${escapeAttr(it.pos)}"></div>
      <div class="overlay-form">
        <div class="overlay-top">
          <div class="overlay-title">${escapeHtml(it.title)}</div>
          <button type="button" class="overlay-close" onclick="App.closeCalEntry()">${ICONS.x}</button>
        </div>
        <span class="badge-pill ${isPub ? "confirmed" : ""}">${isPub ? "Publicada" : "Programada"}${it.stageMeta ? " · " + escapeHtml(it.stageMeta) : ""}</span>
        <span class="stepper-sim-badge" style="width:fit-content;">Dato de ejemplo · Monitor</span>
        ${it.album ? `<div class="card-album">${escapeHtml(it.album)}</div>` : ""}
        <label class="field-label">Fecha de publicación
          <input type="date" value="${escapeAttr(state.calDraftWhen)}" oninput="App.updateCalDraftWhen(this.value)">
        </label>
        <div class="cal-modal-hint">Cambiar la fecha reprograma la pieza. Si es a futuro queda <b>programada</b>; si es hoy o pasado, <b>publicada</b>.</div>
        <div class="overlay-actions cal-modal-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="App.deleteCalEntry()">Borrar</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="App.modifyCalEntry()">Modificar pieza</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="App.saveCalEntry()">Guardar</button>
        </div>
      </div>
    </div>
  </div>`;
}
function ghModalHTML() {
  const connected = typeof GH !== "undefined" && GH.isConnected();
  const patUrl = "https://github.com/settings/tokens?type=beta";
  const status = state.ghStatus;
  return `<div class="overlay" onclick="if(event.target===this)App.closeGhModal()">
    <div class="overlay-panel gh-modal" onclick="event.stopPropagation()">
      <div class="overlay-form" style="flex:1 1 100%;">
        <div class="overlay-top">
          <div class="overlay-title">Conectar con GitHub</div>
          <button type="button" class="overlay-close" onclick="App.closeGhModal()">${ICONS.x}</button>
        </div>
        <div class="gh-intro">Para guardar fotos y datos <b>de verdad</b> en el repo, la Biblioteca usa un <b>token personal</b> tuyo de GitHub. El token queda <b>solo en este navegador</b> (nunca se sube ni se comparte).</div>
        ${connected ? `<div class="gh-connected"><span class="gh-dot on"></span> Conectado${state.ghUser && state.ghUser !== "conectado" ? " como <b>" + escapeHtml(state.ghUser) + "</b>" : ""}.</div>` : ""}
        <ol class="gh-steps">
          <li>Abrí <a href="${patUrl}" target="_blank" rel="noopener">github.com/settings/tokens</a> → <b>Generate new token</b> (fine-grained).</li>
          <li>En <b>Repository access</b> elegí <b>Only select repositories</b> → <b>${GH.owner}/${GH.repo}</b>.</li>
          <li>En <b>Permissions → Repository → Contents</b> ponelo en <b>Read and write</b>.</li>
          <li>Generá el token, copialo y pegalo acá abajo.</li>
        </ol>
        <label class="field-label"><span>Token (empieza con <code>github_pat_</code>)</span>
          <input type="password" autocomplete="off" placeholder="github_pat_..." value="${escapeAttr(state.ghTokenDraft)}" oninput="App.updateGhTokenDraft(this.value)" onkeydown="if(event.key==='Enter')App.saveGhToken()">
        </label>
        ${status ? `<div class="gh-result ${status.ok ? "ok" : "err"}">${escapeHtml(status.msg)}</div>` : ""}
        <div class="overlay-actions">
          ${connected ? `<button type="button" class="btn btn-secondary btn-sm" onclick="App.disconnectGh()">Desconectar</button>` : ""}
          <button type="button" class="btn btn-primary btn-sm" ${state.ghChecking ? "disabled" : ""} onclick="App.saveGhToken()">${state.ghChecking ? "Verificando…" : "Conectar"}</button>
        </div>
      </div>
    </div>
  </div>`;
}
function tutorialOverlayHTML() {
  const step = TUTORIAL_STEPS[state.tutorialStep];
  const dots = TUTORIAL_STEPS.map((_, i) => `<span class="${i === state.tutorialStep ? "active" : ""}"></span>`).join("");
  return `<div class="tutorial-overlay">
    <div class="tutorial-card">
      <div class="tutorial-dots">${dots}</div>
      <div class="tutorial-title">${escapeHtml(step.title)}</div>
      <div class="tutorial-body">${escapeHtml(step.body)}</div>
      <div class="tutorial-actions">
        <button type="button" class="tutorial-skip" onclick="App.closeTutorial()">Saltar</button>
        <div class="tutorial-nav">
          ${state.tutorialStep > 0 ? `<button type="button" class="btn btn-secondary btn-sm" onclick="App.prevTutorial()">Atrás</button>` : ""}
          <button type="button" class="btn btn-primary btn-sm" onclick="App.nextTutorial()">${state.tutorialStep === TUTORIAL_STEPS.length - 1 ? "Empezar a usar" : "Siguiente"}</button>
        </div>
      </div>
    </div>
  </div>`;
}
function renderOverlay() {
  const root = document.getElementById("overlay-root");
  let html = "";
  if (state.previewId) html += previewOverlayHTML();
  if (state.calSelectedId) html += calEntryModalHTML();
  if (state.ghModalOpen) html += ghModalHTML();
  if (state.tutorialActive) html += tutorialOverlayHTML();
  root.innerHTML = html;
}
function renderToast() {
  const root = document.getElementById("toast-root");
  if (!state.toast) { root.innerHTML = ""; return; }
  const t = state.toast;
  root.innerHTML = `<div class="toast-wrap">
    <div class="toast tone-${t.tone}">
      <div style="flex:1;">
        <div class="toast-title">${escapeHtml(t.title)}</div>
        ${t.description ? `<div class="toast-desc">${escapeHtml(t.description)}</div>` : ""}
      </div>
      <button type="button" class="toast-close" onclick="App.dismissToast()">×</button>
    </div>
    ${t.undoable ? `<button type="button" class="btn btn-secondary btn-sm" onclick="App.undoLast()">Deshacer</button>` : ""}
  </div>`;
}

// ================================================================
// Render raíz
// ================================================================
function focusPendingInputs() {
  if (state.editingCategory !== null || state.addingCategory) {
    const el = document.querySelector(".cat-input");
    if (el) { el.focus(); el.select(); }
  }
}
function render() {
  const mobile = App.isMobile();
  const app = document.getElementById("app");
  app.className = mobile ? "is-mobile" : "is-desktop";
  const screenBuilders = { library: buildLibraryScreen, calendar: buildCalendarScreen, quick: buildQuickScreen, batch: buildBatchScreen, compose: buildComposeScreen, manual: buildManualScreen };
  const screenHTML = screenBuilders[state.screen](mobile);
  if (mobile) {
    app.innerHTML = `
      <div class="mobile-header">${buildMobileHeader()}</div>
      <div class="main mobile-main">${screenHTML}</div>
      <nav class="mobile-nav">${buildMobileNav()}</nav>
    `;
  } else {
    app.innerHTML = `
      <aside class="sidebar">${buildSidebar()}</aside>
      <main class="main">${screenHTML}</main>
    `;
  }
  focusPendingInputs();
  renderOverlay();
  renderToast();
}

// ---------- Delegación de eventos para categorías/álbumes ----------
document.addEventListener("click", function (e) {
  const catEl = e.target.closest("[data-cat-action]");
  if (catEl) {
    const action = catEl.dataset.catAction, cat = catEl.dataset.cat;
    if (action === "toggle") App.toggleCategoryFilter(cat);
    else if (action === "edit") App.startEditCategory(cat);
    else if (action === "delete") App.deleteCategory(cat);
    else if (action === "draft-toggle") App.toggleDraftCategory(cat);
    return;
  }
  const albEl = e.target.closest("[data-album-action]");
  if (albEl) App.setAlbumFilter(albEl.dataset.album);
});

// ---------- Init ----------
let _wasMobile = null;
function checkResize() {
  const m = App.isMobile();
  if (m !== _wasMobile) { _wasMobile = m; render(); }
}
window.addEventListener("resize", checkResize);
function tutorialAlreadySeen() {
  try { return localStorage.getItem("mc_biblioteca_tutorial_seen") === "1"; } catch (e) { return false; }
}
function markTutorialSeen() {
  try { localStorage.setItem("mc_biblioteca_tutorial_seen", "1"); } catch (e) { /* sin persistencia, no pasa nada */ }
}
document.addEventListener("DOMContentLoaded", function () {
  _wasMobile = App.isMobile();
  render();
  // Tutorial automático la primera vez (solo una vez; se puede reabrir con el botón "?").
  if (!tutorialAlreadySeen()) {
    markTutorialSeen();
    App.startTutorial();
  }
});

window.App = App;
