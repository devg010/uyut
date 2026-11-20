// Все суммы в рублях. Первые комната и санузел входят в базовый тариф.
export const PRICES = {
  cleaning: {
    kinds: {
      regular: ["Поддерживающая уборка", 80],
      deep: ["Генеральная уборка", 150],
      post: ["Уборка после ремонта", 190],
    },
    room: 350,
    bath: 650,
    extras: {
      windows: ["Мытьё окон", 1200],
      sofa: ["Химчистка дивана", 2300],
      rubbish: ["Вывоз мусора", 1700],
    },
  },
  renovation: {
    kinds: {
      cosmetic: ["Косметический ремонт", 4800],
      major: ["Капитальный ремонт", 11500],
      turnkey: ["Ремонт под ключ", 16800],
    },
    room: 2500,
    bath: 4000,
    extras: { rubbish: ["Вывоз мусора", 3800], dismantle: ["Дополнительный демонтаж", 5500] },
  },
  countryTrip: 1500,
};
const rubles = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});
export const money = (number) => rubles.format(number);
export const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
export function node(tag, text, className) {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  if (className) result.className = className;
  return result;
}
export const option = (value, label) => new Option(label, value);
export function estimate(input) {
  const tariff = PRICES[input.type];
  return (
    input.area * tariff.kinds[input.kind][1] +
    tariff.room * (input.rooms - 1) +
    tariff.bath * (input.baths - 1) +
    input.extras.reduce((sum, key) => sum + tariff.extras[key][1], 0) +
    (input.zone === "country" ? PRICES.countryTrip : 0)
  );
}
export function selection() {
  const result = {
    type: $('input[name="calc-type"]:checked').value,
    kind: $("#kind").value,
    area: Number($("#area").value),
    rooms: Number($("#rooms").value),
    baths: Number($("#baths").value),
    extras: all("#extras input:checked").map((input) => input.value),
    zone: $("#zone").value,
  };
  result.label = PRICES[result.type].kinds[result.kind][0];
  result.total = estimate(result);
  return result;
}
function setKinds(type, presetKind, presetExtras = []) {
  const tariff = PRICES[type];
  $("#kind").replaceChildren(...Object.entries(tariff.kinds).map(([id, [name]]) => option(id, name)));
  if (Object.hasOwn(tariff.kinds, presetKind)) $("#kind").value = presetKind;
  const extras = Object.entries(tariff.extras).map(([id, [name, cost]]) => {
    const label = node("label", undefined, "check"),
      input = node("input");
    input.type = "checkbox";
    input.value = id;
    input.checked = presetExtras.includes(id);
    label.append(input, node("span", name + " · " + money(cost)));
    return label;
  });
  $("#extras").replaceChildren(...extras);
}
function renderPrices() {
  const type = $('input[name="prices"]:checked').value;
  $("#price-rows").replaceChildren(
    ...Object.values(PRICES[type].kinds).map(([name, cost]) => {
      const row = node("tr");
      row.append(node("td", name), node("td", "от " + money(cost)));
      return row;
    }),
  );
}
function initCalculator() {
  let last = {};
  try {
    last = JSON.parse(sessionStorage.getItem("uyut-calculation") || "{}") || {};
  } catch {}
  const preset = new URLSearchParams(location.search).get("kind") || last.kind;
  const type = Object.hasOwn(PRICES.renovation.kinds, preset) ? "renovation" : "cleaning";
  $('input[name="calc-type"][value="' + type + '"]').checked = true;
  setKinds(type, preset, Array.isArray(last.extras) ? last.extras : []);
  for (const id of ["rooms", "baths", "zone"]) {
    if (all("#" + id + " option").some((o) => o.value === String(last[id]))) $("#" + id).value = last[id];
  }
  if (Number.isInteger(last.area) && last.area >= 20 && last.area <= 200) $("#area").value = last.area;
  const calc = $("#calculator"),
    area = $("#area"),
    range = $("#area-slider");
  function sync() {
    const valid = area.value !== "" && area.validity.valid;
    if (!valid) {
      $("#total").textContent = "Укажите 20–200 м²";
    } else {
      range.value = area.value;
      const values = selection();
      $("#total").textContent = "от " + money(values.total);
      $("#trip-note").textContent =
        (values.zone === "country"
          ? "Включён один выезд за город: " + money(PRICES.countryTrip) + ". "
          : "Выезд по Москве включён. ") +
        (values.type === "renovation"
          ? "Замер бесплатный. Материалы согласуются отдельно."
          : "Первая комната и один санузел входят в базовый расчёт.");
      try {
        sessionStorage.setItem("uyut-calculation", JSON.stringify(values));
      } catch {}
    }
    document.dispatchEvent(new Event("uyut-calculation"));
  }
  calc.addEventListener("input", (event) => {
    if (event.target.name === "calc-type") setKinds(event.target.value);
    if (event.target === range) area.value = range.value;
    sync();
  });
  sync();
}
if ($("#calculator")) initCalculator();
if ($("#price-rows")) {
  renderPrices();
  $('[data-choice="prices"]').addEventListener("change", renderPrices);
  const examples = [
    ["deep", 60],
    ["post", 40],
    ["cosmetic", 25],
  ];
  examples.forEach(([kind, area], i) => {
    $("#case" + (i + 1)).textContent = money(
      estimate({
        type: i === 2 ? "renovation" : "cleaning",
        kind,
        area,
        rooms: 1,
        baths: 1,
        extras: [],
        zone: "city",
      }),
    );
  });
}
const burger = $(".burger"),
  nav = $("#nav");
function closeMenu() {
  nav.classList.remove("open");
  burger.setAttribute("aria-expanded", "false");
  burger.setAttribute("aria-label", "Открыть меню");
}
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("open")) {
    closeMenu();
    burger.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".navrow")) closeMenu();
  if (e.target.closest("[data-close]")) e.target.closest("dialog").close();
  const contact = e.target.closest("[data-contact]");
  if (contact) {
    const phone = contact.dataset.contact === "phone";
    $("#contact-title").textContent = phone ? "Телефон · демо" : "Telegram · демо";
    $("#contact-text").textContent = phone
      ? "+7 (000) 000-00-00 — демонстрационный номер. Запись можно попробовать на сайте."
      : "В рабочей версии здесь откроется диалог с менеджером. Попробуйте онлайн-запись в демо.";
    $("#contact").showModal();
  }
});
const cookieBanner = $(".cookies");
function readChoice() {
  try {
    return localStorage.getItem("uyut-cookie");
  } catch {
    return null;
  }
}
function applyConsent(value) {
  cookieBanner.hidden = ["all", "essential"].includes(value);
  // Локальная заглушка аналитики. Сетевых запросов нет.
  if (value === "all") document.dispatchEvent(new Event("uyut-analytics-consent"));
}
applyConsent(readChoice());
$("[data-cookies]").addEventListener("click", () => {
  cookieBanner.hidden = false;
  $("[data-cookie]").focus();
});
all("[data-cookie]").forEach((b) =>
  b.addEventListener("click", () => {
    try {
      localStorage.setItem("uyut-cookie", b.dataset.cookie);
    } catch {}
    applyConsent(b.dataset.cookie);
    if (document.activeElement === b) $("[data-cookies]").focus({ preventScroll: true });
  }),
);
window.addEventListener("storage", (e) => {
  if (e.key === "uyut-cookie" || e.key === null) applyConsent(readChoice());
});
let nearForm = false;
function dock() {
  const typing = document.activeElement?.matches(
    "textarea,input:not([type=range]):not([type=checkbox]):not([type=radio]),[contenteditable=true]",
  );
  const keyboard = window.visualViewport && innerHeight - visualViewport.height > 140;
  document.body.classList.toggle("hide-dock", Boolean(nearForm || typing || keyboard));
}
if ($("#booking"))
  new IntersectionObserver(([entry]) => {
    nearForm = entry.isIntersecting;
    dock();
  }).observe($("#booking"));
document.addEventListener("focusin", dock);
document.addEventListener("focusout", () => requestAnimationFrame(dock));
window.visualViewport?.addEventListener("resize", dock);
const figures = all(".comparison");
let slide = 0;
function showSlide(delta) {
  slide = (slide + delta + figures.length) % figures.length;
  figures.forEach((figure, i) => {
    figure.hidden = i !== slide;
  });
  $("#slide-count").textContent = slide + 1 + " из " + figures.length;
}
all("[data-slide]").forEach((b) => b.addEventListener("click", () => showSlide(Number(b.dataset.slide))));
all(".compare-range").forEach((input) =>
  input.addEventListener("input", () => input.parentElement.style.setProperty("--cut", input.value + "%")),
);
const motion = matchMedia("(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)");
let stopEffects = () => {};
function enableEffects() {
  stopEffects();
  if (!motion.matches) return;
  const controller = new AbortController(),
    opts = { signal: controller.signal, passive: true };
  const spot = node("div", undefined, "spot");
  spot.hidden = true;
  document.body.append(spot);
  const cards = all(".service-card");
  let frame = 0,
    x = 0,
    y = 0,
    magnet;
  function resetMagnet() {
    if (magnet) {
      magnet.style.removeProperty("--mag-x");
      magnet.style.removeProperty("--mag-y");
    }
    magnet = null;
  }
  function draw() {
    frame = 0;
    spot.hidden = false;
    spot.style.transform = "translate(" + x + "px," + y + "px)";
    const target = document.elementFromPoint(x, y)?.closest(".btn");
    if (target !== magnet) resetMagnet();
    if (target) {
      magnet = target;
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mag-x", (x - r.left - r.width / 2) * 0.065 + "px");
      target.style.setProperty("--mag-y", (y - r.top - r.height / 2) * 0.09 + "px");
    }
    cards.forEach((card) => {
      const r = card.getBoundingClientRect(),
        dx = x - r.left,
        dy = y - r.top;
      card.style.setProperty("--rx", dx + "px");
      card.style.setProperty("--ry", dy + "px");
      const near = dy > -70 && dy < r.height + 70 && dx > -140 && dx < r.width + 140;
      card.style.setProperty(
        "--nudge",
        near && (dx < 0 || dx > r.width) ? (dx < 0 ? "3px" : "-3px") : "0px",
      );
    });
  }
  document.addEventListener(
    "pointermove",
    (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(draw);
    },
    opts,
  );
  document.documentElement.addEventListener(
    "pointerleave",
    () => {
      cancelAnimationFrame(frame);
      frame = 0;
      spot.hidden = true;
      resetMagnet();
    },
    opts,
  );
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view", "seen");
        observer.unobserve(entry.target);
      }),
    { threshold: 0.08 },
  );
  all(".section-head,.steps,.case,.docs article").forEach((el, i) => {
    el.style.setProperty("--delay", (i % 3) * 55 + "ms");
    observer.observe(el);
  });
  const ticker = $(".ticker");
  let animation, timer;
  if (ticker)
    timer = setInterval(() => {
      if (document.hidden || !ticker.firstElementChild) return;
      const first = ticker.firstElementChild;
      const distance = first.getBoundingClientRect().width + parseFloat(getComputedStyle(ticker).columnGap);
      animation = ticker.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-" + distance + "px)" }],
        { duration: 550, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      animation.onfinish = () => ticker.append(first);
    }, 3200);
  stopEffects = () => {
    controller.abort();
    observer.disconnect();
    clearInterval(timer);
    animation?.cancel();
    cancelAnimationFrame(frame);
    resetMagnet();
    spot.remove();
    all(".in-view,.seen").forEach((el) => el.classList.remove("in-view", "seen"));
    cards.forEach((c) => c.removeAttribute("style"));
  };
}
enableEffects();
motion.addEventListener("change", enableEffects);
