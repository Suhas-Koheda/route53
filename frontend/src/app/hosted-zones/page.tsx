"use client";
import { useEffect, useState } from "react";
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
import Flashbar from "@cloudscape-design/components/flashbar";
import { getZones, createZone, updateZone, deleteZone } from "@/lib/api";

export default function HostedZonesPage() {
  const [zones, setZones] = useState<any[] | null>(null);
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [zoneType, setZoneType] = useState("public");
  const [flashes, setFlashes] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const router = useRouter();

  const load = () => getZones().then(setZones).catch(() => { setZones([]); flash("error", "Unable to load hosted zones"); });
  useEffect(() => { load(); }, []);

  const filtered = (zones || []).filter((z) => z.name.toLowerCase().includes(filter.toLowerCase()));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const flash = (type: string, content: string) => {
    const id = Date.now().toString();
    setFlashes([{ type, content, dismissible: true, onDismiss: () => setFlashes([]) }]);
    setTimeout(() => setFlashes([]), 3000);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateZone(editing.id, { name, comment, zone_type: zoneType });
        flash("success", "Hosted zone updated");
      } else {
        await createZone(name, comment, zoneType);
        flash("success", "Hosted zone created");
      }
      setShowModal(false);
      setEditing(null);
      setName("");
      setComment("");
      setZoneType("public");
      load();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (deleteId != null) {
      try {
        await deleteZone(deleteId);
        flash("success", "Hosted zone deleted");
        load();
      } catch (e: any) {
        flash("error", e.message);
      }
      setDeleteId(null);
    }
  };

  const openEdit = (zone: any) => {
    setEditing(zone);
    setName(zone.name);
    setComment(zone.comment || "");
    setZoneType(zone.zone_type || "public");
    setShowModal(true);
  };

  return (
    <>
      <Flashbar items={flashes} />
      <Table
        columnDefinitions={[
          {
            id: "name",
            header: "Name",
            cell: (item: any) => (
              <Link onFollow={(e) => { e.preventDefault(); router.push(`/hosted-zones/${item.id}`); }}>{item.name}</Link>
            ),
          },
          { id: "comment", header: "Comment", cell: (item: any) => item.comment || "—" },
          { id: "zone_type", header: "Type", cell: (item: any) => item.zone_type === "private" ? "Private" : "Public" },
          { id: "record_count", header: "Records", cell: (item: any) => item.record_count ?? "—" },
          {
            id: "actions",
            header: "Actions",
            cell: (item: any) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Link onFollow={(e) => { e.preventDefault(); openEdit(item); }}>Edit</Link>
                <Link onFollow={(e) => { e.preventDefault(); setDeleteId(item.id); }}>Delete</Link>
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
              <Button variant="primary" onClick={() => { setEditing(null); setName(""); setComment(""); setShowModal(true); }}>
                Create hosted zone
              </Button>
            }
          >
            Hosted zones
          </Header>
        }
        filter={<TextFilter filteringText={filter} onChange={({ detail }) => setFilter(detail.filteringText)} />}
        empty={zones === null ? "Loading hosted zones..." : "No hosted zones. Create one to get started."}
      />

      <Modal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        header={editing ? "Edit hosted zone" : "Create hosted zone"}
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
          <FormField label="Domain name">
            <Input value={name} onChange={({ detail }) => setName(detail.value)} placeholder="example.com" />
          </FormField>
          <FormField label="Comment (optional)">
            <Input value={comment} onChange={({ detail }) => setComment(detail.value)} />
          </FormField>
          <FormField label="Type">
            <select value={zoneType} onChange={(e) => setZoneType(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid #aab7b8", borderRadius: 4 }}>
              <option value="public">Public hosted zone</option>
              <option value="private">Private hosted zone</option>
            </select>
          </FormField>
        </SpaceBetween>
      </Modal>

      <Modal
        visible={deleteId !== null}
        onDismiss={() => setDeleteId(null)}
        header="Delete hosted zone?"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleDelete}>Delete</Button>
            </SpaceBetween>
          </Box>
        }
      >
        Are you sure you want to delete this hosted zone and all its records? This action cannot be undone.
      </Modal>
    </>
  );
}
