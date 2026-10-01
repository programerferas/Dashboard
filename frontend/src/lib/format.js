// Display helpers. The API returns raw values (ISO dates, enum names) and every
// bit of prettifying happens here, so the same date never looks different on two
// pages.

// Arabic month names with Western digits, so dates match the IDs (C001) and
// phone numbers shown next to them.
const LOCALE = "ar-u-nu-latn";

const DATE_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Anything missing shows as an em dash rather than "null" or an empty cell.
export const EMPTY = "—";

export const formatDate = (value) => {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : DATE_FORMAT.format(date);
};

export const formatDateTime = (value) => {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : DATE_TIME_FORMAT.format(date);
};

// The value an <input type="date"> expects.
export const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // Built by hand rather than with toISOString, which would shift the day for
  // anyone east or west of UTC.
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export const todayInputValue = () => toDateInputValue(new Date());

// "3 days ago" reads faster than a date when scanning recent activity.
export const relativeDate = (value) => {
  if (!value) return EMPTY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;

  const days = Math.round((Date.now() - date.getTime()) / 86_400_000);

  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 0) return formatDate(value);
  if (days < 30) return `منذ ${countOf(days, "day")}`;
  if (days < 365) return `منذ ${countOf(Math.round(days / 30), "month")}`;
  return formatDate(value);
};

export const formatNumber = (value) =>
  typeof value === "number" ? value.toLocaleString(LOCALE) : EMPTY;

export const orEmpty = (value) => {
  if (value === null || value === undefined || value === "") return EMPTY;
  return value;
};

// The Arabic name of every enum value the database sends: sources, genders,
// order statuses and roles.
const ENUM_LABELS = {
  INSTAGRAM: "إنستغرام",
  FACEBOOK: "فيسبوك",
  WHATSAPP: "واتساب",
  REFERRAL: "توصية",
  WEBSITE: "الموقع الإلكتروني",
  WALK_IN: "زيارة المحل",
  OTHER: "أخرى",
  MALE: "ذكر",
  FEMALE: "أنثى",
  PENDING: "قيد الانتظار",
  PROCESSING: "قيد التنفيذ",
  READY: "جاهز",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغى",
  ADMIN: "مدير",
  EMPLOYEE: "موظف",
};

// "WALK_IN" -> "زيارة المحل". Used for every enum coming from the database; an
// unknown value falls back to readable English rather than showing nothing.
export const humanise = (value) => {
  if (!value) return EMPTY;
  if (ENUM_LABELS[value]) return ENUM_LABELS[value];
  const words = String(value).toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// The two letters shown in an avatar circle.
export const initials = (name) => {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

// Arabic nouns change form with the number: 1, 2, 3-10, 11-99 and 100+ each
// read differently, and Intl.PluralRules says which form a number takes.
const NOUNS = {
  order: { one: "طلب واحد", two: "طلبان", few: "طلبات", many: "طلبًا", other: "طلب" },
  item: { one: "قطعة واحدة", two: "قطعتان", few: "قطع", many: "قطعة", other: "قطعة" },
  customer: { one: "عميل واحد", two: "عميلان", few: "عملاء", many: "عميلًا", other: "عميل" },
  product: { one: "منتج واحد", two: "منتجان", few: "منتجات", many: "منتجًا", other: "منتج" },
  category: { one: "فئة واحدة", two: "فئتان", few: "فئات", many: "فئة", other: "فئة" },
  time: { one: "مرة واحدة", two: "مرتين", few: "مرات", many: "مرة", other: "مرة" },
  day: { one: "يوم", two: "يومين", few: "أيام", many: "يومًا", other: "يوم" },
  month: { one: "شهر", two: "شهرين", few: "أشهر", many: "شهرًا", other: "شهر" },
};

const PLURAL_RULES = new Intl.PluralRules("ar");

// countOf(3, "order") -> "3 طلبات", countOf(1, "order") -> "طلب واحد".
export const countOf = (count, noun) => {
  const forms = NOUNS[noun];
  const rule = PLURAL_RULES.select(count);
  if (rule === "one" || rule === "two") return forms[rule];
  return `${formatNumber(count)} ${forms[rule] ?? forms.other}`;
};
