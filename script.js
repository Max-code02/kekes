
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  "https://wnzuyzzikfhyhosjmkfo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_3k-gi679jIVLASkpp6UTaw_BnE2wguB";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const cookieForm = document.getElementById("cookie-form");
const cookieTypeInput = document.getElementById("cookie-type");
const cookieAuthorInput = document.getElementById("cookie-author");
const cookieMessageInput = document.getElementById("cookie-message");

const cookieFeed = document.getElementById("cookie-feed");
const cookieCountEl = document.getElementById("cookie-count");
const statusTextEl = document.getElementById("status-text");
const formStatusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

const MAX_CODE_LENGTH = 20000;
const MAX_MESSAGE_LENGTH = 200;
const MAX_FEED_ITEMS = 100;

let totalCount = 0;
let submitting = false;

const renderedIds = new Set();

function setStatus(text, className) {
  statusTextEl.textContent = text;
  statusTextEl.className = `stat-value ${className}`;
}

function setFormStatus(text, error = false) {
  formStatusEl.textContent = text;
  formStatusEl.className =
    `form-status field-wide ${error ? "error" : ""}`;
}

// Automatische Code-Erkennung
function isCode(message) {
  const value = String(message || "").trim();

  if (!value) return false;

  const patterns = [
    /<\s*\/?\s*[a-z][^>]*>/i,
    /<!doctype\s+html/i,
    /\b(const|let|var|function|class)\s+[a-z_$]/i,
    /\b(document|window|console|alert|prompt)\s*[.([]/i,
    /\b(addEventListener|setTimeout|setInterval)\s*\(/i,
    /=>/,
    /<\/?script\b/i,
    /<\/?style\b/i,
    /<\/?canvas\b/i
  ];

  return patterns.some(pattern => pattern.test(value));
}

// Isoliertes HTML-Dokument erstellen
function createSandboxDocument(source) {
  const safeSource = String(source || "")
    .slice(0, MAX_CODE_LENGTH);

  const csp = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "font-src data:",
    "media-src data: blob:",
    "connect-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "navigate-to 'none'"
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 12px;
  background: white;
  color: #222;
  font-family: system-ui, sans-serif;
  overflow-wrap: anywhere;
}
</style>
</head>
<body>
${safeSource}
</body>
</html>`;
}

// Code in isoliertem iframe ausführen
function executeCode(iframe, source) {
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("referrerpolicy", "no-referrer");

  iframe.srcdoc = createSandboxDocument(source);
}

// Keks-Karte erstellen
function renderCookieCard(cookie, prepend = false) {
  const id = cookie.id;

  if (id && renderedIds.has(id)) return;

  if (id) renderedIds.add(id);

  const card = document.createElement("article");
  card.className = "cookie-card";

  const top = document.createElement("div");
  top.className = "cookie-top";

  const badge = document.createElement("span");
  badge.className = "cookie-badge";

  const author = cookie.author || "Anonym";
  const type = cookie.cookie_type || "Keks";

  const codeMode =
    cookie.is_code === true || isCode(cookie.message);

  badge.textContent = codeMode
    ? `💻 Code · ${author}`
    : `${type} · ${author}`;

  const time = document.createElement("span");

  time.textContent = cookie.created_at
    ? new Date(cookie.created_at).toLocaleTimeString("de-DE")
    : "jetzt";

  top.append(badge, time);
  card.appendChild(top);

  if (codeMode) {
    // Code sichtbar darstellen
    const codeLabel = document.createElement("div");
    codeLabel.className = "code-label";
    codeLabel.textContent = "HTML / CSS / JavaScript";

    const pre = document.createElement("pre");
    pre.className = "code-display";

    const code = document.createElement("code");

    // Code niemals im Hauptfenster als HTML interpretieren
    code.textContent = cookie.message || "";

    pre.appendChild(code);

    // Isolierte Live-Vorschau
    const preview = document.createElement("iframe");
    preview.className = "cookie-preview";
    preview.title = "Code-Experiment";
    preview.loading = "lazy";

    card.append(codeLabel, pre, preview);

    // Direkt ausführen, sobald die Karte angezeigt wird
    executeCode(preview, cookie.message);

  } else {
    const message = document.createElement("p");
    message.className = "cookie-msg";

    message.textContent = cookie.message || "";

    card.appendChild(message);
  }

  if (prepend) {
    cookieFeed.prepend(card);
  } else {
    cookieFeed.appendChild(card);
  }

  while (cookieFeed.children.length > MAX_FEED_ITEMS) {
    const last = cookieFeed.lastElementChild;

    if (last?.dataset.cookieId) {
      renderedIds.delete(last.dataset.cookieId);
    }

    last?.remove();
  }

  card.dataset.cookieId = id || "";
}

// Anfangsdaten laden
async function loadInitialCookies() {
  setStatus("Verbinde...", "status-connecting");

  const { count, error: countError } = await supabase
    .from("cookies")
    .select("*", {
      count: "exact",
      head: true
    });

  if (countError) {
    console.error(countError);
    setStatus("Fehler beim Laden", "status-error");
    return;
  }

  totalCount = count || 0;

  cookieCountEl.textContent =
    totalCount.toLocaleString("de-DE");

  const { data, error } = await supabase
    .from("cookies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_FEED_ITEMS);

  if (error) {
    console.error(error);
    setStatus("Fehler beim Laden", "status-error");
    return;
  }

  cookieFeed.innerHTML = "";
  renderedIds.clear();

  (data || []).forEach(cookie => {
    renderCookieCard(cookie);
  });

  setStatus("Live verbunden", "status-live");
}

// Neuen Keks einwerfen
async function dropCookie(
  cookieType,
  message,
  author
) {
  const value = String(message || "").trim();
  const codeMode = isCode(value);

  if (!value) {
    throw new Error("Die Nachricht darf nicht leer sein.");
  }

  const maxLength = codeMode
    ? MAX_CODE_LENGTH
    : MAX_MESSAGE_LENGTH;

  if (value.length > maxLength) {
    throw new Error("Der Inhalt ist zu lang.");
  }

  const payload = {
    cookie_type: String(cookieType || "Schoko-Chip").slice(0, 40),
    message: value,
    author: String(author || "Anonym").slice(0, 40),
    is_code: codeMode
  };

  const { error } = await supabase
    .from("cookies")
    .insert(payload);

  if (error) throw error;
}

// Formular
cookieForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (submitting) return;

  const message = cookieMessageInput.value.trim();

  if (!message) return;

  submitting = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Wird eingeworfen...";

  try {
    await dropCookie(
      cookieTypeInput.value,
      message,
      cookieAuthorInput.value.trim() || "Anonym"
    );

    cookieMessageInput.value = "";

    setFormStatus("🍪 Dein Keks wurde eingeworfen!");

  } catch (error) {
    console.error("Keks-Fehler:", error);

    setFormStatus(
      "Fehler: " + error.message,
      true
    );

  } finally {
    submitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Keks einwerfen";
  }
});

// Supabase Realtime
supabase
  .channel("public:cookies")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "cookies"
    },
    payload => {
      if (
        payload.new.id &&
        renderedIds.has(payload.new.id)
      ) {
        return;
      }

      totalCount++;
      cookieCountEl.textContent =
        totalCount.toLocaleString("de-DE");

      renderCookieCard(payload.new, true);
    }
  )
  .subscribe(status => {
    if (status === "SUBSCRIBED") {
      setStatus("Live verbunden", "status-live");
    }

    if (
      status === "CHANNEL_ERROR" ||
      status === "TIMED_OUT"
    ) {
      setStatus("Verbindung unterbrochen", "status-error");
    }
  });

// Start
loadInitialCookies();
