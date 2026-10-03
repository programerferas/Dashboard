// The single place that talks to the API. Every other file goes through this, so
// error handling, credentials and the base URL are defined once.
//
// In development Vite proxies /api to the Express server (see vite.config.js); in
// production Vercel does the same (see vercel.json). Either way the base URL is
// empty and requests are same-origin, so the session cookie is first-party and
// works in every browser. Leave VITE_API_URL unset on Vercel.
const BASE_URL = import.meta.env.VITE_API_URL ?? "";

// Thrown for any non-2xx response, carrying the status so callers can react to
// a 401 (session expired) differently from a 422 (bad input).
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Turns { search: "sara", city: "" } into "?search=sara" — empty values are
// dropped so the URL only carries filters that are actually set.
export const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === "ALL") continue;
    query.set(key, String(value));
  }

  const asString = query.toString();
  return asString ? `?${asString}` : "";
};

const request = async (path, { method = "GET", body, signal } = {}) => {
  let response;

  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      signal,
      // The session cookie is httpOnly, so it has to be sent by the browser.
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    // fetch only rejects when the request never got an answer.
    if (error.name === "AbortError") throw error;
    throw new ApiError("تعذّر الاتصال بالخادم. هل الخادم الخلفي (API) يعمل؟", 0);
  }

  if (response.status === 204) return null;

  // A crashed server or a proxy can answer with HTML; do not let JSON.parse
  // failures surface as a confusing "Unexpected token <".
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.message ?? `فشل الطلب (${response.status})`, response.status);
  }

  return payload;
};

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};
