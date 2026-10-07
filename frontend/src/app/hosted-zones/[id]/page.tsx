"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Table from "@cloudscape-design/components/table";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import Pagination from "@cloudscape-design/components/pagination";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Link from "@cloudscape-design/components/link";
import TextFilter from "@cloudscape-design/components/text-filter";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select, { SelectProps } from "@cloudscape-design/components/select";
import Flashbar from "@cloudscape-design/components/flashbar";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { getRecords, createRecord, updateRecord, deleteRecord, getZone, deleteZone } from "@/lib/api";
import type { DnsRecord, HostedZone } from "@/lib/types";

const RECORD_TYPES: SelectProps.Option[] = [
  { label: "A", value: "A" },
  { label: "AAAA", value: "AAAA" },
  { label: "CNAME", value: "CNAME" },
  { label: "TXT", value: "TXT" },
  { label: "MX", value: "MX" },
  { label: "NS", value: "NS" },
  { label: "PTR", value: "PTR" },
  { label: "SRV", value: "SRV" },
  { label: "CAA", value: "CAA" },
  { label: "SOA", value: "SOA" },
];

const VALUE_PLACEHOLDERS: Record<string, string> = {
  A: "192.0.2.1",
  AAAA: "2001:db8::1",
  CNAME: "example.com",
  TXT: '"v=spf1 include:_spf.example.com ~all"',
  MX: "10 mail.example.com",
  NS: "ns-123.awsdns-45.com",
  PTR: "example.com",
  SRV: "10 5 5060 sip.example.com",
  CAA: '0 issue "amazon.com"',
  SOA: "ns-111.awsdns-01.com. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400",
};

function validateValue(type: string, value: string): string | null {
  const v = value.trim();
  if (!v) return "Value is required";
  switch (type) {
    case "A":
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return "Invalid IPv4 address";
      return null;
    case "AAAA":
      if (!/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(v) && !/^::$/.test(v)) return "Invalid IPv6 address";
      return null;
    case "CNAME":
    case "NS":
    case "PTR":
      if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(v)) return "Invalid domain name";
      return null;
    case "SOA":
      return null;
    case "MX":
      if (!/^\d+\s+\S+$/.test(v)) return "Format: priority domain (e.g. 10 mail.example.com)";
      return null;
    case "SRV":
      if (!/^\d+\s+\d+\s+\d+\s+\S+$/.test(v)) return "Format: priority weight port target";
      return null;
    case "TXT":
      if (v.length > 255) return "TXT value too long (max 255 chars)";
      return null;
    case "CAA":
      if (!/^\d+\s+(issue|issuewild|iodef)\s+".*"$/.test(v)) return 'Format: flag tag "value" (e.g. 0 issue "amazon.com")';
      return null;
    default:
      return null;
  }
}

const TYPE_OPTIONS: SelectProps.Option[] = [{ label: "All types", value: "All" }, ...RECORD_TYPES];
const POLICY_OPTIONS: SelectProps.Option[] = [
  { label: "All policies", value: "All" },
  { label: "Simple", value: "Simple" },
  { label: "Weighted", value: "Weighted" },
  { label: "Latency", value: "Latency" },
  { label: "Failover", value: "Failover" },
  { label: "Geolocation", value: "Geolocation" },
];

export default function ZoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const zoneId = Number(id);
  const [records, setRecords] = useState<DnsRecord[] | null>(null);
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DnsRecord | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<SelectProps.Option>({ label: "A", value: "A" });
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("300");
  const [routingPolicy, setRoutingPolicy] = useState<SelectProps.Option>({ label: "Simple", value: "Simple" });
  const [weight, setWeight] = useState("");
  const [region, setRegion] = useState("");
  const [failoverType, setFailoverType] = useState<SelectProps.Option>({ label: "PRIMARY", value: "PRIMARY" });
  const [setIdentifier, setSetIdentifier] = useState("");
  const [flashes, setFlashes] = useState<Array<object>>([]);
  const router = useRouter();

  const [typeFilter, setTypeFilter] = useState<SelectProps.Option>(TYPE_OPTIONS[0]);
  const [routingFilter, setRoutingFilter] = useState<SelectProps.Option>(POLICY_OPTIONS[0]);

  const flash = (type: "success" | "error" | "info", content: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFlashes((prev) => [...prev, { type, content, dismissible: true, onDismiss: () => setFlashes((p) => p.filter((f) => (f as { id?: string }).id !== id)) }]);
    setTimeout(() => setFlashes((p) => p.filter((f) => (f as { id?: string }).id !== id)), 4000);
  };

  const load = () => getRecords(zoneId).then(setRecords).catch(() => { setRecords([]); flash("error", "Unable to load records"); });
  useEffect(() => {
    load();
    getZone(zoneId).then(setZone).catch(() => setZone(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId]);

  const filtered = (records || []).filter(
    (r) =>
      (typeFilter.value === "All" || r.type === typeFilter.value) &&
      (routingFilter.value === "All" || (r.routing_policy || "Simple") === routingFilter.value)
  );

  const { items, filterProps, paginationProps, collectionProps, filteredItemsCount } = useCollection<DnsRecord>(filtered, {
    sorting: { defaultState: { sortingColumn: { sortingField: "name" }, isDescending: false } },
    pagination: { pageSize: 10 },
    selection: { trackBy: "id" },
    filtering: {
      filteringFunction: (item, filteringText) =>
        item.name.toLowerCase().includes(filteringText.toLowerCase()) ||
        item.type.toLowerCase().includes(filteringText.toLowerCase()) ||
        item.value.toLowerCase().includes(filteringText.toLowerCase()),
    },
  });

  const [modalError, setModalError] = useState("");

  const handleSave = async () => {
    const error = validateValue(type.value ?? "A", value);
    if (error) {
      setModalError(error);
      return;
    }
    setModalError("");
    const data = {
      name,
      type: type.value ?? "A",
      value,
      ttl: Number(ttl),
      routing_policy: routingPolicy.value ?? "Simple",
      weight: weight ? Number(weight) : null,
      region: region || null,
      failover_type: failoverType.value ?? null,
      set_identifier: setIdentifier || null,
    };
    try {
      if (editing) {
        await updateRecord(editing.id, data);
        flash("success", "Record updated");
      } else {
        await createRecord(zoneId, data);
        flash("success", "Record created");
      }
      setShowModal(false);
      setModalError("");
      setEditing(null);
      setName("");
      setType({ label: "A", value: "A" });
      setValue("");
      setTtl("300");
      setRoutingPolicy({ label: "Simple", value: "Simple" });
      setWeight("");
      setRegion("");
      setFailoverType({ label: "PRIMARY", value: "PRIMARY" });
      setSetIdentifier("");
      load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed");
    }
  };

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (deleteId != null) {
      try {
        await deleteRecord(deleteId);
        flash("success", "Record deleted");
        load();
      } catch (e) {
        flash("error", e instanceof Error ? e.message : "Failed");
      }
      setDeleteId(null);
    }
  };

  const openEdit = (record: DnsRecord) => {
    setEditing(record);
    setName(record.name);
    setType({ label: record.type, value: record.type });
    setValue(record.value);
    setTtl(String(record.ttl));
    setRoutingPolicy({ label: record.routing_policy || "Simple", value: record.routing_policy || "Simple" });
    setWeight(record.weight != null ? String(record.weight) : "");
    setRegion(record.region || "");
    setFailoverType({ label: record.failover_type || "PRIMARY", value: record.failover_type || "PRIMARY" });
    setSetIdentifier(record.set_identifier || "");
    setModalError("");
    setShowModal(true);
  };

  return (
    <>
      <Flashbar items={flashes} />
      <Header
        variant="h1"
        description="Hosted zone"
        actions={<Button onClick={async () => { try { await deleteZone(zoneId); router.push("/hosted-zones"); } catch (e) { flash("error", e instanceof Error ? e.message : "Failed"); } }}>Delete hosted zone</Button>}
      >
        {zone?.name || "Hosted zone"}
      </Header>
      <Table
        {...collectionProps}
        columnDefinitions={[
          { id: "name", header: "Record name", sortingField: "name", cell: (item: DnsRecord) => item.name },
          { id: "type", header: "Type", cell: (item: DnsRecord) => item.type },
          { id: "value", header: "Value/Route traffic to", cell: (item: DnsRecord) => item.value },
          { id: "ttl", header: "TTL", cell: (item: DnsRecord) => item.ttl },
          { id: "routing_policy", header: "Routing policy", cell: (item: DnsRecord) => `${item.routing_policy || "Simple"}${item.weight ? ` (w: ${item.weight})` : ""}${item.set_identifier ? ` [${item.set_identifier}]` : ""}` },
          { id: "actions", header: "Actions", cell: (item: DnsRecord) => (
            <SpaceBetween direction="horizontal" size="xs">
              <Link key="edit" onFollow={(e) => { e.preventDefault(); openEdit(item); }}>Edit</Link>
              <Link key="delete" onFollow={(e) => { e.preventDefault(); setDeleteId(item.id); }}>Delete</Link>
            </SpaceBetween>
          ) },
        ]}
        items={items}
        variant="container"
        selectionType="single"
        pagination={<Pagination {...paginationProps} />}
        header={
          <Header
            counter={`(${filteredItemsCount ?? 0})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => { setEditing(null); setName(""); setType({ label: "A", value: "A" }); setValue(""); setTtl("300"); setRoutingPolicy({ label: "Simple", value: "Simple" }); setWeight(""); setRegion(""); setFailoverType({ label: "PRIMARY", value: "PRIMARY" }); setSetIdentifier(""); setModalError(""); setShowModal(true); }} variant="primary">
                  Create record
                </Button>
              </SpaceBetween>
            }
          >
            Records {zone?.name ? `— ${zone.name}` : ""}
          </Header>
        }
        filter={
          <SpaceBetween direction="horizontal" size="xs">
            <TextFilter {...filterProps} filteringPlaceholder="Find records" />
            <Select selectedOption={typeFilter} onChange={({ detail }) => setTypeFilter(detail.selectedOption as SelectProps.Option)} options={TYPE_OPTIONS} />
            <Select selectedOption={routingFilter} onChange={({ detail }) => setRoutingFilter(detail.selectedOption as SelectProps.Option)} options={POLICY_OPTIONS} />
          </SpaceBetween>
        }
        empty={records === null ? "Loading records..." : collectionProps.empty}
      />

      <Modal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        header={editing ? "Edit record" : "Create record"}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button key="cancel" variant="link" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button key="save" variant="primary" onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          {modalError && <Box color="text-status-error">{modalError}</Box>}
          <FormField key="name" label="Name">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="www" />
          </FormField>
          <FormField label="Type">
            <Select selectedOption={type} onChange={({ detail }) => setType(detail.selectedOption as SelectProps.Option)} options={RECORD_TYPES} />
          </FormField>
          <FormField label="Value" description={validateValue(type.value ?? "A", value) || undefined}>
            <Input value={value} onChange={({ detail }) => setValue(detail.value)} placeholder={VALUE_PLACEHOLDERS[type.value ?? "A"] || "Value"} />
          </FormField>
          <FormField label="TTL">
            <Input value={ttl} onChange={({ detail }) => setTtl(detail.value)} type="number" />
          </FormField>
          <FormField label="Routing policy">
            <Select selectedOption={routingPolicy} onChange={({ detail }) => setRoutingPolicy(detail.selectedOption as SelectProps.Option)} options={[{ label: "Simple routing", value: "Simple" }, { label: "Weighted", value: "Weighted" }, { label: "Latency-based", value: "Latency" }, { label: "Failover", value: "Failover" }, { label: "Geolocation", value: "Geolocation" }]} />
          </FormField>
          {routingPolicy.value === "Weighted" && (
            <FormField key="weight" label="Weight">
              <Input value={weight} onChange={({ detail }) => setWeight(detail.value)} type="number" />
            </FormField>
          )}
          {(routingPolicy.value === "Latency" || routingPolicy.value === "Geolocation") && (
            <FormField key="region" label="Region">
              <Input value={region} onChange={({ detail }) => setRegion(detail.value)} placeholder="us-east-1" />
            </FormField>
          )}
          {routingPolicy.value === "Failover" && (
            <FormField key="failover" label="Failover type">
              <Select selectedOption={failoverType} onChange={({ detail }) => setFailoverType(detail.selectedOption as SelectProps.Option)} options={[{ label: "PRIMARY", value: "PRIMARY" }, { label: "SECONDARY", value: "SECONDARY" }]} />
            </FormField>
          )}
          <FormField label="Set identifier (optional)">
            <Input value={setIdentifier} onChange={({ detail }) => setSetIdentifier(detail.value)} placeholder="server-1" />
          </FormField>
        </SpaceBetween>
      </Modal>

      <Modal
        visible={deleteId !== null}
        onDismiss={() => setDeleteId(null)}
        header="Delete record?"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button key="cancel" variant="link" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button key="delete" variant="primary" onClick={handleDelete}>Delete</Button>
            </SpaceBetween>
          </Box>
        }
      >
        Are you sure you want to delete this record? This action cannot be undone.
      </Modal>
    </>
  );
}
