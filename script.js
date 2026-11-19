import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://wnzuyzzikfhyhosjmkfo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3k-gi679jIVLASkpp6UTaw_BnE2wguB";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const cookieForm = document.getElementById("cookie-form");
const cookieTypeInput = document.getElementById("cookie-type");
const cookieAuthorInput = document.getElementById("cookie-author");
const cookieMessageInput = document.getElementById("cookie-message");
const cookieFeed = document.getElementById("cookie-feed");
const cookieCountEl = document.getElementById("cookie-count");
const statusTextEl = document.getElementById("status-text");
const autoSpamBtn = document.getElementById("auto-spam-btn");

let spamTimer = null;
let totalCount = 0;

function setStatus(text, className) {
  statusTextEl.textContent = text;
  statusTextEl.className = `stat-value ${className}`;
}

function renderCookieCard(cookie, prepend = false) {
  const card = document.createElement("article");
  card.className = "cookie-card";
  const timeStr = cookie.created_at
    ? new Date(cookie.created_at).toLocaleTimeString("de-DE")
    : "jetzt";

  const type = cookie.cookie_type ?? "";
  const author = cookie.author || "Anonym";
  const msg = cookie.message ?? "";

  card.innerHTML = `
    <div class="cookie-top">
      <span class="cookie-badge">${type} · ${author}</span>
      <span>${timeStr}</span>
    </div>
    <p class="cookie-msg">${msg}</p>
  `;

  if (prepend) {
    cookieFeed.prepend(card);
    while (cookieFeed.children.length > 100) {
      cookieFeed.lastElementChild.remove();
    }
  } else {
    cookieFeed.appendChild(card);
  }
}

async function loadInitialCookies() {
  const { count, error: countError } = await supabase
    .from("cookies")
    .select("*", { count: "exact", head: true });

  if (!countError && typeof count === "number") {
    totalCount = count;
    cookieCountEl.textContent = totalCount.toLocaleString("de-DE");
  }

  const { data, error } = await supabase
    .from("cookies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    setStatus("Fehler beim Laden", "status-error");
    console.error(error);
    return;
  }

  cookieFeed.innerHTML = "";
  (data || []).forEach((item) => renderCookieCard(item, false));
  setStatus("Live verbunden", "status-live");
}

async function dropCookie(cookieType = "Schoko-Chip", message = "Keks!", author = "Anonym") {
  const payload = {
    cookie_type: String(cookieType || "Schoko-Chip").slice(0, 40),
    message: String(message || "Keks!").slice(0, 200),
    author: String(author || "Anonym").slice(0, 60)
  };

  const { error } = await supabase.from("cookies").insert(payload);
  if (error) {
    console.error("Insert-Fehler:", error);
  }
}

// Global verfügbar für eigene Skripte & DevTools-Konsole
window.dropCookie = dropCookie;

cookieForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = cookieMessageInput.value.trim();
  if (!msg) return;

  await dropCookie(
    cookieTypeInput.value,
    msg,
    cookieAuthorInput.value.trim() || "Anonym"
  );
  cookieMessageInput.value = "";
  cookieMessageInput.focus();
});

autoSpamBtn.addEventListener("click", () => {
  if (spamTimer) {
    clearInterval(spamTimer);
    spamTimer = null;
    autoSpamBtn.textContent = "🔥 Auto-Spam starten (5/s)";
    autoSpamBtn.classList.remove("active");
    return;
  }

  autoSpamBtn.textContent = "⏹ Auto-Spam stoppen";
  autoSpamBtn.classList.add("active");

  const samples = [
    "Spam-Keks #1!",
    "Noch ein Keks ins Glas!",
    "Bot-Keks ist gelandet 🍪",
    "Mehr Kekse für alle!",
    "Turbo-Krümel!"
  ];

  spamTimer = setInterval(() => {
    const randomMsg = samples[Math.floor(Math.random() * samples.length)];
    const author = cookieAuthorInput.value.trim() || "AutoSpammer";
    dropCookie(cookieTypeInput.value, randomMsg, author);
  }, 200);
});

supabase
  .channel("public:cookies")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "cookies" },
    (payload) => {
      totalCount += 1;
      cookieCountEl.textContent = totalCount.toLocaleString("de-DE");
      renderCookieCard(payload.new, true);
    }
  )
  .subscribe((status) => {
    if (status === "SUBSCRIBED") {
      setStatus("Live verbunden", "status-live");
    }
  });

loadInitialCookies();
