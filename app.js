// Default-Fallbacks, falls Discovery fehlschlägt
const defaultFormats = [
  {
    key: "facebook_post_4x5",
    label: "Facebook Beitrag (4:5)",
    width: 1080,
    height: 1350,
    overlay: "overlays/facebook_post_4x5.png",
    filename: "flvw_facebook_post_1080x1350",
  },
  {
    key: "facebook_story",
    label: "Facebook Story",
    width: 1080,
    height: 1920,
    overlay: "overlays/facebook_story_1080x1920.png",
    filename: "flvw_facebook_story_1080x1920",
  },
  {
    key: "instagram_post_4x5",
    label: "Instagram Beitrag (4:5)",
    width: 1080,
    height: 1350,
    overlay: "overlays/instagram_post_4x5.png",
    filename: "flvw_instagram_post_1080x1350",
  },
  {
    key: "instagram_story",
    label: "Instagram Story",
    width: 1080,
    height: 1920,
    overlay: "overlays/instagram_story_1080x1920.png",
    filename: "flvw_instagram_story_1080x1920",
  },
  {
    key: "flvw_homepage",
    label: "FLVW Homepage (16:9)",
    width: 1920,
    height: 1080,
    overlay: "overlays/flvw_homepage_1920x1080.png",
    filename: "flvw_homepage_1920x1080",
  },
];

// Aktuelle Formate (abhängig vom gewählten Theme)
let formats = [];

const state = {
  sourceImage: null, // aktuell geladenes Bild
  sourceName: "",
  results: [],
  overlaysMissing: new Set(),
  offsets: {}, // per-format manual pan { x, y }
  cardRefs: {},
};

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const uploadActions = document.getElementById("uploadActions");
const selectButton = document.getElementById("selectButton");
const generateBtn = document.getElementById("generateBtn");
const clearFileBtn = document.getElementById("clearFileBtn");
const zipBtn = document.getElementById("zipBtn");
const fileName = document.getElementById("fileName");
const resultsGrid = document.getElementById("resultsGrid");
const resultsSection = document.getElementById("resultsSection");
const newUploadBtn = document.getElementById("newUploadBtn");
const actionsBar = document.querySelector(".actions-bar");
const themeSelect = document.getElementById("themeSelect");
const themeSelectWrap = document.getElementById("themeSelectWrap");
const themeLoading = document.getElementById("themeLoading");
const resultsMenuWrap = document.getElementById("resultsMenuWrap");
const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");
const menuDownloadAll = document.getElementById("menuDownloadAll");
const menuNewUpload = document.getElementById("menuNewUpload");
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalOkBtn = document.getElementById("modalOkBtn");
const bootOverlay = document.getElementById("bootOverlay");
const bootLogo = document.getElementById("bootLogo");
const loadingOverlay = document.getElementById("loadingOverlay");
const IS_FILE_PROTOCOL = window?.location?.protocol === "file:";
const PREFERS_REDUCED_MOTION =
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let introRevealStarted = false;
const formatsReady = initThemesAndFormats();
const QUALITY = 0.9;
const overlayCache = {};

document.body?.classList?.add("has-intro");

const NUDGE_ICON_LEFT_SVG = `
<svg class="nudge-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
</svg>
`.trim();

const NUDGE_ICON_RIGHT_SVG = `
<svg class="nudge-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
</svg>
`.trim();

const NUDGE_ICON_UP_SVG = `
<svg class="nudge-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" fill="currentColor"/>
</svg>
`.trim();

const NUDGE_ICON_DOWN_SVG = `
<svg class="nudge-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" fill="currentColor"/>
</svg>
`.trim();

const ZOOM_ICON_IN_SVG = `
<svg class="nudge-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
</svg>
`.trim();

const ZOOM_ICON_OUT_SVG = `
<svg class="nudge-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M19 13H5v-2h14v2z" fill="currentColor"/>
</svg>
`.trim();

const BUILT_IN_MANIFEST = {
  themes: [
    {
      name: "REWE Trikotaktion",
      path: "REWE_Trikotaktion/",
      files: [
        "FLVW_homepage_1920x1080.png",
        "facebook_post_4x5.png",
        "facebook_story_1080x1920.png",
        "flvw_werbung_500x500.png",
        "instagram_post_4x5.png",
        "instagram_story_1080x1920.png",
      ],
    },
  ],
};

let themes = [];
let currentTheme = null;
async function initThemesAndFormats() {
  try {
    toggleThemeLoading(true);
    // Themes & Formate anhand des Overlay-Verzeichnisses ermitteln
    themes = await discoverThemes();
    if (applyFallbackIfEmpty(themes)) return;
    populateThemeSelect(themes);
    setTheme(themes[0].name);
  } catch (err) {
    console.error("Overlay-Ermittlung fehlgeschlagen, nutze Defaults", err);
    applyFallbackIfEmpty([]);
  }
}

selectButton.addEventListener("click", (e) => {
  // label for=fileInput öffnet nativ; als Fallback klicken wir per JS
  e.preventDefault();
  openFilePicker();
});
selectButton.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openFilePicker();
  }
});
dropzone.addEventListener("click", (e) => {
  // Nur wenn direkt auf die Dropzone geklickt wurde (nicht auf Kinder)
  if (e.target === dropzone) {
    e.preventDefault();
    openFilePicker();
  }
});
fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
});

if (clearFileBtn) {
  clearFileBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetToStart();
  });
}

let lastFocusedEl = null;
function closeModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.add("hidden");
  if (lastFocusedEl && typeof lastFocusedEl.focus === "function") lastFocusedEl.focus();
  lastFocusedEl = null;
}

function showModal(message, title = "Hinweis") {
  if (!modalOverlay || !modalTitle || !modalMessage) {
    alert(`${title} \n\n${message} `);
    return;
  }
  lastFocusedEl = document.activeElement;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalOverlay.classList.remove("hidden");
  (modalOkBtn || modalCloseBtn || modalOverlay).focus?.();
}

if (modalOverlay) {
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}
if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
if (modalOkBtn) modalOkBtn.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalOverlay && !modalOverlay.classList.contains("hidden")) {
    e.preventDefault();
    closeModal();
  }
});

function startBootAnimation() {
  if (!bootOverlay) return;
  document.body.classList.add("is-booting");
  restartProgressAnimation(bootOverlay);
  window.setTimeout(() => {
    const headerLogo = document.querySelector(".logo");
    const reduceMotion = PREFERS_REDUCED_MOTION;

    if (!bootLogo || !headerLogo || reduceMotion) {
      document.body.classList.remove("is-booting");
      bootOverlay.classList.add("boot-hide");
      bootOverlay.addEventListener("transitionend", () => bootOverlay.remove(), { once: true });
      startIntroRevealSequence();
      return;
    }

    document.body.classList.add("is-boot-exiting");
    document.body.classList.add("is-measuring");
    const from = bootLogo.getBoundingClientRect();
    const to = headerLogo.getBoundingClientRect();
    document.body.classList.remove("is-measuring");

    bootOverlay.classList.add("boot-fly");
    bootLogo.style.position = "fixed";
    bootLogo.style.left = `${from.left} px`;
    bootLogo.style.top = `${from.top} px`;
    bootLogo.style.width = `${from.width} px`;
    bootLogo.style.height = "auto";
    bootLogo.style.margin = "0";
    bootLogo.style.transformOrigin = "top left";
    bootLogo.style.zIndex = "3001";

    const dx = to.left - from.left;
    const dy = to.top - from.top;
    const scale = to.width && from.width ? to.width / from.width : 1;

    document.body.classList.remove("is-booting");
    requestAnimationFrame(() => {
      bootLogo.style.transition = "transform 720ms cubic-bezier(0.2, 0.9, 0.2, 1)";
      bootLogo.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    });

    bootLogo.addEventListener(
      "transitionend",
      () => {
        document.body.classList.remove("is-boot-exiting");
        startIntroRevealSequence();
        requestAnimationFrame(() => {
          bootOverlay.remove();
        });
      },
      { once: true },
    );
  }, 3000);
}

function toggleLoading(show) {
  if (!loadingOverlay) return;
  document.body.classList.toggle("is-loading", show);
  loadingOverlay.classList.toggle("hidden", !show);
}

startBootAnimation();

initUploadTilt();

function startIntroRevealSequence() {
  if (introRevealStarted) return;
  introRevealStarted = true;

  const upload = document.querySelector('[data-intro="upload"]');
  const theme = document.querySelector('[data-intro="theme"]');
  const steps = Array.from(document.querySelectorAll('[data-intro="step"]'));

  if (PREFERS_REDUCED_MOTION) {
    [upload, theme, ...steps].filter(Boolean).forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  const sequence = [upload, theme, ...steps].filter(Boolean);
  const GAP_MS = 160;
  const START_DELAY_MS = 40;
  let currentDelay = START_DELAY_MS;

  for (const el of sequence) {
    // Elements, die aktuell `display: none` sind, werden beim Einblenden ggf. separat animiert (z.B. Theme-Select).
    if (el.classList.contains("hidden")) continue;
    window.setTimeout(() => {
      el.classList.add("is-revealed");
    }, currentDelay);
    currentDelay += GAP_MS;
  }
}

function initUploadTilt() {
  if (!dropzone) return;
  if (PREFERS_REDUCED_MOTION) return;

  const MAX_DEG = 6;
  const SCALE = 1.015;
  let rafId = 0;
  let lastEvent = null;
  let idleTimer = 0;

  function resetTilt() {
    lastEvent = null;
    dropzone.classList.remove("is-tilting");
    dropzone.style.setProperty("--tilt-rx", "0deg");
    dropzone.style.setProperty("--tilt-ry", "0deg");
    dropzone.style.setProperty("--tilt-scale", "1");
    dropzone.style.setProperty("--glow-angle", "0deg");
  }

  function applyTilt() {
    rafId = 0;
    if (!lastEvent) return;
    if (dropzone.classList.contains("hidden")) return;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const px = lastEvent.clientX / vw; // 0..1
    const py = lastEvent.clientY / vh; // 0..1
    const dx = Math.max(-1, Math.min(1, (px - 0.5) * 2));
    const dy = Math.max(-1, Math.min(1, (py - 0.5) * 2));

    const rotateY = dx * MAX_DEG;
    const rotateX = -dy * MAX_DEG;
    const tiltMagnitude = Math.hypot(rotateX, rotateY);
    const glowAngleDeg = tiltMagnitude < 0.01 ? 0 : ((Math.atan2(rotateY, rotateX) * 180) / Math.PI + 360) % 360;
    dropzone.style.setProperty("--tilt-rx", `${rotateX.toFixed(2)} deg`);
    dropzone.style.setProperty("--tilt-ry", `${rotateY.toFixed(2)} deg`);
    dropzone.style.setProperty("--tilt-scale", `${SCALE} `);
    dropzone.style.setProperty("--glow-angle", `${glowAngleDeg.toFixed(2)} deg`);
  }

  function onPointerMove(e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    lastEvent = e;
    if (!rafId) rafId = window.requestAnimationFrame(applyTilt);
    dropzone.classList.add("is-tilting");
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => dropzone.classList.remove("is-tilting"), 120);
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("blur", resetTilt);
  window.addEventListener("mouseout", (e) => {
    // Maus verlässt das Browserfenster
    if (!e.relatedTarget && !e.toElement) resetTilt();
  });
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function restartProgressAnimation(container) {
  const bar = container?.querySelector?.(".progress-bar");
  if (!bar) return;
  bar.classList.remove("animate");
  // force reflow to restart animation
  // eslint-disable-next-line no-unused-expressions
  bar.offsetWidth;
  bar.classList.add("animate");
}

if (themeSelect) {
  themeSelect.addEventListener("change", (e) => {
    const next = e.target.value;
    setTheme(next);
  });
}

if (newUploadBtn) {
  newUploadBtn.addEventListener("click", () => {
    resetToStart();
  });
}

function resetToStart() {
  state.sourceImage = null;
  state.sourceName = "";
  state.results = [];
  state.overlaysMissing.clear();
  state.offsets = {};
  state.cardRefs = {};
  resultsGrid.innerHTML = "";
  toggleActions(false);
  toggleGenerate(false);
  fileName.textContent = "Noch kein Bild geladen";
  toggleDropzone(true);
  dropzone?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeResultsMenu() {
  if (!menuDropdown || !menuBtn) return;
  menuDropdown.classList.add("hidden");
  menuBtn.setAttribute("aria-expanded", "false");
}

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

generateBtn.addEventListener("click", async () => {
  await formatsReady;
  if (!state.sourceImage) {
    showModal("Bitte lade zuerst ein Bild hoch.");
    return;
  }
  if (!formats.length) {
    showModal("Keine Overlays gefunden. Bitte lege PNGs in den Ordner „overlays“.");
    return;
  }
  generateBtn.disabled = true;
  generateBtn.textContent = "Generiert ...";
  toggleLoading(true);
  restartProgressAnimation(loadingOverlay);
  try {
    await Promise.all([renderAllFormats(), delay(3000)]);
  } catch (err) {
    console.error(err);
    showModal("Fehler beim Rendern. Bitte versuche es erneut.");
  } finally {
    toggleLoading(false);
    generateBtn.disabled = false;
    generateBtn.textContent = "Generieren";
  }
});

zipBtn.addEventListener("click", () => downloadZip().catch(console.error));

function handleFile(file) {
  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
  const isJpeg =
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    file.name.toLowerCase().endsWith(".jpg") ||
    file.name.toLowerCase().endsWith(".jpeg");
  if (!isPng && !isJpeg) {
    showModal("Bitte lade nur PNG oder JPG hoch.", "Upload nicht möglich");
    resetToStart();
    return;
  }
  // Eingabebild laden und UI freischalten
  state.sourceName = file.name.replace(/\.[^/.]+$/, "");
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const fallbackFormats = formats.length ? formats : defaultFormats;
      const themeFormats = themes?.flatMap((t) => t?.formats || []) || [];
      const maxOverlayHeight = Math.max(
        ...fallbackFormats.map((f) => f.height || 0),
        ...themeFormats.map((f) => f.height || 0),
      );
      const minRequiredHeight = maxOverlayHeight ? Math.ceil(maxOverlayHeight * 0.75) : 0;

      if (minRequiredHeight && img.height < minRequiredHeight) {
        showModal(
          `Bildhöhe zu klein.\n\nErforderlich: mindestens ${minRequiredHeight} px(75 % der größten Vorlage mit ${maxOverlayHeight}px Höhe).\nDein Bild: ${img.height} px.`,
          "Upload nicht möglich",
        );
        resetToStart();
        return;
      }

      state.sourceImage = img;
      state.offsets = {};
      fileName.textContent = `${file.name} (${img.width} × ${img.height})`;
      toggleGenerate(true);
    };
    img.onerror = () => showModal("Das Bild konnte nicht geladen werden.", "Upload nicht möglich");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  // erlaubt erneutes Auswählen derselben Datei
  fileInput.value = "";
}

function openFilePicker() {
  fileInput.click();
}

async function renderAllFormats() {
  // Rendert alle Formate und baut die Ergebnis-Karten
  if (!formats.length) {
    showModal("Keine Overlays gefunden. Bitte lege PNGs in den Ordner „overlays“.");
    return;
  }
  state.results = [];
  state.overlaysMissing.clear();
  state.cardRefs = {};
  resultsGrid.innerHTML = "";

  for (const format of formats) {
    if (!state.offsets[format.key]) state.offsets[format.key] = { x: 0, y: 0, scale: 1.0 };
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await renderSingleFormat(format, state.offsets[format.key], null);
      state.results.push(result);
      const card = buildResultCard(result);
      state.cardRefs[format.key] = {
        card,
        img: card.querySelector(".preview img"),
        canvasEl: card.querySelector(".preview-canvas"),
        chip: card.querySelector(".chip"),
        warning: card.querySelector(".overlay-warning"),
      };
      resultsGrid.appendChild(card);
    } catch (err) {
      console.error(`Fehler bei Format ${format.key} `, err);
    }
  }

  zipBtn.disabled = state.results.length === 0;
  toggleActions(state.results.length > 0);
  if (state.results.length > 0) {
    toggleDropzone(false);
    toggleGenerate(false);
  }
}

async function renderSingleFormat(format, offset = { x: 0, y: 0 }, existingCanvas = null) {
  const canvas = existingCanvas || document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const overlay = await loadOverlayCached(format).catch((err) => {
    console.warn(`Overlay fehlt für ${format.key} `, err);
    return null;
  });
  const overlayLoaded = Boolean(overlay);
  const clampedOffset = clampOffset(format, offset);
  drawFormatToCanvas(format, clampedOffset, canvas, overlay);
  if (!overlayLoaded) state.overlaysMissing.add(format.key);
  return { canvas, format, overlayLoaded, offset: { ...clampedOffset } };
}

function drawFormatToCanvas(format, offset, canvas, overlayImg) {
  // Quelle skaliert zuschneiden/positionieren und Overlay auflegen
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas Context nicht verfügbar");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const img = state.sourceImage;
  // Basis-Skalierung (Cover)
  const baseScale = Math.max(format.width / img.width, format.height / img.height);
  // Zusätzliche User-Skalierung
  const userScale = offset.scale || 1.0;
  const finalScale = baseScale * userScale;

  const drawW = img.width * finalScale;
  const drawH = img.height * finalScale;

  // Zentriert rendern + User-Offset
  const offsetX = (format.width - drawW) / 2 + (offset.x || 0);
  const offsetY = (format.height - drawH) / 2 + (offset.y || 0);

  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  if (overlayImg) ctx.drawImage(overlayImg, 0, 0, format.width, format.height);
}

function clampOffset(format, offset) {
  // verhindert, dass das Bild über die Kanten hinausgeschoben wird
  if (!state.sourceImage) return offset;
  const img = state.sourceImage;

  const baseScale = Math.max(format.width / img.width, format.height / img.height);
  const userScale = offset.scale || 1.0;
  // Mindestens 0.1x, maximal 5x Zoom (als Beispiel-Limits, um Extremwerte zu vermeiden)
  // userScale clampen? Hier nur den Offset clampen. Scale-Clamping im zoomFormat.

  const finalScale = baseScale * userScale;
  const drawW = img.width * finalScale;
  const drawH = img.height * finalScale;

  // Max shift nach links/rechts (positiv)
  const maxShiftX = Math.max(0, (drawW - format.width) / 2);
  const maxShiftY = Math.max(0, (drawH - format.height) / 2);

  const clampedX = Math.max(-maxShiftX, Math.min(maxShiftX, offset.x || 0));
  const clampedY = Math.max(-maxShiftY, Math.min(maxShiftY, offset.y || 0));

  return { x: clampedX, y: clampedY, scale: userScale };
}

function loadOverlayCached(format) {
  // Overlay-Bilder cachen, um mehrfaches Laden zu vermeiden
  if (!format.overlay) return Promise.resolve(null);
  if (overlayCache[format.key]) return Promise.resolve(overlayCache[format.key]);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    if (!IS_FILE_PROTOCOL) img.crossOrigin = "anonymous";
    img.onload = () => {
      overlayCache[format.key] = img;
      resolve(img);
    };
    img.onerror = (err) => reject(new Error(`Overlay nicht gefunden oder CORS - Problem: ${format.overlay} (${err.message || err})`));
    const encoded = encodeURI(format.overlay);
    img.src = IS_FILE_PROTOCOL ? encoded : `${encoded}?v = ${Date.now()} `; // Cache-Busting (nicht für file://)
  });
}

function buildResultCard(result) {
  // Baut die Ergebnis-Karte inkl. Preview, Download und Nudge-Steuerung
  const { format, canvas, overlayLoaded } = result;
  const card = document.createElement("div");
  card.className = "card";

  const cardBody = document.createElement("div");
  cardBody.className = "card-body";

  const header = document.createElement("div");
  header.className = "card-header";

  const title = document.createElement("div");
  title.innerHTML = `<strong>${format.label}</strong>`;
  header.appendChild(title);

  const dims = document.createElement("div");
  dims.className = "meta card-dimensions";
  dims.textContent = `Maße: ${format.width} × ${format.height} pixel`;

  const preview = document.createElement("div");
  preview.className = "preview";
  preview.style.aspectRatio = `${format.width} / ${format.height}`;
  const dataUrl = safeCanvasToDataURL(canvas, "image/png");
  let img;
  let canvasEl;
  if (dataUrl) {
    img = document.createElement("img");
    img.src = dataUrl;
    preview.appendChild(img);
  } else {
    canvasEl = document.createElement("canvas");
    canvasEl.width = canvas.width;
    canvasEl.height = canvas.height;
    const ctx = canvasEl.getContext("2d");
    if (ctx) ctx.drawImage(canvas, 0, 0);
    canvasEl.className = "preview-canvas";
    preview.appendChild(canvasEl);
  }

  const controls = document.createElement("div");
  controls.className = "nudge";

  const buttons = document.createElement("div");
  buttons.className = "nudge-buttons";

  // Zoom Out
  const zoomOutBtn = document.createElement("button");
  zoomOutBtn.type = "button";
  zoomOutBtn.className = "ghost nudge-btn";
  zoomOutBtn.setAttribute("aria-label", "Zoom Out");
  zoomOutBtn.innerHTML = ZOOM_ICON_OUT_SVG;
  zoomOutBtn.addEventListener("click", () => zoomFormat(format.key, -0.1));

  // Zoom In
  const zoomInBtn = document.createElement("button");
  zoomInBtn.type = "button";
  zoomInBtn.className = "ghost nudge-btn";
  zoomInBtn.setAttribute("aria-label", "Zoom In");
  zoomInBtn.innerHTML = ZOOM_ICON_IN_SVG;
  zoomInBtn.addEventListener("click", () => zoomFormat(format.key, 0.1));

  // Divider
  const sep = document.createElement("div");
  sep.className = "nudge-sep";

  // Navigation Group
  const navGroup = document.createElement("div");
  navGroup.className = "nudge-nav";

  // Left
  const leftBtn = document.createElement("button");
  leftBtn.type = "button";
  leftBtn.className = "ghost nudge-btn";
  leftBtn.setAttribute("aria-label", "Nach links");
  leftBtn.innerHTML = NUDGE_ICON_LEFT_SVG;
  leftBtn.addEventListener("click", () => nudgeFormat(format.key, -30, 0));

  // Right
  const rightBtn = document.createElement("button");
  rightBtn.type = "button";
  rightBtn.className = "ghost nudge-btn";
  rightBtn.setAttribute("aria-label", "Nach rechts");
  rightBtn.innerHTML = NUDGE_ICON_RIGHT_SVG;
  rightBtn.addEventListener("click", () => nudgeFormat(format.key, 30, 0));

  // Up
  const upBtn = document.createElement("button");
  upBtn.type = "button";
  upBtn.className = "ghost nudge-btn";
  upBtn.setAttribute("aria-label", "Nach oben");
  upBtn.innerHTML = NUDGE_ICON_UP_SVG;
  upBtn.addEventListener("click", () => nudgeFormat(format.key, 0, -30));

  // Down
  const downBtn = document.createElement("button");
  downBtn.type = "button";
  downBtn.className = "ghost nudge-btn";
  downBtn.setAttribute("aria-label", "Nach unten");
  downBtn.innerHTML = NUDGE_ICON_DOWN_SVG;
  downBtn.addEventListener("click", () => nudgeFormat(format.key, 0, 30));

  // Nav Order: L, U, D, R for linear or grid
  buttons.append(zoomOutBtn, zoomInBtn, sep, leftBtn, upBtn, downBtn, rightBtn);
  controls.appendChild(buttons);



  if (!overlayLoaded) {
    const warn = document.createElement("p");
    warn.className = "meta overlay-warning";
    warn.textContent = "Overlay fehlt – Bild wird ohne Overlay ausgeliefert.";
    cardBody.appendChild(warn);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const downloadBtn = document.createElement("button");
  downloadBtn.className = "success";
  downloadBtn.type = "button";
  downloadBtn.textContent = "Download";
  downloadBtn.addEventListener("click", () => downloadSingle(format.key));

  actions.appendChild(downloadBtn);

  card.appendChild(preview);
  cardBody.append(header, dims, controls, actions);
  card.appendChild(cardBody);
  addPreviewDrag(preview, format);
  card.dataset.formatKey = format.key;
  return card;
}

function getOutputType() {
  return "image/jpeg";
}

function getOutputExtension() {
  return "jpg";
}

function getQuality() {
  return QUALITY;
}

function canvasToBlob(canvas, type, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const handleError = (msg) => reject(new Error(msg));
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback via dataURL -> Blob
          try {
            const dataUrl = canvas.toDataURL(type, quality);
            const arr = dataUrl.split(",");
            const bstr = atob(arr[1]);
            const u8arr = new Uint8Array(bstr.length);
            for (let i = 0; i < bstr.length; i += 1) u8arr[i] = bstr.charCodeAt(i);
            resolve(new Blob([u8arr], { type }));
          } catch (err) {
            handleError(`Blob konnte nicht erstellt werden (Fallback fehlgeschlagen): ${err}`);
          }
        }
      }, type, quality);
    } catch (err) {
      handleError(`toBlob fehlgeschlagen: ${err}`);
    }
  });
}

async function downloadSingle(formatKey) {
  const result = state.results.find((r) => r.format.key === formatKey);
  if (!result) return;
  const type = getOutputType();
  const ext = getOutputExtension();
  const quality = type === "image/jpeg" ? getQuality() : 1;
  const baseName = `${result.format.filename}`;
  const fileName = `${baseName}.${ext}`;
  try {
    let blob;
    try {
      blob = await canvasToBlob(result.canvas, type, quality);
    } catch (err) {
      console.warn("toBlob fehlgeschlagen, versuche DataURL-Fallback", err);
    }

    if (!blob) {
      const dataUrl = safeCanvasToDataURL(result.canvas, type, quality);
      if (!dataUrl) throw new Error("DataURL-Fallback fehlgeschlagen.");
      triggerDownloadUrl(dataUrl, fileName);
      return;
    }
    triggerDownload(blob, fileName);
  } catch (err) {
    console.error("Download fehlgeschlagen", err);
    showModal("Download fehlgeschlagen. Bitte prüfe die Konsole (ggf. Canvas/CORS-Problem).");
  }
}

async function downloadZip() {
  // Bündelt alle Ergebnisse als ZIP
  if (!state.results.length) return;
  if (typeof JSZip === "undefined") {
    showModal("JSZip konnte nicht geladen werden.");
    return;
  }
  zipBtn.disabled = true;
  zipBtn.textContent = "ZIP wird gebaut ...";

  const zip = new JSZip();
  const type = getOutputType();
  const ext = getOutputExtension();
  const quality = type === "image/jpeg" ? getQuality() : 1;

  for (const result of state.results) {
    // eslint-disable-next-line no-await-in-loop
    try {
      const blob = await canvasToBlob(result.canvas, type, quality);
      const filePath = `${result.format.filename}.${ext}`;
      zip.file(filePath, blob, { binary: true });
    } catch (err) {
      console.error(`Fehler beim ZIP für ${result.format.key}`, err);
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  triggerDownload(content, `${state.sourceName || "flvw_gfx"}_bundle.zip`);
  zipBtn.disabled = false;
  zipBtn.textContent = "Alles herunterladen (.zip)";
}

function triggerDownload(blob, filename) {
  // Download per Blob-URL anstoßen
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function triggerDownloadUrl(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function discoverThemes() {
  // Versucht, Unterordner in overlays/ als Themes zu erkennen
  const themesFound = [];
  const rootListing = await fetchOverlayListing("");
  if (rootListing.files.length) {
    const formatsForRoot = await buildFormatsForFiles(rootListing.files, "");
    themesFound.push({ name: "Standard", path: "", formats: formatsForRoot });
  }
  for (const dir of rootListing.dirs) {
    // eslint-disable-next-line no-await-in-loop
    const listing = await fetchOverlayListing(`${dir}/`);
    if (!listing.files.length) continue;
    // eslint-disable-next-line no-await-in-loop
    const formatsForDir = await buildFormatsForFiles(listing.files, `${dir}/`);
    themesFound.push({ name: dir, path: `${dir}/`, formats: formatsForDir });
  }
  if (themesFound.some((t) => t.formats?.length)) return themesFound;

  // Fallback: optionales manifest.json (wenn kein Directory-Listing möglich ist)
  const manifestThemes = await fetchOverlayManifest();
  if (manifestThemes?.length) {
    const themesFromManifest = (
      await Promise.all(
        manifestThemes.map((entry) => {
          const path = ensureTrailingSlash(entry.path || "");
          return buildFormatsForFiles(entry.files, path).then((formatsForManifest) => {
            if (!formatsForManifest.length) return null;
            return {
              name: entry.name || (path ? path.replace(/\/$/, "") : "Standard"),
              path,
              formats: formatsForManifest,
            };
          });
        }),
      )
    ).filter(Boolean);
    if (themesFromManifest.length) return themesFromManifest;
  }

  return [];
}

async function fetchOverlayManifest() {
  if (IS_FILE_PROTOCOL) {
    return normalizeOverlayManifest(BUILT_IN_MANIFEST) || null;
  }
  try {
    // Optional: Server-seitige Liste (empfohlen, wenn Directory-Listing deaktiviert ist)
    const resIndex = await fetch(`overlays/list.php?maxDepth=2`, { cache: "no-store" });
    if (resIndex.ok) {
      const data = await resIndex.json();
      const normalized = normalizeOverlayManifest(data);
      if (normalized?.length) return normalized;
    }
  } catch (err) {
    // optional
  }

  try {
    // Optionales manifest.json mit Liste der Overlay-Dateien
    const res = await fetch("overlays/manifest.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`manifest not reachable (${res.status})`);
    const data = await res.json();
    const normalized = normalizeOverlayManifest(data);
    if (normalized?.length) return normalized;
  } catch (err) {
    // Manifest optional; keine harte Fehlermeldung
  }
  return normalizeOverlayManifest(BUILT_IN_MANIFEST) || null;
}

function normalizeOverlayManifest(manifest) {
  if (Array.isArray(manifest)) {
    const files = manifest.filter((f) => typeof f === "string" && f.toLowerCase().endsWith(".png"));
    return files.length ? [{ name: "Standard", path: "", files }] : null;
  }
  if (manifest && typeof manifest === "object" && Array.isArray(manifest.themes)) {
    const themes = manifest.themes
      .map((theme) => {
        const files = Array.isArray(theme.files)
          ? theme.files.filter((f) => typeof f === "string" && f.toLowerCase().endsWith(".png"))
          : [];
        if (!files.length) return null;
        return {
          name: theme.name || theme.path || "Standard",
          path: ensureTrailingSlash(theme.path || ""),
          files,
        };
      })
      .filter(Boolean);
    return themes.length ? themes : null;
  }
  return null;
}

function ensureTrailingSlash(path) {
  if (!path) return "";
  return path.endsWith("/") ? path : `${path}/`;
}

async function fetchOverlayListing(path = "") {
  // Holt ein Directory-Listing (wenn vom Server erlaubt) und parst Dateien/Unterordner
  try {
    const res = await fetch(encodeURI(`overlays/${path}`), { cache: "no-store" });
    if (!res.ok) return { files: [], dirs: [] };
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    if (contentType.includes("text/html") || text.includes("<a")) {
      return parseAnchorsFromListing(text);
    }
    return { files: [], dirs: [] };
  } catch (err) {
    return { files: [], dirs: [] };
  }
}

function parseAnchorsFromListing(html) {
  const regex = /href=["']([^"']+)["']/gi;
  const files = new Set();
  const dirs = new Set();
  let match;
  while ((match = regex.exec(html))) {
    const candidate = decodeURIComponent(match[1]);
    if (candidate === "../") continue;
    if (candidate.endsWith("/")) {
      const dir = candidate.replace(/\/$/, "");
      if (dir && dir !== ".") dirs.add(dir);
      continue;
    }
    const name = candidate.split("/").pop();
    if (name && name.toLowerCase().endsWith(".png")) files.add(name);
  }
  return { files: Array.from(files), dirs: Array.from(dirs) };
}

async function buildFormatsForFiles(files, basePath = "") {
  // Baut Formatobjekte für eine Liste von Dateien (ggf. innerhalb eines Theme-Subfolders)
  const results = (
    await Promise.all(files.map((file) => buildFormatFromFile(file, basePath).catch(() => null)))
  ).filter(Boolean);
  return results;
}

async function buildFormatFromFile(file, basePath = "") {
  // Leitet Dimensionen aus Dateiname oder tatsächlicher Bildgröße ab
  const normalizedFile = typeof file === "string" ? file.replace(/^\/+/, "") : "";
  const filename = normalizedFile.split("/").pop();
  if (!filename) return null;
  const baseName = filename.replace(/\.png$/i, "");
  const overlayPath = `overlays/${basePath}${normalizedFile}`;
  const dimsFromName = parseDimensionsFromName(baseName);
  const overlayMeta = await loadImageMeta(overlayPath).catch(() => null);
  const width = overlayMeta?.width || dimsFromName?.width || 1080;
  const height = overlayMeta?.height || dimsFromName?.height || Math.round(width * 0.75);
  const label = prettifyLabel(baseName);
  const key = baseName;
  return {
    key,
    label,
    width,
    height,
    overlay: overlayPath,
    filename: baseName.toLowerCase(),
  };
}

function parseDimensionsFromName(name) {
  const match = name.match(/(\d+)[xX](\d+)/);
  if (!match) return null;
  const [, w, h] = match;
  return { width: Number(w), height: Number(h) };
}

function prettifyLabel(name) {
  // Aus snake_case/kebab-case einen lesbaren Titel ableiten
  const withSpaces = name.replace(/[_-]+/g, " ").trim();
  return withSpaces
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function loadImageMeta(src) {
  // Bild laden, um Dimensionen abzuleiten (falls nicht aus Dateinamen bekannt)
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!IS_FILE_PROTOCOL) img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = (err) => reject(err);
    const encoded = encodeURI(src);
    img.src = IS_FILE_PROTOCOL ? encoded : `${encoded}?v=${Date.now()}`;
  });
}

function safeCanvasToDataURL(canvas, type = "image/png", quality) {
  try {
    return canvas.toDataURL(type, quality);
  } catch (err) {
    console.error("toDataURL fehlgeschlagen", err);
    return null;
  }
}

function toggleActions(show) {
  if (newUploadBtn) newUploadBtn.classList.toggle("hidden", !show);
  if (zipBtn) {
    zipBtn.classList.toggle("hidden", !show);
    zipBtn.disabled = !show;
  }
  const hasResults = show && state.results.length > 0;
  if (menuDownloadAll) menuDownloadAll.disabled = !hasResults;
  applyResultsLayout(hasResults);
}

function toggleGenerate(show) {
  if (generateBtn) generateBtn.classList.toggle("hidden", !show);
  if (uploadActions) uploadActions.classList.toggle("hidden", show);
  if (clearFileBtn) clearFileBtn.classList.toggle("hidden", !show);
}

function toggleDropzone(show) {
  if (dropzone) dropzone.classList.toggle("hidden", !show);
}

function toggleThemeLoading(isLoading) {
  if (!themeSelectWrap) return;
  ensureThemeSelectVisible();
  if (themeLoading) themeLoading.classList.toggle("hidden", !isLoading);
  if (themeSelect) {
    themeSelect.classList.toggle("hidden", isLoading);
    themeSelect.disabled = isLoading;
  }
}

function ensureThemeSelectVisible() {
  if (!themeSelectWrap) return;
  themeSelectWrap.classList.remove("hidden");
  if (introRevealStarted && !themeSelectWrap.classList.contains("is-revealed")) {
    if (PREFERS_REDUCED_MOTION) {
      themeSelectWrap.classList.add("is-revealed");
    } else {
      window.setTimeout(() => themeSelectWrap.classList.add("is-revealed"), 160);
    }
  }
}

function setThemeSelectPlaceholder(text, disableSelect = true) {
  if (!themeSelect || !themeSelectWrap) return;
  toggleThemeLoading(false);
  ensureThemeSelectVisible();
  themeSelect.innerHTML = "";
  const opt = document.createElement("option");
  opt.textContent = text;
  opt.disabled = true;
  opt.selected = true;
  themeSelect.appendChild(opt);
  themeSelect.disabled = disableSelect;
}

function applyFallbackIfEmpty(list) {
  if (Array.isArray(list) && list.length) return false;
  if (IS_FILE_PROTOCOL) {
    console.warn(
      "Kein Overlay-Listing gefunden. Tipp: Öffnen Sie die Seite über einen lokalen Webserver (z.B. `python3 -m http.server`), damit Ordner/Dateien in `overlays/` automatisch erkannt werden können.",
    );
  }
  const fallbackTheme = { name: "Standard", path: "", formats: defaultFormats };
  themes = [fallbackTheme];
  formats = fallbackTheme.formats;
  populateThemeSelect(themes);
  setTheme(fallbackTheme.name);
  // loading beendet, da auf Fallback umgeschaltet
  toggleThemeLoading(false);
  return true;
}

function populateThemeSelect(list) {
  if (!themeSelect || !themeSelectWrap) return;
  toggleThemeLoading(false);

  themeSelect.innerHTML = "";
  themeSelect.disabled = false;
  if (!list.length) {
    setThemeSelectPlaceholder("Keine Motive gefunden", true);
    return;
  }
  list.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = t.name;
    themeSelect.appendChild(opt);
  });

  // Wenn nur 1 Motiv existiert, blenden wir die Auswahl aus
  if (list.length <= 1) {
    themeSelectWrap.classList.add("hidden");
    themeSelectWrap.classList.remove("is-revealed");
  } else {
    ensureThemeSelectVisible();
  }
}

function setTheme(name) {
  // Aktiviert ein Theme und räumt abhängige UI/State-Elemente auf
  const theme = themes.find((t) => t.name === name);
  if (!theme) return;
  currentTheme = theme.name;
  formats = theme.formats;
  if (themeSelect && themeSelect.value !== name) {
    themeSelect.value = name;
  }
  // Reset Ergebnisse, da sich die Formate ändern
  state.offsets = {};
  state.results = [];
  state.cardRefs = {};
  resultsGrid.innerHTML = "";
  toggleActions(false);
  toggleGenerate(Boolean(state.sourceImage));
  toggleDropzone(true);
  applyResultsLayout(false);
}

function applyResultsLayout(hasResults) {
  if (actionsBar) actionsBar.classList.toggle("results-visible", hasResults);
  if (resultsSection) resultsSection.classList.toggle("hidden", !hasResults);
  document.body.classList.toggle("has-results", hasResults);
  if (zipBtn) {
    zipBtn.classList.toggle("success", hasResults);
    zipBtn.classList.toggle("ghost", !hasResults);
    zipBtn.classList.toggle("strong", !hasResults);
  }
  if (newUploadBtn) newUploadBtn.classList.remove("text-link");
  if (menuDownloadAll) menuDownloadAll.disabled = !hasResults;
  if (!hasResults) closeResultsMenu();
}

if (menuBtn && menuDropdown) {
  menuBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const isOpen = !menuDropdown.classList.contains("hidden");
    if (isOpen) {
      closeResultsMenu();
      return;
    }
    menuDropdown.classList.remove("hidden");
    menuBtn.setAttribute("aria-expanded", "true");
  });

  document.addEventListener("click", (e) => {
    if (menuDropdown.classList.contains("hidden")) return;
    const target = e.target;
    if (resultsMenuWrap && target instanceof Node && resultsMenuWrap.contains(target)) return;
    closeResultsMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeResultsMenu();
  });
}

if (menuDownloadAll) {
  menuDownloadAll.addEventListener("click", () => {
    closeResultsMenu();
    downloadZip().catch(console.error);
  });
}

if (menuNewUpload) {
  menuNewUpload.addEventListener("click", () => {
    closeResultsMenu();
    resetToStart();
  });
}

function nudgeFormat(formatKey, deltaX, deltaY) {
  if (!state.sourceImage) return;
  const format = formats.find((f) => f.key === formatKey);
  if (!format) return;
  if (!state.offsets[formatKey]) state.offsets[formatKey] = { x: 0, y: 0, scale: 1.0 };

  const current = state.offsets[formatKey];
  const nextOffset = {
    x: current.x + (deltaX || 0),
    y: current.y + (deltaY || 0),
    scale: current.scale
  };
  state.offsets[formatKey] = clampOffset(format, nextOffset);
  rerenderFormat(format);
}

function zoomFormat(formatKey, deltaScale) {
  if (!state.sourceImage) return;
  const format = formats.find((f) => f.key === formatKey);
  if (!format) return;
  if (!state.offsets[formatKey]) state.offsets[formatKey] = { x: 0, y: 0, scale: 1.0 };

  const current = state.offsets[formatKey];
  let newScale = current.scale + deltaScale;

  // Limits: 1.0x bis 5.0x
  newScale = Math.max(1.0, Math.min(5.0, newScale));

  const nextOffset = {
    x: current.x,
    y: current.y,
    scale: newScale
  };

  // Nach dem Zoom müssen wir ggf. die Offsets neu clampen, damit das Bild nicht "wegfliegt"
  state.offsets[formatKey] = clampOffset(format, nextOffset);
  rerenderFormat(format);
}

function addPreviewDrag(preview, format) {
  // Dragging deaktiviert, stattdessen Nudge-Buttons nutzen
}

async function rerenderFormat(format) {
  const offset = state.offsets[format.key] || { x: 0, y: 0 };
  const resultIdx = state.results.findIndex((r) => r.format.key === format.key);
  const current = resultIdx !== -1 ? state.results[resultIdx] : null;
  const canvas = current?.canvas || document.createElement("canvas");
  const overlay = await loadOverlayCached(format).catch(() => null);
  const clamped = clampOffset(format, offset);
  drawFormatToCanvas(format, clamped, canvas, overlay);
  const overlayLoaded = Boolean(overlay);
  const updated = { canvas, format, overlayLoaded, offset: { ...clamped } };
  if (resultIdx !== -1) state.results[resultIdx] = updated;
  const ref = state.cardRefs[format.key];
  if (ref?.img) {
    const dataUrl = safeCanvasToDataURL(canvas, "image/png");
    if (dataUrl) ref.img.src = dataUrl;
  }
  if (ref?.canvasEl) {
    const ctx = ref.canvasEl.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, ref.canvasEl.width, ref.canvasEl.height);
      ctx.drawImage(canvas, 0, 0);
    }
  }
  if (ref?.chip) {
    ref.chip.textContent = overlayLoaded ? "Overlay ok" : "Overlay fehlt";
    ref.chip.className = `chip ${overlayLoaded ? "success" : "warning"}`;
  }
  if (ref?.warning) {
    ref.warning.style.display = overlayLoaded ? "none" : "block";
  }
}

// Init UI state (n/a)
toggleActions(false);
toggleGenerate(false);
