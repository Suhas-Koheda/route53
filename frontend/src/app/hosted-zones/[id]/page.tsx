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
import Select from "@cloudscape-design/components/select";
import Flashbar from "@cloudscape-design/components/flashbar";
import { getRecords, createRecord, updateRecord, deleteRecord, getZones } from "@/lib/api";

const RECORD_TYPES = [
  { label: "A", value: "A" },
  { label: "AAAA", value: "AAAA" },
  { label: "CNAME", value: "CNAME" },
  { label: "TXT", value: "TXT" },
  { label: "MX", value: "MX" },
  { label: "NS", value: "NS" },
  { label: "PTR", value: "PTR" },
  { label: "SRV", value: "SRV" },
  { label: "CAA", value: "CAA" },
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
};

function validateValue(type: string, value: string): string | null {
  const v = value.trim();
  if (!v) return "Value is required";
  switch (type) {
    case "A":
      if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return "Invalid IPv4 address";
      return null;
    case "AAAA":
      if (!/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(v) && !/^::$/.test(v) && !/^([0-9a-fA-F]{1,4}:){1,7}:$/.test(v) && !/^::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/.test(v)) return "Invalid IPv6 address";
      return null;
    case "CNAME":
    case "NS":
    case "PTR":
      if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(v)) return "Invalid domain name";
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

export default function ZoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const zoneId = Number(id);
  const [records, setRecords] = useState<any[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState({ label: "A", value: "A" });
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("300");
  const [flashes, setFlashes] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const router = useRouter();

  const load = () => getRecords(zoneId).then(setRecords);
  useEffect(() => {
    load();
    getZones().then((zones: any[]) => {
      const z = zones.find((z: any) => z.id === zoneId);
      if (z) setZoneName(z.name);
    });
  }, [zoneId]);

  const filtered = records.filter(
    (r) =>
      r.name.toLowerCase().includes(filter.toLowerCase()) ||
      r.type.toLowerCase().includes(filter.toLowerCase()) ||
      r.value.toLowerCase().includes(filter.toLowerCase())
  );

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const flash = (type: string, content: string) => {
    setFlashes([{ type, content, dismissible: true, onDismiss: () => setFlashes([]) }]);
    setTimeout(() => setFlashes([]), 3000);
  };

  const handleSave = async () => {
    const error = validateValue(type.value, value);
    if (error) {
      flash("error", error);
      return;
    }
    const data = { name, type: type.value, value, ttl: Number(ttl) };
    try {
      if (editing) {
        await updateRecord(editing.id, data);
        flash("success", "Record updated");
      } else {
        await createRecord(zoneId, data);
        flash("success", "Record created");
      }
      setShowModal(false);
      setEditing(null);
      setName("");
      setType({ label: "A", value: "A" });
      setValue("");
      setTtl("300");
      load();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const handleDelete = async (recordId: number) => {
    if (confirm("Delete this record?")) {
      await deleteRecord(recordId);
      flash("success", "Record deleted");
      load();
    }
  };

  const openEdit = (record: any) => {
    setEditing(record);
    setName(record.name);
    setType({ label: record.type, value: record.type });
    setValue(record.value);
    setTtl(String(record.ttl));
    setShowModal(true);
  };

  return (
    <>
      <Flashbar items={flashes} />
      <Header variant="h1" description="DNS records">
        {zoneName || "Hosted zone"}
      </Header>
      <Table
        columnDefinitions={[
          { id: "name", header: "Name", cell: (item: any) => item.name },
          { id: "type", header: "Type", cell: (item: any) => item.type },
          { id: "value", header: "Value", cell: (item: any) => item.value },
          { id: "ttl", header: "TTL", cell: (item: any) => item.ttl },
          {
            id: "actions",
            header: "Actions",
            cell: (item: any) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Link onFollow={(e) => { e.preventDefault(); openEdit(item); }}>Edit</Link>
                <Link onFollow={(e) => { e.preventDefault(); handleDelete(item.id); }}>Delete</Link>
              </SpaceBetween>
            ),
          },
        ]}
        items={paginated}
        variant="container"
        pagination={<Pagination currentPageIndex={currentPage} onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)} pagesCount={Math.ceil(filtered.length / pageSize) || 1} />}
        header={
          <Header
            counter={`(${filtered.length})`}
            actions={
              <Button variant="primary" onClick={() => { setEditing(null); setName(""); setType({ label: "A", value: "A" }); setValue(""); setTtl("300"); setShowModal(true); }}>
                Create record
              </Button>
            }
          >
            Records {zoneName && `— ${zoneName}`}
          </Header>
        }
        filter={<TextFilter filteringText={filter} onChange={({ detail }) => setFilter(detail.filteringText)} />}
        empty={<Box textAlign="center" color="inherit"><b>No records</b></Box>}
      />

      <Modal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        header={editing ? "Edit record" : "Create record"}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <FormField label="Name">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="www.example.com" />
          </FormField>
          <FormField label="Type">
            <Select selectedOption={type} onChange={({ detail }) => setType(detail.selectedOption as any)} options={RECORD_TYPES} />
          </FormField>
          <FormField label="Value" description={validateValue(type.value, value) || undefined}>
            <Input value={value} onChange={({ detail }) => setValue(detail.value)} placeholder={VALUE_PLACEHOLDERS[type.value] || "Value"} />
          </FormField>
          <FormField label="TTL">
            <Input value={ttl} onChange={({ detail }) => setTtl(detail.value)} type="number" />
          </FormField>
        </SpaceBetween>
      </Modal>
    </>
  );
}
