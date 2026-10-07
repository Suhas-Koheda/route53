"use client";
import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Table from "@cloudscape-design/components/table";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Pagination from "@cloudscape-design/components/pagination";
import TextFilter from "@cloudscape-design/components/text-filter";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select, { SelectProps } from "@cloudscape-design/components/select";
import RadioGroup from "@cloudscape-design/components/radio-group";
import Tabs from "@cloudscape-design/components/tabs";
import Container from "@cloudscape-design/components/container";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
import FileUpload from "@cloudscape-design/components/file-upload";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { getRecords, createRecord, updateRecord, deleteRecord, getZone, deleteZone, exportZone, importZone } from "@/lib/api";
import { useFlashbar } from "@/components/FlashbarProvider";
import ComingSoon from "@/components/ComingSoon";
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

function validateValue(type: string, value: string): string | undefined {
  const v = value.trim();
  if (!v) return "Value is required";
  switch (type) {
    case "A": {
      const octets = v.split(".");
      if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return "Must be a valid IPv4 address";
      return undefined;
    }
    case "AAAA": {
      try {
        new URL(`http://[${v}]/`);
      } catch {
        return "Must be a valid IPv6 address";
      }
      return undefined;
    }
    case "CNAME":
    case "NS":
    case "PTR":
      {
        const hostname = v.endsWith(".") ? v.slice(0, -1) : v;
        const labels = hostname.split(".");
        if (hostname.length > 253 || labels.some((label) => label.length > 63 || !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label))) return "Must be a valid domain name";
      }
      return undefined;
    case "MX": {
      const parts = v.split(/\s+/);
      if (parts.length !== 2 || !/^\d+$/.test(parts[0])) return "Format: priority host (e.g. 10 mail.example.com)";
      return validateValue("CNAME", parts[1]);
    }
    case "SRV": {
      const parts = v.split(/\s+/);
      if (parts.length !== 4 || parts.slice(0, 3).some((part) => !/^\d+$/.test(part))) return "Format: priority weight port target";
      return validateValue("CNAME", parts[3]);
    }
    case "TXT":
      if (v.length > 255) return "Max 255 characters per string";
      return undefined;
    case "CAA":
      if (!/^\d{1,3}\s+[A-Za-z0-9_-]+\s+".*"$/.test(v) || Number(v.split(/\s+/, 1)[0]) > 255) return 'Format: flag tag "value" (e.g. 0 issue "amazon.com")';
      return undefined;
    default:
      return undefined;
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
  const { flash } = useFlashbar();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DnsRecord | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [type, setType] = useState<SelectProps.Option>({ label: "A", value: "A" });
  const [value, setValue] = useState("");
  const [valueError, setValueError] = useState<string | undefined>();
  const [ttl, setTtl] = useState("300");
  const [ttlError, setTtlError] = useState<string | undefined>();
  const [weightError, setWeightError] = useState<string | undefined>();
  const [regionError, setRegionError] = useState<string | undefined>();
  const [failoverError, setFailoverError] = useState<string | undefined>();
  const [identifierError, setIdentifierError] = useState<string | undefined>();
  const [routingPolicy, setRoutingPolicy] = useState("Simple");
  const [weight, setWeight] = useState("");
  const [region, setRegion] = useState("");
  const [failoverType, setFailoverType] = useState("PRIMARY");
  const [setIdentifier, setSetIdentifier] = useState("");
  const [typeFilter, setTypeFilter] = useState<SelectProps.Option>(TYPE_OPTIONS[0]);
  const [routingFilter, setRoutingFilter] = useState<SelectProps.Option>(POLICY_OPTIONS[0]);
  const [wrapLines, setWrapLines] = useState(false);
  const [modalError, setModalError] = useState("");
  const [importFiles, setImportFiles] = useState<File[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<DnsRecord[] | null>(null);
  const [deleteZoneTarget, setDeleteZoneTarget] = useState(false);
  const [deleteZoneConfirm, setDeleteZoneConfirm] = useState("");
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(
    () => getRecords(zoneId).then(setRecords).catch(() => { setRecords([]); flash("error", "Unable to load records"); }),
    [zoneId, flash]
  );
  useEffect(() => {
    load();
    getZone(zoneId).then(setZone).catch(() => setZone(null));
  }, [zoneId, load]);

  const filtered = (records || []).filter(
    (r) =>
      (typeFilter.value === "All" || r.type === typeFilter.value) &&
      (routingFilter.value === "All" || (r.routing_policy || "Simple") === routingFilter.value)
  );

  const { items, filterProps, paginationProps, collectionProps, filteredItemsCount, actions } = useCollection<DnsRecord>(filtered, {
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

  const selected = (collectionProps.selectedItems as DnsRecord[]) || [];

  const openCreate = () => {
    setEditing(null);
    setName(""); setType({ label: "A", value: "A" }); setValue(""); setTtl("300");
    setRoutingPolicy("Simple"); setWeight(""); setRegion(""); setFailoverType("PRIMARY"); setSetIdentifier("");
    setNameError(undefined); setValueError(undefined); setTtlError(undefined); setModalError("");
    setWeightError(undefined); setRegionError(undefined); setFailoverError(undefined); setIdentifierError(undefined);
    setShowModal(true);
  };

  useEffect(() => {
    const onCreateRecord = () => openCreate();
    window.addEventListener("route53:create-record", onCreateRecord);
    return () => window.removeEventListener("route53:create-record", onCreateRecord);
  }, []);

  const openEdit = () => {
    if (selected.length !== 1) return;
    const r = selected[0];
    setEditing(r);
    setName(r.name); setType({ label: r.type, value: r.type }); setValue(r.value); setTtl(String(r.ttl));
    setRoutingPolicy(r.routing_policy || "Simple"); setWeight(r.weight != null ? String(r.weight) : "");
    setRegion(r.region || ""); setFailoverType(r.failover_type || "PRIMARY"); setSetIdentifier(r.set_identifier || "");
    setNameError(undefined); setValueError(undefined); setTtlError(undefined); setModalError("");
    setWeightError(undefined); setRegionError(undefined); setFailoverError(undefined); setIdentifierError(undefined);
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    let ok = true;
    if (!name.trim()) { setNameError("Name is required"); ok = false; } else setNameError(undefined);
    const vErr = validateValue(type.value ?? "A", value);
    setValueError(vErr);
    if (vErr) ok = false;
    const ttlNum = Number(ttl);
    if (!Number.isInteger(ttlNum) || ttlNum < 0 || ttlNum > 2147483647) { setTtlError("TTL must be a non-negative integer"); ok = false; } else setTtlError(undefined);
    const weightInvalid = routingPolicy === "Weighted" && (!Number.isInteger(Number(weight)) || weight === "" || Number(weight) < 0 || Number(weight) > 255);
    setWeightError(weightInvalid ? "Weight must be between 0 and 255" : undefined);
    if (weightInvalid) ok = false;
    const regionInvalid = (routingPolicy === "Latency" || routingPolicy === "Geolocation") && !region.trim();
    setRegionError(regionInvalid ? "A region is required for this routing policy" : undefined);
    if (regionInvalid) ok = false;
    const failoverInvalid = routingPolicy === "Failover" && !["PRIMARY", "SECONDARY"].includes(failoverType);
    setFailoverError(failoverInvalid ? "Choose PRIMARY or SECONDARY" : undefined);
    if (failoverInvalid) ok = false;
    const identifierInvalid = routingPolicy !== "Simple" && !setIdentifier.trim();
    setIdentifierError(identifierInvalid ? "A set identifier is required for this routing policy" : undefined);
    if (identifierInvalid) ok = false;
    return ok;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setModalError("");
    const data = {
      name, type: type.value ?? "A", value, ttl: Number(ttl), routing_policy: routingPolicy,
      weight: weight ? Number(weight) : null, region: region || null,
      failover_type: routingPolicy === "Failover" ? failoverType : null,
      set_identifier: routingPolicy === "Simple" ? "" : setIdentifier,
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
      load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleDeleteSelected = async () => {
    if (!deleteTarget || deleteTarget.length === 0) return;
    let ok = 0;
    for (const r of deleteTarget) {
      try {
        await deleteRecord(r.id);
        ok++;
      } catch (e) {
        flash("error", e instanceof Error ? e.message : "Failed to delete");
      }
    }
    flash("success", `Deleted ${ok} record(s)`);
    setDeleteTarget(null);
    actions.setSelectedItems([]);
    load();
  };

  const handleDeleteZone = async () => {
    try {
      await deleteZone(zoneId);
      flash("success", "Hosted zone deleted");
      router.push("/hosted-zones");
    } catch (e) {
      flash("error", e instanceof Error ? e.message : "Failed");
    }
  };

  const handleExport = async (id: string) => {
    try {
      const format = id === "bind" ? "bind" : "json";
      const content = await exportZone(zoneId, format);
      let blob: Blob;
      let filename: string;
      if (format === "json") {
        blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
        filename = `${zone?.name || "zone"}.json`;
      } else {
        blob = new Blob([String(content)], { type: "text/plain" });
        filename = `${zone?.name || "zone"}.bind`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      flash("success", `Exported zone as ${format.toUpperCase()}`);
    } catch (e) {
      flash("error", e instanceof Error ? e.message : "Export failed");
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    try {
      const result = await importZone(zoneId, file);
      flash("success", `Imported ${result.imported} record(s), skipped ${result.skipped}`);
      setShowImport(false);
      setImportFiles([]);
      load();
    } catch (e) {
      flash("error", e instanceof Error ? e.message : "Import failed");
    }
  };

  const nameServers = (records || []).filter((r) => r.type === "NS" && r.name === zone?.name).map((r) => r.value);

  return (
    <>
      <Header
        variant="h1"
        description="Hosted zone"
        actions={
          <Button onClick={() => setDeleteZoneTarget(true)}>Delete</Button>
        }
      >
        {zone?.name || "Hosted zone"}
      </Header>

      <Tabs
        tabs={[
          {
            label: "Records",
            id: "records",
            content: (
              <Table
                {...collectionProps}
                columnDefinitions={[
                  { id: "name", header: "Record name", sortingField: "name", cell: (item: DnsRecord) => item.name },
                  { id: "type", header: "Type", sortingField: "type", cell: (item: DnsRecord) => item.type },
                  { id: "routing_policy", header: "Routing policy", cell: (item: DnsRecord) => item.routing_policy || "Simple" },
                  { id: "differentiator", header: "Differentiator", cell: (item: DnsRecord) => item.set_identifier || "—" },
                  { id: "ttl", header: "TTL", sortingField: "ttl", cell: (item: DnsRecord) => item.ttl },
                  { id: "value", header: "Value/Route traffic to", cell: (item: DnsRecord) => item.value },
                ]}
                items={items}
                variant="container"
                selectionType="multi"
                trackBy="id"
                wrapLines={wrapLines}
                pagination={paginationProps && <Pagination {...paginationProps} />}
                header={
                  <Header
                    counter={`(${filteredItemsCount ?? 0})`}
                    actions={
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button disabled={selected.length !== 1} onClick={openEdit}>Edit record</Button>
                        <Button disabled={selected.length === 0} onClick={() => selected.length > 0 && setDeleteTarget(selected)}>Delete record(s)</Button>
                        <Button onClick={() => setShowImport(true)}>Import zone file</Button>
                        <ButtonDropdown
                          items={[{ id: "json", text: "Export as JSON" }, { id: "bind", text: "Export as BIND" }]}
                          onItemClick={(e) => handleExport(e.detail.id)}
                        >
                          Export
                        </ButtonDropdown>
                        <Button variant="primary" onClick={openCreate}>Create record</Button>
                      </SpaceBetween>
                    }
                  >
                    Records {zone?.name ? `— ${zone.name}` : ""}
                  </Header>
                }
                filter={
                  <SpaceBetween direction="horizontal" size="xs">
                    <TextFilter
                      {...filterProps}
                      filteringPlaceholder="Find records"
                      countText={`${filteredItemsCount ?? 0} match${filteredItemsCount === 1 ? "" : "es"}`}
                    />
                    <Select selectedOption={typeFilter} onChange={({ detail }) => setTypeFilter(detail.selectedOption as SelectProps.Option)} options={TYPE_OPTIONS} />
                    <Select selectedOption={routingFilter} onChange={({ detail }) => setRoutingFilter(detail.selectedOption as SelectProps.Option)} options={POLICY_OPTIONS} />
                    <Button variant="normal" onClick={() => setWrapLines((v) => !v)}>{wrapLines ? "No wrap" : "Wrap lines"}</Button>
                  </SpaceBetween>
                }
                empty={records === null ? "Loading records..." : collectionProps.empty}
              />
            ),
          },
          {
            label: "Hosted zone details",
            id: "details",
            content: (
              <Container>
                <ColumnLayout columns={1} variant="text-grid">
                  <div>
                    <Box variant="awsui-key-label">Hosted zone name</Box>
                    <div>{zone?.name || "—"}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Hosted zone ID</Box>
                    <div>{zone?.zone_id_str || "—"}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Type</Box>
                    <div>{zone?.zone_type === "private" ? "Private" : "Public"}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Description</Box>
                    <div>{zone?.comment || "—"}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Record count</Box>
                    <div>{zone?.record_count ?? "—"}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Name servers</Box>
                    <div>
                      {nameServers.length > 0 ? nameServers.map((ns) => <div key={ns}>{ns}</div>) : "—"}
                    </div>
                  </div>
                </ColumnLayout>
              </Container>
            ),
          },
          { label: "DNSSEC signing", id: "dnssec", content: <ComingSoon title="DNSSEC signing" /> },
          { label: "Query logging", id: "query-logging", content: <ComingSoon title="Query logging" /> },
          { label: "Tags", id: "tags", content: <ComingSoon title="Tags" /> },
        ]}
      />

      <Modal visible={showModal} onDismiss={() => setShowModal(false)} header={editing ? "Edit record" : "Create record"} footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
          </SpaceBetween>
        </Box>
      }>
        <SpaceBetween size="l">
          {modalError && <Box color="text-status-error">{modalError}</Box>}
          <FormField label="Record name" errorText={nameError} description="Relative name (e.g. www), the zone apex (@), or a full name within the zone.">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="www" />
          </FormField>
          <FormField label="Type">
            <Select selectedOption={type} onChange={({ detail }) => setType(detail.selectedOption as SelectProps.Option)} options={RECORD_TYPES} />
          </FormField>
          <FormField label="Value" description={VALUE_PLACEHOLDERS[type.value ?? "A"] || "Value"} errorText={valueError}>
            <Input value={value} onChange={({ detail }) => setValue(detail.value)} placeholder={VALUE_PLACEHOLDERS[type.value ?? "A"] || "Value"} />
          </FormField>
          <FormField label="TTL" errorText={ttlError}>
            <Input value={ttl} onChange={({ detail }) => setTtl(detail.value)} type="number" />
          </FormField>
          <FormField label="Routing policy">
            <RadioGroup
              value={routingPolicy}
              onChange={({ detail }) => setRoutingPolicy(detail.value)}
              items={[
                { value: "Simple", label: "Simple routing" },
                { value: "Weighted", label: "Weighted" },
                { value: "Latency", label: "Latency-based" },
                { value: "Failover", label: "Failover" },
                { value: "Geolocation", label: "Geolocation" },
              ]}
            />
          </FormField>
          {routingPolicy === "Weighted" && (
            <FormField label="Weight" description="0–255" errorText={weightError}>
              <Input value={weight} onChange={({ detail }) => setWeight(detail.value)} type="number" />
            </FormField>
          )}
          {(routingPolicy === "Latency" || routingPolicy === "Geolocation") && (
            <FormField label="Region" errorText={regionError}>
              <Input value={region} onChange={({ detail }) => setRegion(detail.value)} placeholder="us-east-1" />
            </FormField>
          )}
          {routingPolicy === "Failover" && (
            <FormField label="Failover type" errorText={failoverError}>
              <Select selectedOption={{ label: failoverType, value: failoverType }} onChange={({ detail }) => setFailoverType(detail.selectedOption.value ?? "PRIMARY")} options={[{ label: "PRIMARY", value: "PRIMARY" }, { label: "SECONDARY", value: "SECONDARY" }]} />
            </FormField>
          )}
          {routingPolicy !== "Simple" && (
            <FormField label="Differentiator / set identifier" errorText={identifierError}>
              <Input value={setIdentifier} onChange={({ detail }) => setSetIdentifier(detail.value)} placeholder="server-1" />
            </FormField>
          )}
        </SpaceBetween>
      </Modal>

      <Modal visible={!!deleteTarget} onDismiss={() => setDeleteTarget(null)} header={`Delete ${deleteTarget?.length ?? 0} record(s)?`} footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleDeleteSelected}>Delete</Button>
          </SpaceBetween>
        </Box>
      }>
        Delete the selected record(s)? This action cannot be undone.
      </Modal>

      <Modal visible={deleteZoneTarget} onDismiss={() => setDeleteZoneTarget(false)} header="Delete hosted zone" footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => setDeleteZoneTarget(false)}>Cancel</Button>
            <Button variant="primary" disabled={deleteZoneConfirm !== "delete"} onClick={handleDeleteZone}>Delete</Button>
          </SpaceBetween>
        </Box>
      }>
        <SpaceBetween size="l">
          <Box>To confirm deletion, type <b>delete</b> below.</Box>
          <FormField label="Confirmation">
            <Input value={deleteZoneConfirm} onChange={({ detail }) => setDeleteZoneConfirm(detail.value)} placeholder="delete" />
          </FormField>
        </SpaceBetween>
      </Modal>

      <Modal visible={showImport} onDismiss={() => setShowImport(false)} header="Import zone file" footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={importFiles.length === 0}
              onClick={() => handleImport(importFiles[0] ?? null)}
            >
              Import
            </Button>
          </SpaceBetween>
        </Box>
      }>
        <SpaceBetween size="l">
          <Box>Select a BIND-format zone file (.zone, .bind, .txt) to import records into this hosted zone.</Box>
          <FileUpload
            accept=".zone,.bind,.txt,.db"
            value={importFiles}
            onChange={({ detail }) => setImportFiles(detail.value)}
            constraintText="Select one BIND-format zone file."
          />
        </SpaceBetween>
      </Modal>
    </>
  );
}
