let csrf = "";
export function setCsrf(token: string) {
  csrf = token;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (response.status === 401 && path !== "/login")
    window.dispatchEvent(new Event("session-expired"));
  if (!response.ok) throw new Error(data.message || "请求失败，请稍后重试");
  return data;
}
