"use strict";

/*
  Ramadan config
  Du ønsket: start onsdag 18 februar 2026, varighet 29 dager.
  Tidssone: Europe/Oslo.
*/
const RAMADAN = Object.freeze({
  start: { year: 2026, month: 2, day: 18, hour: 0, minute: 0, second: 0 },
  durationDays: 29,
  timeZone: "Europe/Oslo",
});

const OSLO = Object.freeze({
  lat: 59.9139,
  lon: 10.7522,
});

const els = {
  osloTime: document.getElementById("osloTime"),
  osloDate: document.getElementById("osloDate"),
  pctDone: document.getElementById("pctDone"),
  pctLeft: document.getElementById("pctLeft"),
  timeLeft: document.getElementById("timeLeft"),
  timeDone: document.getElementById("timeDone"),
  endMoment: document.getElementById("endMoment"),
  barFill: document.getElementById("barFill"),
  barTextLeft: document.getElementById("barTextLeft"),
  barTextDone: document.getElementById("barTextDone"),
  ringProgress: document.getElementById("ringProgress"),
  floatingLayer: document.getElementById("floatingLayer"),
  dayPill: document.getElementById("ramadanDayPill"),
  sun: document.getElementById("sun"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalClose: document.getElementById("modalClose"),
  modalBody: document.getElementById("modalBody"),
  modalHint: document.getElementById("modalHint"),
};

const QUOTES = [
  "En dag om gangen",
  "Tålmodighet er også styrke",
  "Stillhet kan være en gave",
  "Små steg teller",
  "Pust rolig, fortsett rolig",
  "Takknemlighet gjør hjertet lett",
  "Du gjør mer enn du tror",
  "Ro i kroppen, lys i tankene",
  "Vær mild mot deg selv",
  "Mening vokser i det stille",
];

const fmtTime = new Intl.DateTimeFormat("nb-NO", {
  timeZone: RAMADAN.timeZone,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const fmtDate = new Intl.DateTimeFormat("nb-NO", {
  timeZone: RAMADAN.timeZone,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "2-digit",
});

const fmtEnd = new Intl.DateTimeFormat("nb-NO", {
  timeZone: RAMADAN.timeZone,
  year: "numeric",
  month: "long",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function partsToMap(parts) {
  const m = Object.create(null);
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = p.value;
  }
  return m;
}

function zonedTimeToUtcEpoch(localParts, timeZone) {
  const { year, month, day, hour, minute, second } = localParts;
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const guessParts = partsToMap(dtf.formatToParts(new Date(utcGuess)));
  const asIfUtc = Date.UTC(
    Number(guessParts.year),
    Number(guessParts.month) - 1,
    Number(guessParts.day),
    Number(guessParts.hour),
    Number(guessParts.minute),
    Number(guessParts.second)
  );

  const offset = asIfUtc - utcGuess;
  return utcGuess - offset;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (days > 0) return `${days} d ${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
  return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
}

function setProgressUI(progress01, msDone, msLeft, endUtcEpoch) {
  const pctDone = Math.round(progress01 * 1000) / 10;
  const pctLeft = Math.round((100 - pctDone) * 10) / 10;

  els.pctDone.textContent = `${pctDone}%`;
  els.pctLeft.textContent = `${pctLeft}%`;

  els.timeDone.textContent = formatDuration(msDone);
  els.timeLeft.textContent = formatDuration(msLeft);

  els.endMoment.textContent = fmtEnd.format(new Date(endUtcEpoch));

  els.barFill.style.width = `${pctDone}%`;
  els.barTextLeft.textContent = `Gjenstår: ${pctLeft}%`;
  els.barTextDone.textContent = `Fastet: ${pctDone}%`;

  const r = 46;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress01);
  els.ringProgress.style.strokeDasharray = String(circumference);
  els.ringProgress.style.strokeDashoffset = String(offset);
}

/* Dag nummer */
function getRamadanStartUtc() {
  return zonedTimeToUtcEpoch(RAMADAN.start, RAMADAN.timeZone);
}

function getRamadanEndUtc(startUtc) {
  return startUtc + RAMADAN.durationDays * 24 * 60 * 60 * 1000;
}

function getRamadanDayNumber(nowUtc) {
  const startUtc = getRamadanStartUtc();
  const endUtc = getRamadanEndUtc(startUtc);

  if (nowUtc < startUtc) return { state: "before", day: 0 };
  if (nowUtc >= endUtc) return { state: "after", day: RAMADAN.durationDays };

  const dayIndex = Math.floor((nowUtc - startUtc) / (24 * 60 * 60 * 1000));
  return { state: "during", day: dayIndex + 1 };
}

function setDayPill(nowUtc) {
  if (!els.dayPill) return;

  const d = getRamadanDayNumber(nowUtc);

  if (d.state === "before") {
    els.dayPill.textContent = "Starter snart";
    return;
  }

  if (d.state === "after") {
    els.dayPill.textContent = "Ramadan ferdig";
    return;
  }

  els.dayPill.textContent = `Dag ${d.day} av ${RAMADAN.durationDays}`;
}

/* Viktige dager modal */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getImportantSections(dayNo) {
  const sections = [];

  if (dayNo >= 1 && dayNo <= 19) {
    sections.push({
      title: "Bygg rytmen din",
      items: [
        "Fokus: stabilitet, intensjon, og en rolig flyt",
        "Små vaner hver dag er bedre enn store skippertak",
        "Ta vare på kroppen slik at du holder ut",
      ],
    });
  }

  if (dayNo >= 20 && dayNo <= RAMADAN.durationDays) {
    sections.push({
      title: "De siste ti dagene",
      items: [
        "Fokus: mer ro, mer tilbedelse, mer refleksjon",
        "Skru litt ned på støy og skjerm om du kan",
        "Øk litt hver dag på en måte som er realistisk",
      ],
    });
  }

  sections.push({
    title: "Laylat al Qadr",
    items: [
      "Fokus: en natt med stor verdi som mange søker i de siste ti nettene",
      "Legg ekstra vekt på duaa, bønn, og Qur an lesning",
      "Hold det ekte og enkelt, kvalitet kan være nok",
    ],
  });

  sections.push({
    title: "Oddetalls netter i slutten",
    items: [
      "Mange legger ekstra innsats på natt 21, 23, 25, 27 og 29",
      "Plan: litt tidligere ro, mer stillhet, mer tilstedeværelse",
      "Velg et lite opplegg du klarer å holde jevnt",
    ],
  });

  return sections;
}

function renderModal(dayNo) {
  if (!els.modalBody || !els.modalHint) return;

  const sections = getImportantSections(dayNo);
  els.modalBody.innerHTML = sections
    .map((s) => {
      const lis = s.items.map((x) => `<li>${escapeHtml(x)}</li>`).join("");
      return `
        <div class="section">
          <div class="section-title">${escapeHtml(s.title)}</div>
          <ul>${lis}</ul>
        </div>
      `;
    })
    .join("");

  if (dayNo >= 20 && dayNo <= RAMADAN.durationDays) {
    els.modalHint.textContent = "Du er i de siste ti dagene nå. Dette er en generell påminnelse.";
  } else if (dayNo >= 1) {
    els.modalHint.textContent = `Du er på dag ${dayNo} av ${RAMADAN.durationDays}. Dette er en generell påminnelse.`;
  } else {
    els.modalHint.textContent = "Ramadan har ikke startet enda på denne tidslinjen.";
  }
}

function todaysKey(now) {
  const dtf = new Intl.DateTimeFormat("nb-NO", {
    timeZone: RAMADAN.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `ramadan_modal_seen_${dtf.format(now)}`;
}

function openModalOncePerDay(now, dayNo) {
  if (!els.modalBackdrop || !els.modalClose) return;

  renderModal(dayNo);

  const key = todaysKey(now);
  if (localStorage.getItem(key) === "1") return;

  localStorage.setItem(key, "1");
  els.modalBackdrop.hidden = false;

  const close = () => {
    els.modalBackdrop.hidden = true;
    document.removeEventListener("keydown", onKey);
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  els.modalClose.onclick = close;
  els.modalBackdrop.onclick = (e) => {
    if (e.target === els.modalBackdrop) close();
  };

  document.addEventListener("keydown", onKey);
}

/* Flytende quotes */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function makeFloatingQuote(text) {
  if (!els.floatingLayer) return;

  const el = document.createElement("div");
  el.className = "float-quote";
  el.textContent = text;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const startX = rand(20, Math.max(40, vw - 260));
  const startY = rand(90, Math.max(140, vh - 140));

  const dx = rand(-220, 220);
  const dy = rand(-160, 160);

  el.style.left = `${startX}px`;
  el.style.top = `${startY}px`;
  el.style.setProperty("--dx", `${dx}px`);
  el.style.setProperty("--dy", `${dy}px`);

  const dur = rand(12, 22);
  el.style.animation = `drift ${dur}s ease-in-out forwards`;

  els.floatingLayer.appendChild(el);

  window.setTimeout(() => {
    el.remove();
  }, Math.ceil(dur * 1000) + 300);
}

function startFloatingQuotes() {
  for (let i = 0; i < 6; i++) {
    window.setTimeout(() => makeFloatingQuote(QUOTES[i % QUOTES.length]), i * 800);
  }

  window.setInterval(() => {
    const text = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    makeFloatingQuote(text);
  }, 2200);
}

/* Sol og himmel, enkel offline beregning */
function toJulian(dateMs) {
  return dateMs / 86400000 - 0.5 + 2440588;
}

function toDays(dateMs) {
  return toJulian(dateMs) - 2451545;
}

function rad(deg) {
  return (deg * Math.PI) / 180;
}

function solarMeanAnomaly(d) {
  return rad(357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M) {
  const C = rad(
    1.9148 * Math.sin(M) +
      0.0200 * Math.sin(2 * M) +
      0.0003 * Math.sin(3 * M)
  );
  const P = rad(102.9372);
  return M + C + P + Math.PI;
}

function declination(L) {
  const e = rad(23.4397);
  return Math.asin(Math.sin(e) * Math.sin(L));
}

function rightAscension(L) {
  const e = rad(23.4397);
  return Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
}

function siderealTime(d, lw) {
  return rad(280.16 + 360.9856235 * d) - lw;
}

function azimuth(H, phi, dec) {
  return Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
  );
}

function altitude(H, phi, dec) {
  return Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)
  );
}

function solarPosition(dateMs, lat, lon) {
  const lw = rad(-lon);
  const phi = rad(lat);
  const d = toDays(dateMs);

  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);

  const dec = declination(L);
  const ra = rightAscension(L);

  const H = siderealTime(d, lw) - ra;
  const alt = altitude(H, phi, dec);
  const az = azimuth(H, phi, dec);

  return { altitude: alt, azimuth: az };
}

function approxSunTimes(dateMs, lat, lon) {
  const startOfDay = new Date(dateMs);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const base = startOfDay.getTime();

  let prevAlt = solarPosition(base, lat, lon).altitude;
  let rise = null;
  let set = null;

  const stepMin = 5;
  for (let i = stepMin; i <= 24 * 60; i += stepMin) {
    const t = base + i * 60 * 1000;
    const alt = solarPosition(t, lat, lon).altitude;

    if (rise === null && prevAlt < 0 && alt >= 0) rise = t;
    if (set === null && prevAlt >= 0 && alt < 0) set = t;

    prevAlt = alt;
  }

  if (rise === null) rise = base + 8 * 60 * 60 * 1000;
  if (set === null) set = base + 16 * 60 * 60 * 1000;

  return { sunriseUtc: rise, sunsetUtc: set };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function setSkyTheme(nowUtc) {
  const times = approxSunTimes(nowUtc, OSLO.lat, OSLO.lon);
  const sunriseUtc = times.sunriseUtc;
  const sunsetUtc = times.sunsetUtc;

  const dayLen = Math.max(1, sunsetUtc - sunriseUtc);
  const isDay = nowUtc >= sunriseUtc && nowUtc <= sunsetUtc;

  const tDay = clamp((nowUtc - sunriseUtc) / dayLen, 0, 1);
  const bell = Math.sin(Math.PI * tDay);

  const glowA = isDay ? lerp(0.10, 0.22, bell) : 0.06;
  const glowB = isDay ? lerp(0.06, 0.16, bell) : 0.04;

  document.documentElement.style.setProperty("--glow-a", String(glowA));
  document.documentElement.style.setProperty("--glow-b", String(glowB));

  document.documentElement.style.setProperty("--sky-top", "rgba(12, 12, 12, 1)");
  document.documentElement.style.setProperty("--sky-bottom", "rgba(10, 10, 10, 1)");

  const x = lerp(6, 94, tDay);
  const y = isDay ? lerp(78, 16, bell) : 120;
  const o = isDay ? lerp(0.35, 1.0, bell) : 0.0;

  document.documentElement.style.setProperty("--sun-x", `${x}vw`);
  document.documentElement.style.setProperty("--sun-y", `${y}vh`);
  document.documentElement.style.setProperty("--sun-o", String(o));
}

/* Tick */
function tick() {
  const now = new Date();

  els.osloTime.textContent = fmtTime.format(now);
  els.osloDate.textContent = fmtDate.format(now);

  const startUtc = getRamadanStartUtc();
  const endUtc = getRamadanEndUtc(startUtc);

  const nowUtc = now.getTime();
  const total = endUtc - startUtc;
  const done = Math.max(0, nowUtc - startUtc);
  const left = Math.max(0, endUtc - nowUtc);

  const progress01 = clamp01(done / total);

  setProgressUI(progress01, done, left, endUtc);
  setDayPill(nowUtc);
  setSkyTheme(nowUtc);
}

/* Start */
tick();
window.setInterval(tick, 1000);
startFloatingQuotes();

(function initModal() {
  const now = new Date();
  const dayInfo = getRamadanDayNumber(now.getTime());
  const dayNo = dayInfo.state === "during" ? dayInfo.day : dayInfo.day;
  openModalOncePerDay(now, dayNo);
})();

document.addEventListener(
  "touchmove",
  (e) => {
    if (e.scale && e.scale !== 1) e.preventDefault();
  },
  { passive: false }
);
