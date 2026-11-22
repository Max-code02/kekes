
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  "https://wnzuyzzikfhyhosjmkfo.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_3k-gi679jIVLASkpp6UTaw_BnE2wguB";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM
const form = document.getElementById("cookie-form");
const typeInput = document.getElementById("cookie-type");
const authorInput = document.getElementById("cookie-author");
const messageInput = document.getElementById("cookie-message");
const modeInput = document.getElementById("post-mode");

const feed = document.getElementById("cookie-feed");
const countEl = document.getElementById("cookie-count");
const statusEl = document.getElementById("status-text");
const formStatus = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

const previewSection = document.getElementById("preview-section");
const ownPreview = document.getElementById("own-preview");

let totalCount = 0;
let previewTimeout = null;
let submitting = false;

const renderedIds = new Set();

const MAX_MESSAGE_LENGTH = 200;
const MAX_CODE_LENGTH = 20000;
const MAX_FEED_ITEMS = 100;

// Status
function setStatus(text, className) {
  statusEl.textContent = text;
  statusEl.className = `stat-value ${className}`;
}

function setFormStatus(text, error = false) {
  formStatus.textContent = text;
  formStatus.className = error
    ? "form-status error"
    : "form-status";
}

// Isoliertes Ausführungsdokument
function createSandboxDocument(source) {
  const code = String(source || "").slice(0, MAX_CODE_LENGTH);

  const csp = `
    default-src 'none';
    script-src 'unsafe-inline';
    style-src 'unsafe-inline';
    img-src data: blob:;
    font-src data:;
    media-src data: blob:;
    connect-src 'none';
    frame-src 'none';
    worker-src 'none';
    object-src 'none';
    form-action 'none';
    base-uri 'none';
  `.replace(/\s+/g, " ");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta
  http-equiv="Content-Security-Policy"
  content="${csp}"
>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 12px;
    background: #ffffff;
    color: #222222;
    font-family: system-ui, sans-serif;
    overflow-wrap: anywhere;
  }
</style>
</head>
<body>
${code}
</body>
</html>`;
}

// Vorschau aktualisieren
function updatePreview() {
  if (modeInput.value !== "code") return;

  const source = messageInput.value;

  if (!source.trim()) {
    ownPreview.srcdoc = "";
    return;
  }

  ownPreview.srcdoc = createSandboxDocument(source);
}

// Vorschau beim Schreiben automatisch aktualisieren
messageInput.addEventListener("input", () => {
  if (modeInput.value !== "code") return;

  clearTimeout(previewTimeout);

  previewTimeout = setTimeout(updatePreview, 250);
});

// Beitragsmodus wechseln
modeInput.addEventListener("change", () => {
  const isCode = modeInput.value === "code";

  previewSection.classList.toggle("hidden", !isCode);

  messageInput.maxLength = isCode
    ? MAX_CODE_LENGTH
    : MAX_MESSAGE_LENGTH;

  messageInput.rows = isCode ? 14 : 5;

  messageInput.placeholder = isCode
    ? '<h1>Mein erstes Spiel</h1>\n<button onclick="alert(\'Hallo!\')">Klick mich</button>\n<script>\n// Dein JavaScript\n</script>'
    : "Was möchtest du ins Keks-Glas werfen?";

  clearTimeout(previewTimeout);

  if (isCode) {
    updatePreview();
  } else {
    ownPreview.srcdoc = "";
  }
});

// Anzahl aktualisieren
function updateCount() {
  countEl.textContent = totalCount.toLocaleString("de-DE");
}

// Sichere Karten-Erstellung
function renderCookieCard(cookie, prepend = false) {
  if (cookie.id && renderedIds.has(cookie.id)) return;

  if (cookie.id) renderedIds.add(cookie.id);

  const card = document.createElement("article");
  card.className = "cookie-card";

  const top = document.createElement("div");
  top.className = "cookie-top";

  const badge = document.createElement("span");
  badge.className = "cookie-badge";

  const isCode = cookie.is_code === true;

  badge.textContent =
    `${isCode ? "💻 Code" : "🍪 " + (cookie.cookie_type || "Keks")} · ${cookie.author || "Anonym"}`;

  const time = document.createElement("span");
  time.className = "cookie-time";

  time.textContent = cookie.created_at
    ? new Date(cookie.created_at).toLocaleString("de-DE")
    : "Gerade eben";

  top.append(badge, time);
  card.appendChild(top);

  if (isCode) {
    const codeLabel = document.createElement("div");
    codeLabel.className = "code-label";
    codeLabel.textContent = "HTML / CSS / JavaScript";

    const code = document.createElement("pre");
    code.className = "code-display";

    const codeContent = document.createElement("code");
    codeContent.textContent = cookie.message || "";

    code.appendChild(codeContent);

    const runButton = document.createElement("button");
    runButton.type = "button";
    runButton.className = "btn btn-run";
    runButton.textContent = "▶ Experiment ausführen";

    const preview = document.createElement("iframe");
    preview.className = "cookie-preview";
    preview.title = "Isolierte Code-Vorschau";
    preview.setAttribute("sandbox", "allow-scripts");
    preview.setAttribute("referrerpolicy", "no-referrer");
    preview.loading = "lazy";

    const previewInfo = document.createElement("p");
    previewInfo.className = "security-note";
    previewInfo.textContent =
      "Isolierte Vorschau. Fremder Code läuft nicht im Hauptfenster.";

    runButton.addEventListener("click", () => {
      preview.srcdoc = createSandboxDocument(cookie.message);

      preview.classList.add("preview-visible");
      runButton.textContent = "↻ Erneut ausführen";
    });

    card.append(
      codeLabel,
      code,
      runButton,
      preview,
      previewInfo
    );

  } else {
    const message = document.createElement("p");
    message.className = "cookie-msg";

    // Niemals fremde Nachrichten als HTML interpretieren!
    message.textContent = cookie.message || "";

    card.appendChild(message);
  }

  if (prepend) {
    feed.prepend(card);
  } else {
    feed.appendChild(card);
  }

  while (feed.children.length > MAX_FEED_ITEMS) {
    const last = feed.lastElementChild;

    if (last?.dataset?.cookieId) {
      renderedIds.delete(last.dataset.cookieId);
    }

    last?.remove();
  }

  card.dataset.cookieId = cookie.id || "";
}

// Initiale Daten laden
async function loadInitialCookies() {
  setStatus("Verbinde...", "status-connecting");

  const countResult = await supabase
    .from("cookies")
    .select("*", {
      count: "exact",
      head: true
    });

  if (countResult.error) {
    console.error(countResult.error);
    setStatus("Ladefehler", "status-error");
    return;
  }

  totalCount = countResult.count || 0;
  updateCount();

  const { data, error } = await supabase
    .from("cookies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_FEED_ITEMS);

  if (error) {
    console.error(error);
    setStatus("Ladefehler", "status-error");
    return;
  }

  feed.innerHTML = "";
  renderedIds.clear();

  (data || []).forEach(cookie => {
    renderCookieCard(cookie);
  });

  setStatus("Live verbunden", "status-live");
}

// Neuen Keks speichern
async function dropCookie() {
  if (submitting) return;

  const message = messageInput.value.trim();
  const isCode = modeInput.value === "code";

  const maxLength = isCode
    ? MAX_CODE_LENGTH
    : MAX_MESSAGE_LENGTH;

  if (!message) {
    setFormStatus("Bitte gib einen Inhalt ein.", true);
    return;
  }

  if (message.length > maxLength) {
    setFormStatus("Der Inhalt ist zu lang.", true);
    return;
  }

  const payload = {
    cookie_type: typeInput.value,
    author: authorInput.value.trim().slice(0, 40) || "Anonym",
    message,
    is_code: isCode
  };

  submitting = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Wird veröffentlicht...";

  try {
    const { error } = await supabase
      .from("cookies")
      .insert(payload);

    if (error) throw error;

    messageInput.value = "";

    if (isCode) {
      ownPreview.srcdoc = "";
    }

    setFormStatus("Dein Beitrag wurde veröffentlicht!");

  } catch (error) {
    console.error("Supabase-Fehler:", error);
    setFormStatus(
      "Veröffentlichen fehlgeschlagen: " + error.message,
      true
    );
  } finally {
    submitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "🍪 Veröffentlichen";
  }
}

// Formular
form.addEventListener("submit", async event => {
  event.preventDefault();
  await dropCookie();
});

// Realtime
const channel = supabase
  .channel("cookies-live")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "cookies"
    },
    payload => {
      if (payload.new.id && renderedIds.has(payload.new.id)) {
        return;
      }

      totalCount++;
      updateCount();

      renderCookieCard(payload.new, true);
    }
  )
  .subscribe(status => {
    if (status === "SUBSCRIBED") {
      setStatus("Live verbunden", "status-live");
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      setStatus("Verbindung unterbrochen", "status-error");
    }
  });

// Start
loadInitialCookies();
