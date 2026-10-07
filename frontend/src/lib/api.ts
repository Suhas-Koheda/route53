import type { AuthResponse, DnsRecord, DnsRecordCreateInput, DnsRecordUpdateInput, HostedZone, HostedZoneCreateInput, HostedZoneUpdateInput, ImportResult } from "@/lib/types";

const API_URL = "/api";

function getToken(): string {
  return typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
}

function clearSessionAndRedirect() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  document.cookie = "session=; path=/; max-age=0";
  window.location.assign(new URL("/login", window.location.origin).toString());
}

interface FastApiError {
  detail?: string | Array<{ msg?: string } | string>;
}

async function parseError(res: Response): Promise<Error> {
  let message = `Request failed (${res.status})`;
  const body: FastApiError | null = await res.json().catch(() => null) as FastApiError | null;
  if (Array.isArray(body?.detail)) {
    message = body.detail
      .map((d) => (typeof d === "string" ? d : d && typeof d === "object" && "msg" in d ? String(d.msg) : ""))
      .filter(Boolean)
      .join(", ") || message;
  } else if (typeof body?.detail === "string") {
    message = body.detail;
  }
  return new Error(message);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData } = options;
  const headers: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (body !== undefined && !formData) {
    headers["Content-Type"] = "application/json";
  }
  const init: RequestInit = { method, headers };
  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_URL}${path}`, init);
  if (res.status === 401) {
    clearSessionAndRedirect();
    throw new Error("Session expired. Redirecting to login.");
  }
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as T;
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/signup", { method: "POST", body: { email, password } });
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
}

export async function getZones(): Promise<HostedZone[]> {
  return request<HostedZone[]>("/hosted-zones");
}

export async function getZone(id: number | string): Promise<HostedZone> {
  return request<HostedZone>(`/hosted-zones/${id}`);
}

export async function createZone(name: string, comment?: string, zoneType?: string): Promise<HostedZone> {
  const body: HostedZoneCreateInput = { name };
  if (comment !== undefined) body.comment = comment;
  if (zoneType !== undefined) body.zone_type = zoneType;
  return request<HostedZone>("/hosted-zones", { method: "POST", body });
}

export async function updateZone(id: number, data: HostedZoneUpdateInput): Promise<HostedZone> {
  return request<HostedZone>(`/hosted-zones/${id}`, { method: "PUT", body: data });
}

export async function deleteZone(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/hosted-zones/${id}`, { method: "DELETE" });
}

export async function getRecords(zoneId: number): Promise<DnsRecord[]> {
  return request<DnsRecord[]>(`/hosted-zones/${zoneId}/records`);
}

export async function createRecord(zoneId: number, data: DnsRecordCreateInput): Promise<DnsRecord> {
  return request<DnsRecord>(`/hosted-zones/${zoneId}/records`, { method: "POST", body: data });
}

export async function updateRecord(id: number, data: DnsRecordUpdateInput): Promise<DnsRecord> {
  return request<DnsRecord>(`/records/${id}`, { method: "PUT", body: data });
}

export async function deleteRecord(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/records/${id}`, { method: "DELETE" });
}

export async function exportZone(zoneId: number, format: "json" | "bind"): Promise<unknown> {
  const res = await fetch(`${API_URL}/hosted-zones/${zoneId}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401) {
    clearSessionAndRedirect();
    throw new Error("Session expired. Redirecting to login.");
  }
  if (!res.ok) {
    throw await parseError(res);
  }
  return format === "json" ? res.json() : res.text();
}

export async function importZone(zoneId: number, file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return request<ImportResult>(`/hosted-zones/${zoneId}/import`, { method: "POST", formData });
}
