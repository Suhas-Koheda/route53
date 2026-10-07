const API_URL = "/api";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function signup(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(", ") : err.detail || "Signup failed");
  }
  return res.json();
}

export async function loginApi(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(", ") : err.detail || "Login failed");
  }
  return res.json();
}

export async function getZones() {
  const res = await fetch(`${API_URL}/hosted-zones`, { headers: authHeaders() });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
  return res.json();
}

export async function createZone(name: string, comment?: string, zoneType?: string) {
  const res = await fetch(`${API_URL}/hosted-zones`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, comment, zone_type: zoneType }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(", ") : err.detail || "Failed");
  }
  return res.json();
}

export async function updateZone(id: number, data: { name?: string; comment?: string; zone_type?: string }) {
  const res = await fetch(`${API_URL}/hosted-zones/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(", ") : err.detail || "Failed");
  }
  return res.json();
}

export async function deleteZone(id: number) {
  const res = await fetch(`${API_URL}/hosted-zones/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
}

export async function getRecords(zoneId: number) {
  const res = await fetch(`${API_URL}/hosted-zones/${zoneId}/records`, { headers: authHeaders() });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
  return res.json();
}

export async function createRecord(zoneId: number, data: any) {
  const res = await fetch(`${API_URL}/hosted-zones/${zoneId}/records`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(", ") : err.detail || "Failed");
  }
  return res.json();
}

export async function updateRecord(id: number, data: any) {
  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(Array.isArray(err.detail) ? err.detail.map((d: any) => d.msg).join(", ") : err.detail || "Failed");
  }
  return res.json();
}

export async function deleteRecord(id: number) {
  const res = await fetch(`${API_URL}/records/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed"); }
}
