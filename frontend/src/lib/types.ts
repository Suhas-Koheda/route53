export interface HostedZone {
  id: number;
  name: string;
  comment: string | null;
  zone_type: string;
  record_count: number;
  created_at: string | null;
  created_by: string | null;
  zone_id_str: string | null;
}

export interface DnsRecord {
  id: number;
  zone_id: number;
  name: string;
  type: string;
  value: string;
  ttl: number;
  routing_policy: string;
  weight: number | null;
  region: string | null;
  failover_type: string | null;
  set_identifier: string | null;
}

export interface HostedZoneCreateInput {
  name: string;
  comment?: string;
  zone_type?: string;
}

export interface HostedZoneUpdateInput {
  comment?: string;
}

export interface DnsRecordCreateInput {
  name: string;
  type: string;
  value: string;
  ttl?: number;
  routing_policy?: string;
  weight?: number | null;
  region?: string | null;
  failover_type?: string | null;
  set_identifier?: string | null;
}

export interface DnsRecordUpdateInput {
  name?: string;
  type?: string;
  value?: string;
  ttl?: number;
  routing_policy?: string;
  weight?: number | null;
  region?: string | null;
  failover_type?: string | null;
  set_identifier?: string | null;
}

export interface AuthResponse {
  email: string;
  token: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  skipped_details: Array<{ name: string; type: string; reason: string }>;
}
