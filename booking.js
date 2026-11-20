import { $, node, option, PRICES, estimate, selection, money } from "./app.js";

const KEY = "uyut-bookings-v1";
const LOCK = "uyut-booking-write";
const RECEIPT = "uyut-receipt";
const statuses = ["Новая", "Подтверждена", "В работе", "Выполнена", "Отменена"];
const cancelled = statuses.at(-1);
const teams = ["Бригада 1", "Бригада 2", "Бригада 3"];
const surveyor = "Замерщик";
// Районы Москвы, включая Новую Москву.
const districts = [
  "Академический",
  "Алексеевский",
  "Алтуфьевский",
  "Арбат",
  "Аэропорт",
  "Бабушкинский",
  "Басманный",
  "Беговой",
  "Бекасово",
  "Бескудниковский",
  "Бибирево",
  "Бирюлёво Восточное",
  "Бирюлёво Западное",
  "Богородское",
  "Братеево",
  "Бутырский",
  "Вешняки",
  "Внуково",
  "Войковский",
  "Вороново",
  "Восточное Дегунино",
  "Восточное Измайлово",
  "Восточный",
  "Выхино-Жулебино",
  "Гагаринский",
  "Головинский",
  "Гольяново",
  "Даниловский",
  "Дмитровский",
  "Донской",
  "Дорогомилово",
  "Замоскворечье",
  "Западное Дегунино",
  "Зюзино",
  "Зябликово",
  "Ивановское",
  "Измайлово",
  "Капотня",
  "Коммунарка",
  "Коньково",
  "Коптево",
  "Косино-Ухтомский",
  "Котловка",
  "Краснопахорский",
  "Красносельский",
  "Крылатское",
  "Крюково",
  "Кузьминки",
  "Кунцево",
  "Куркино",
  "Левобережный",
  "Лефортово",
  "Лианозово",
  "Ломоносовский",
  "Лосиноостровский",
  "Люблино",
  "Марфино",
  "Марьина Роща",
  "Марьино",
  "Матушкино",
  "Метрогородок",
  "Мещанский",
  "Митино",
  "Можайский",
  "Молжаниновский",
  "Москворечье-Сабурово",
  "Нагатино-Садовники",
  "Нагатинский Затон",
  "Нагорный",
  "Некрасовка",
  "Нижегородский",
  "Ново-Переделкино",
  "Новогиреево",
  "Новокосино",
  "Обручевский",
  "Орехово-Борисово Северное",
  "Орехово-Борисово Южное",
  "Останкинский",
  "Отрадное",
  "Очаково-Матвеевское",
  "Перово",
  "Печатники",
  "Покровское-Стрешнево",
  "Преображенское",
  "Пресненский",
  "Проспект Вернадского",
  "Раменки",
  "Ростокино",
  "Рязанский",
  "Савёлки",
  "Савёловский",
  "Свиблово",
  "Северное Бутово",
  "Северное Измайлово",
  "Северное Медведково",
  "Северное Тушино",
  "Северный",
  "Силино",
  "Сокол",
  "Соколиная Гора",
  "Сокольники",
  "Солнцево",
  "Старое Крюково",
  "Строгино",
  "Таганский",
  "Тверской",
  "Текстильщики",
  "Тимирязевский",
  "Троицк",
  "Тропарёво-Никулино",
  "Тёплый Стан",
  "Фили-Давыдково",
  "Филимонковский",
  "Филёвский Парк",
  "Хамовники",
  "Ховрино",
  "Хорошёво-Мнёвники",
  "Хорошёвский",
  "Царицыно",
  "Чертаново Северное",
  "Чертаново Центральное",
  "Чертаново Южное",
  "Черёмушки",
  "Щербинка",
  "Щукино",
  "Южное Бутово",
  "Южное Медведково",
  "Южное Тушино",
  "Южнопортовый",
  "Якиманка",
  "Ярославский",
  "Ясенево",
];
const clock = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
function nowInMoscow() {
  const parts = Object.fromEntries(clock.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: parts.year + "-" + parts.month + "-" + parts.day,
    minute: +parts.hour * 60 + +parts.minute,
  };
}
function shiftDay(iso, offset) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
function dayText(iso, options = { day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: "UTC" }).format(
    new Date(iso + "T12:00:00Z"),
  );
}
const hm = (minutes) =>
  String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
const interval = (row) => hm(row.start) + "–" + hm(row.end);
const typeName = (type) => (type === "cleaning" ? "Уборка" : "Ремонт");
function duration(calc) {
  if (calc.type === "renovation") return 120;
  const scale = (calc.area - 20) / 20;
  const hours = { regular: 1 + scale * 0.5, deep: 2 + scale * 0.65, post: 3 + scale * 0.75 };
  return Math.ceil(hours[calc.kind]) * 60;
}
function schedule(calc) {
  return calc.type === "cleaning"
    ? { start: 540, end: 1200, step: 30, workers: teams }
    : { start: 600, end: 1080, step: 120, workers: [surveyor] };
}
function freeWorkers(rows, date, start, end, workers, ignoreId) {
  return workers.filter(
    (worker) =>
      !rows.some(
        (r) =>
          r.id !== ignoreId &&
          r.status !== cancelled &&
          r.date === date &&
          r.worker === worker &&
          r.start < end &&
          start < r.end,
      ),
  );
}
function windows(rows, date, calc, chosen = "any", now = nowInMoscow()) {
  if (
    date < now.date ||
    date > shiftDay(now.date, 59) ||
    !Number.isInteger(calc.area) ||
    calc.area < 20 ||
    calc.area > 200
  )
    return [];
  const shift = schedule(calc),
    length = duration(calc);
  const workers = chosen === "any" ? shift.workers : shift.workers.filter((w) => w === chosen);
  const result = [];
  for (let start = shift.start; start + length <= shift.end; start += shift.step) {
    if (date === now.date && start <= now.minute) continue;
    const available = freeWorkers(rows, date, start, start + length, workers);
    if (available.length) result.push({ start, end: start + length, workers: available });
  }
  return result;
}
function state() {
  const saved = localStorage.getItem(KEY);
  if (saved === null) return { next: 1, rows: [] };
  let data;
  try {
    data = JSON.parse(saved);
  } catch {}
  if (!data || !Array.isArray(data.rows) || !Number.isSafeInteger(data.next))
    throw Error("Не удалось прочитать демо-данные. Сохранение остановлено.");
  return data;
}
// Резервный шлюз между вкладками. Данные заявок сохраняются одним setItem.
// Обработчик readwrite-транзакции выполняет чтение, проверку и запись синхронно.
let database;
function openGate() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const req = indexedDB.open("uyut-write-gate", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("gate");
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
      req.onerror = () => {
        database = undefined;
        reject(req.error);
      };
    });
  return database;
}
async function gate(action) {
  const db = await openGate();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("gate", "readwrite");
    let result, reason;
    tx.objectStore("gate").get(0).onsuccess = () => {
      try {
        result = action();
      } catch (error) {
        reason = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(reason || tx.error || Error("Запись прервана."));
  });
}
async function modify(edit) {
  const action = () => {
    const data = state(),
      result = edit(data);
    localStorage.setItem(KEY, JSON.stringify(data));
    return result;
  };
  // При наличии IndexedDB обе ветви используют общий шлюз даже при разных возможностях вкладок.
  const guarded = () => (window.indexedDB ? gate(action) : action());
  let result;
  if (navigator.locks) result = await navigator.locks.request(LOCK, guarded);
  else if (window.indexedDB) result = await gate(action);
  else
    throw Error(
      "Браузер не предоставляет блокировку записи. Откройте демо в обычном окне современного браузера.",
    );
  document.dispatchEvent(new Event("uyut-data"));
  return result;
}
function reserve(data, draft, start, date, worker, visitor = true) {
  const window = windows(data.rows, date, draft.calc, worker).find((s) => s.start === start);
  if (!window) throw Error("Это время уже недоступно. Данные формы сохранены. Выберите другое окно.");
  if (
    visitor &&
    data.rows.some((r) => r.phone === draft.phone && Date.now() - Date.parse(r.created) < 5000)
  )
    throw Error("Подождите 5 секунд перед следующей отправкой.");
  const row = {
    ...draft,
    id: "У-" + String(data.next++).padStart(4, "0"),
    created: new Date().toISOString(),
    date,
    start,
    end: window.end,
    worker: window.workers[0],
    status: "Новая",
    consentAt: visitor ? new Date().toISOString() : null,
  };
  data.rows.push(row);
  return row.id;
}
function button(text, action, cls = "btn plain small") {
  const b = node("button", text, cls);
  b.type = "button";
  b.addEventListener("click", action);
  return b;
}
function setPressed(b, value) {
  b.setAttribute("aria-pressed", String(value));
}
function detail(dl, label, value) {
  const dd = node("dd");
  dd.append(value instanceof Node ? value : document.createTextNode(String(value ?? "—")));
  dl.append(node("dt", label), dd);
}
function extrasText(calc) {
  return calc.extras.map((key) => PRICES[calc.type].extras[key]?.[0] || key).join(", ") || "Без дополнений";
}
function recordDetails(row) {
  const dl = node("dl"),
    c = row.calc,
    phone = node("a", row.phone);
  phone.href = "tel:" + row.phone.replace(/[^\d+]/g, "");
  const created = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(row.created));
  for (const [k, v] of [
    ["Создана", created + " МСК"],
    ["Имя", row.name],
    ["Телефон", phone],
    ["Направление", typeName(c.type)],
    ["Услуга", c.label],
    ["Выезд", dayText(row.date) + ", " + interval(row) + " МСК"],
    ["Исполнитель", row.worker],
    ["Адрес", row.locality + ", " + row.address],
    ["Площадь", c.area + " м²"],
    ["Комнаты / санузлы", c.rooms + " / " + c.baths],
    ["Опции", extrasText(c)],
    ["Расчёт · демо", "от " + money(c.total)],
    ["Комментарий", row.comment || "—"],
    ["Статус", row.status],
  ])
    detail(dl, k, v);
  return dl;
}
function safeError(err) {
  return err instanceof DOMException
    ? "Браузер не смог сохранить данные. Проверьте настройки хранилища. Поля остались заполненными."
    : err.message;
}
const form = $("#book-form");
let date = nowInMoscow().date,
  selected = null,
  month = "",
  oldType = "",
  availableRows = [];
function chooseDate(next) {
  const fromCalendar = $("#calendar").open;
  date = next;
  selected = null;
  if (fromCalendar) $("#calendar").close();
  refreshBooking();
  (fromCalendar ? $("#other-date") : $("#days [aria-pressed=true]"))?.focus({ preventScroll: true });
}
function dateButton(iso, compact, calc, worker, now) {
  const day = Number(iso.slice(-2)),
    weekday = dayText(iso, { weekday: "short" });
  const b = button(compact ? String(day) : weekday, () => chooseDate(iso), "");
  if (!compact) b.append(node("small", dayText(iso, { day: "numeric", month: "short" })));
  b.dataset.day = iso;
  b.setAttribute("aria-label", dayText(iso));
  setPressed(b, date === iso);
  b.disabled = !windows(availableRows, iso, calc, worker, now).length;
  return b;
}
function moveMonth(ym, offset) {
  const d = new Date(ym + "-01T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}
function renderCalendar() {
  const grid = $("#cal-grid"),
    calc = selection(),
    worker = $("#crew").value,
    now = nowInMoscow(),
    end = shiftDay(now.date, 59);
  if (!month) month = date.slice(0, 7);
  $("#cal-month").textContent = dayText(month + "-01", { month: "long", year: "numeric" });
  $("#prev-month").disabled = month <= now.date.slice(0, 7);
  $("#next-month").disabled = month >= end.slice(0, 7);
  const nodes = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((v) => node("span", v));
  const start = month + "-01",
    dayOfWeek = new Date(start + "T12:00Z").getUTCDay();
  for (let i = 0; i < (dayOfWeek + 6) % 7; i++) nodes.push(node("span"));
  for (let iso = start; iso.startsWith(month); iso = shiftDay(iso, 1))
    nodes.push(dateButton(iso, true, calc, worker, now));
  grid.replaceChildren(...nodes);
}
function refreshBooking() {
  if (!form) return;
  const calc = selection(),
    crew = $("#crew"),
    now = nowInMoscow();
  if (calc.type !== oldType) {
    const workers = schedule(calc).workers;
    crew.replaceChildren(
      ...(calc.type === "cleaning" ? [option("any", "Любая бригада")] : []),
      ...workers.map((w) => option(w, w)),
    );
    oldType = calc.type;
    selected = null;
  }
  const city = calc.zone === "city";
  $("#district-label").hidden = !city;
  $("#town-label").hidden = city;
  form.elements.district.required = city;
  form.elements.town.required = !city;
  $("#order-line").textContent =
    calc.label +
    " · " +
    calc.area +
    " м² · " +
    (calc.area >= 20 && calc.area <= 200 ? "от " + money(calc.total) : "укажите площадь 20–200 м²");
  $("#duration").textContent =
    calc.type === "cleaning"
      ? "Длительность: " + duration(calc) / 60 + " ч. Одна бригада на весь выезд. График · демо."
      : "Бесплатный замер · 2 часа. График · демо.";
  try {
    availableRows = state().rows;
  } catch (err) {
    $("#booking-status").textContent = safeError(err);
    return;
  }
  if (date < now.date) date = now.date;
  const days = Array.from({ length: 14 }, (_, i) =>
    dateButton(shiftDay(now.date, i), false, calc, crew.value, now),
  );
  $("#days").replaceChildren(...days);
  $("#other-date").textContent =
    date > shiftDay(now.date, 13) ? dayText(date) + " · изменить" : "Другая дата";
  const slots = windows(availableRows, date, calc, crew.value, now);
  if (selected !== null && !slots.some((s) => s.start === selected)) {
    selected = null;
    $("#booking-status").textContent =
      "Выбранное время уже недоступно. Данные формы сохранены. Выберите другое окно.";
  }
  const slotButtons = slots.map((s) => {
    const b = button(
      calc.type === "cleaning" ? hm(s.start) : interval(s),
      () => {
        selected = s.start;
        $("#booking-status").textContent = "";
        for (const el of $("#times").children) setPressed(el, el === b);
      },
      "",
    );
    b.dataset.start = s.start;
    setPressed(b, selected === s.start);
    return b;
  });
  $("#times").replaceChildren(
    ...(slots.length ? slotButtons : [node("p", "Свободных окон на эту дату нет.")]),
  );
  if ($("#calendar").open) renderCalendar();
}
// Российские мобильные и городские номера, включая региональные коды на 8.
// Демо-контакт +7 (000) … служит только подписью.
const russianContact =
  /^(?:9\d{9}|(?:3(?:0[12]|36|4[1-35-79]|5[1-3]|65|8[1-58]|9[0145])|4(?:01|1[1356]|2[13467]|7[1-5]|8[1-7]|9[1-689])|8(?:0[03489]|1[1-8]|2[01]|3[13-6]|4[0-8]|5[15-7]|6[0-35-79]|7[1-37-9]))\d{7})$/;
function national(value) {
  const digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+") && !value.trim().startsWith("+7")) return null;
  if (value.trim().startsWith("+7") || (digits.length === 11 && /^[78]/.test(digits)))
    return digits.slice(1);
  return digits;
}
function mask(d) {
  const groups = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)];
  return (
    "+7" +
    (groups[0] ? " (" + groups[0] : "") +
    (groups[1] ? ") " + groups[1] : "") +
    (groups[2] ? "-" + groups[2] : "") +
    (groups[3] ? "-" + groups[3] : "")
  );
}
function setupForm() {
  const f = form.elements;
  f.district.replaceChildren(
    option("", "Выберите район"),
    ...Array.from(new Set(districts))
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map((x) => option(x, x)),
  );
  f.phone.addEventListener("input", () => {
    const raw = f.phone.value;
    if (raw === "+" || raw === "7" || raw === "8") {
      if (raw !== "+") f.phone.value = "+7 ";
      f.phone.setCustomValidity("Введите российский номер телефона.");
      return;
    }
    const d = national(raw),
      right = raw.slice(f.phone.selectionStart).replace(/\D/g, "").length;
    if (d !== null && d.length <= 10 && raw) {
      f.phone.value = mask(d);
      if (right) {
        let p = f.phone.value.length,
          n = right;
        while (p && n) {
          p--;
          if (/\d/.test(f.phone.value[p])) n--;
        }
        f.phone.setSelectionRange(p, p);
      }
    }
    f.phone.setCustomValidity(
      russianContact.test(d || "") ? "" : "Введите российский номер, например +7 (999) 000-00-00.",
    );
  });
  $("#crew").addEventListener("change", () => {
    selected = null;
    refreshBooking();
  });
  $("#other-date").addEventListener("click", () => {
    month = date.slice(0, 7);
    renderCalendar();
    $("#calendar").showModal();
  });
  $("#prev-month").addEventListener("click", () => {
    month = moveMonth(month, -1);
    renderCalendar();
  });
  $("#next-month").addEventListener("click", () => {
    month = moveMonth(month, 1);
    renderCalendar();
  });
  document.addEventListener("uyut-calculation", refreshBooking);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("#booking-status"),
      submit = form.querySelector("[type=submit]");
    if (submit.disabled) return;
    const d = national(f.phone.value);
    if (!russianContact.test(d || "")) {
      f.phone.setCustomValidity("Введите российский номер телефона.");
      f.phone.reportValidity();
      return;
    }
    if (!$("#area").reportValidity() || !$("#area").value) {
      $("#area").focus();
      return;
    }
    if (selected === null) {
      if (!message.textContent.includes("недоступно"))
        message.textContent = "Выберите свободное время. Введённые данные сохранены.";
      $("#times button")?.focus();
      return;
    }
    if (f.website.value) {
      message.textContent = "Отправка отклонена.";
      return;
    }
    const calc = selection(),
      locality = calc.zone === "city" ? f.district.value : f.town.value.trim();
    if (!f.name.value.trim() || !f.address.value.trim() || !locality) {
      message.textContent = "Заполните имя, населённый пункт или район и адрес выезда.";
      return;
    }
    const draft = {
      calc,
      name: f.name.value.trim(),
      phone: "+7" + d,
      address: f.address.value.trim(),
      locality,
      comment: f.comment.value.trim(),
    };
    const chosenStart = selected,
      chosenDate = date,
      worker = $("#crew").value;
    submit.disabled = true;
    try {
      const id = await modify((data) => reserve(data, draft, chosenStart, chosenDate, worker));
      // Только номер записи попадает во фрагмент. Персональные данные остаются в браузере.
      try {
        sessionStorage.setItem(RECEIPT, id);
      } catch {}
      location.assign("thanks.html#" + encodeURIComponent(id));
    } catch (error) {
      refreshBooking();
      message.textContent = safeError(error);
      submit.disabled = false;
    }
  });
  refreshBooking();
  form.querySelector("[type=submit]").disabled = false;
  // Пересчитываем прошедшие окна без ежеминутного сброса фокуса на кнопках.
  const updateOnReturn = () => {
    if (!document.hidden) refreshBooking();
  };
  document.addEventListener("visibilitychange", updateOnReturn);
}
if (form) setupForm();

const admin = $("#admin"),
  adminContent = $("#admin-content");
let unlocked = false,
  sound = false,
  audioContext = null,
  knownIds = new Set();
let controls = null,
  list = null,
  adminMessage = null;
function renderReceipt() {
  const host = $("#receipt");
  if (!host) return;
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(1));
    if (!/^У-\d+$/.test(id)) id = sessionStorage.getItem(RECEIPT);
    const row = state().rows.find((r) => r.id === id);
    if (!row) {
      host.replaceChildren(node("p", "В этом браузере нет сохранённой сводки для этой заявки."));
      return;
    }
    const heading = node("h2", "Заявка " + row.id);
    host.replaceChildren(heading, recordDetails(row));
    if (row.status === "Новая" || row.status === "Подтверждена")
      host.append(
        button("Отменить запись", async () => {
          if (!confirm("Отменить эту запись и освободить окно?")) return;
          try {
            await changeStatus(row.id, cancelled);
          } catch (error) {
            host.append(node("p", safeError(error)));
          }
        }),
      );
  } catch (error) {
    host.replaceChildren(node("p", safeError(error)));
  }
}
function changeStatus(id, status) {
  return modify((data) => {
    const row = data.rows.find((r) => r.id === id);
    if (!row) throw Error("Эту заявку уже удалили.");
    if (!statuses.includes(status)) throw Error("Неизвестный статус.");
    if (row.status === cancelled && status !== cancelled) {
      const slot = windows(data.rows, row.date, row.calc, row.worker).find((s) => s.start === row.start);
      if (!slot) throw Error("Восстановить запись нельзя: окно уже занято или прошло.");
    }
    row.status = status;
  });
}
function makeFilter(labelText, id, items) {
  const label = node("label", labelText),
    select = node("select");
  select.id = id;
  select.append(...items.map(([v, t]) => option(v, t)));
  label.append(select);
  return label;
}
async function adminAction(action, success) {
  try {
    await action();
    renderList();
    adminMessage.textContent = success;
  } catch (error) {
    renderList();
    adminMessage.textContent = safeError(error);
  }
}
function addTest() {
  return modify((data) => {
    const calc = {
      type: "cleaning",
      kind: "deep",
      area: 60,
      rooms: 1,
      baths: 1,
      zone: "city",
      extras: [],
      label: PRICES.cleaning.kinds.deep[0],
    };
    calc.total = estimate(calc);
    const today = nowInMoscow().date;
    for (let i = 0; i < 60; i++) {
      const day = shiftDay(today, i),
        slot = windows(data.rows, day, calc)[0];
      if (!slot) continue;
      reserve(
        data,
        {
          calc,
          name: "ФИО И.И.И. · демо",
          phone: "+70000000000",
          locality: "Арбат",
          address: "Демо-адрес",
          comment: "Тестовая заявка",
        },
        slot.start,
        day,
        "any",
        false,
      );
      return;
    }
    throw Error("Свободных окон для тестовой заявки нет.");
  });
}
function renderList() {
  if (!unlocked || !list) return;
  let rows;
  try {
    rows = state().rows;
  } catch (err) {
    adminMessage.textContent = safeError(err);
    return;
  }
  const query = $("#admin-query").value.trim().toLocaleLowerCase("ru");
  const status = $("#admin-status").value,
    type = $("#admin-type").value;
  const filtered = rows
    .filter(
      (r) =>
        (!status || r.status === status) &&
        (!type || r.calc.type === type) &&
        [r.id, r.name, r.phone, r.address, r.locality, r.worker, r.date, r.calc.label]
          .join(" ")
          .toLocaleLowerCase("ru")
          .includes(query),
    )
    .reverse();
  if (!filtered.length) {
    list.replaceChildren(node("p", "Заявок по этим условиям пока нет."));
    return;
  }
  const articles = filtered.map((r) => {
    const article = node("article");
    article.append(node("h3", "Заявка " + r.id), recordDetails(r));
    const label = node("label", "Изменить статус"),
      select = node("select");
    select.setAttribute("aria-label", "Статус " + r.id);
    select.append(...statuses.map((s) => option(s, s)));
    select.value = r.status;
    select.addEventListener("change", () =>
      adminAction(() => changeStatus(r.id, select.value), "Статус обновлён."),
    );
    label.append(select);
    const remove = button("Удалить", () => {
      if (confirm("Удалить заявку " + r.id + "?"))
        void adminAction(
          () =>
            modify((data) => {
              data.rows = data.rows.filter((row) => row.id !== r.id);
            }),
          "Заявка удалена.",
        );
    });
    const tools = node("div", undefined, "admin-tools");
    tools.append(label, remove);
    article.append(tools);
    return article;
  });
  list.replaceChildren(...articles);
}
function beep() {
  if (!sound || !audioContext || audioContext.state !== "running") return;
  const oscillator = audioContext.createOscillator(),
    gain = audioContext.createGain();
  oscillator.frequency.value = 540;
  gain.gain.setValueAtTime(0.045, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}
function initAdmin() {
  if (!unlocked) {
    const login = node("form"),
      label = node("label", "Демо-PIN"),
      pin = node("input"),
      enter = node("button", "Открыть список", "btn dark"),
      message = node("p");
    pin.type = "text";
    pin.inputMode = "numeric";
    pin.maxLength = 4;
    pin.required = true;
    label.append(pin);
    message.setAttribute("role", "status");
    login.append(
      node("p", "Публичный демо-PIN: 1234. Он не защищает данные в браузере."),
      label,
      enter,
      message,
    );
    login.addEventListener("submit", (e) => {
      e.preventDefault();
      if (pin.value === "1234") {
        unlocked = true;
        initAdmin();
        $("#admin-query").focus();
      } else {
        message.textContent = "Введите демо-PIN 1234.";
        pin.select();
      }
    });
    adminContent.replaceChildren(login);
    return;
  }
  controls = node("div", undefined, "admin-tools");
  list = node("div");
  adminMessage = node("p", undefined, "message");
  adminMessage.setAttribute("role", "status");
  const queryLabel = node("label", "Поиск по заявкам"),
    query = node("input");
  query.type = "search";
  query.id = "admin-query";
  queryLabel.append(query);
  const stateSelect = makeFilter("Статус", "admin-status", [
    ["", "Все статусы"],
    ...statuses.map((s) => [s, s]),
  ]);
  const typeSelect = makeFilter("Направление", "admin-type", [
    ["", "Оба направления"],
    ["cleaning", "Уборка"],
    ["renovation", "Ремонт"],
  ]);
  controls.append(queryLabel, stateSelect, typeSelect);
  controls.addEventListener("input", renderList);
  const actions = node("div", undefined, "admin-tools"),
    soundLabel = node("label", undefined, "check"),
    toggle = node("input");
  toggle.type = "checkbox";
  toggle.checked = sound;
  soundLabel.append(toggle, node("span", "Звук новых заявок"));
  toggle.addEventListener("change", async () => {
    sound = toggle.checked;
    if (sound)
      try {
        audioContext ||= new AudioContext();
        await audioContext.resume();
      } catch {
        sound = false;
        toggle.checked = false;
        adminMessage.textContent = "Звук недоступен в этом браузере.";
      }
  });
  actions.append(
    button("Добавить тестовую заявку", () => adminAction(addTest, "Тестовая заявка добавлена.")),
    button("Очистить демо-данные", () => {
      if (confirm("Удалить все демо-заявки и освободить их окна?"))
        void adminAction(
          () =>
            modify((data) => {
              data.rows = [];
            }),
          "Демо-заявки очищены.",
        );
    }),
    soundLabel,
  );
  adminContent.replaceChildren(controls, actions, adminMessage, list);
  try {
    knownIds = new Set(state().rows.map((r) => r.id));
  } catch {}
  renderList();
}
function handleAdminHash() {
  if (location.hash === "#admin") {
    if (!admin.open) {
      initAdmin();
      admin.showModal();
    }
  } else if (admin.open) admin.close();
}
admin.addEventListener("close", () => {
  if (location.hash === "#admin") history.replaceState(null, "", location.pathname + location.search);
  unlocked = false;
  sound = false;
  list = null;
  controls = null;
});
function onData() {
  refreshBooking();
  renderReceipt();
  if (admin.open && unlocked) {
    try {
      const ids = new Set(state().rows.map((r) => r.id));
      if ([...ids].some((id) => !knownIds.has(id))) beep();
      knownIds = ids;
    } catch {}
    renderList();
  }
}
document.addEventListener("uyut-data", onData);
window.addEventListener("storage", (event) => {
  if (event.key === KEY || event.key === null) onData();
});
window.addEventListener("hashchange", () => {
  handleAdminHash();
  renderReceipt();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    onData();
    const submit = form?.querySelector('[type="submit"]');
    if (submit) submit.disabled = false;
  }
});
handleAdminHash();
renderReceipt();
