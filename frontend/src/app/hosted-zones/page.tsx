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
import Select from "@cloudscape-design/components/select";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { getZones, createZone, updateZone, deleteZone } from "@/lib/api";
import type { HostedZone, HostedZoneCreateInput } from "@/lib/types";

export default function HostedZonesPage() {
  const [zones, setZones] = useState<HostedZone[] | null>(null);
  const [modalError, setModalError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HostedZone | null>(null);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [zoneType, setZoneType] = useState<{ label: string; value: string }>({ label: "Public", value: "public" });
  const [flashes, setFlashes] = useState<Array<object>>([]);
  const router = useRouter();

  const flash = (type: "success" | "error" | "info", content: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFlashes((prev) => [...prev, { type, content, dismissible: true, onDismiss: () => setFlashes((p) => p.filter((f) => (f as { id?: string }).id !== id)) }]);
    setTimeout(() => setFlashes((p) => p.filter((f) => (f as { id?: string }).id !== id)), 4000);
  };

  const load = () => getZones().then(setZones).catch(() => { setZones([]); flash("error", "Unable to load hosted zones"); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const { items, filterProps, paginationProps, collectionProps, filteredItemsCount } = useCollection<HostedZone>(zones || [], {
    filtering: {
      filteringFunction: (item, filteringText) =>
        item.name.toLowerCase().includes(filteringText.toLowerCase()) ||
        (item.comment || "").toLowerCase().includes(filteringText.toLowerCase()),
      empty: <Box textAlign="center" color="inherit" padding={{ vertical: "l" }}>No hosted zones</Box>,
      noMatch: <Box textAlign="center" color="inherit" padding={{ vertical: "l" }}>No matches found</Box>,
    },
    sorting: { defaultState: { sortingColumn: { sortingField: "name" }, isDescending: false } },
    pagination: { pageSize: 10 },
    selection: { trackBy: "id" },
  });

  const handleSave = async () => {
    try {
      if (editing) {
        await updateZone(editing.id, { comment });
        flash("success", "Hosted zone updated");
      } else {
        const payload: HostedZoneCreateInput = { name, comment, zone_type: zoneType.value };
        await createZone(payload.name, payload.comment, payload.zone_type);
        flash("success", "Hosted zone created");
      }
      setShowModal(false);
      setEditing(null);
      setName("");
      setComment("");
      setZoneType({ label: "Public", value: "public" });
      setModalError("");
      load();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed");
    }
  };

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (deleteId != null) {
      try {
        await deleteZone(deleteId);
        flash("success", "Hosted zone deleted");
        load();
      } catch (e) {
        flash("error", e instanceof Error ? e.message : "Failed");
      }
      setDeleteId(null);
    }
  };

  const openEdit = (zone: HostedZone) => {
    setEditing(zone);
    setName(zone.name);
    setComment(zone.comment || "");
    setZoneType(zone.zone_type === "private" ? { label: "Private", value: "private" } : { label: "Public", value: "public" });
    setModalError("");
    setShowModal(true);
  };

  return (
    <>
      <Flashbar items={flashes} />
      <Table
        {...collectionProps}
        columnDefinitions={[
          { id: "name", header: "Name", sortingField: "name", cell: (item: HostedZone) => (
            <Link onFollow={(e) => { e.preventDefault(); router.push(`/hosted-zones/${item.id}`); }}>{item.name}</Link>
          ) },
          { id: "comment", header: "Comment", cell: (item: HostedZone) => item.comment || "—" },
          { id: "zone_type", header: "Type", sortingField: "zone_type", cell: (item: HostedZone) => item.zone_type === "private" ? "Private" : "Public" },
          { id: "record_count", header: "Records", sortingField: "record_count", cell: (item: HostedZone) => item.record_count ?? "—" },
          { id: "actions", header: "Actions", cell: (item: HostedZone) => (
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
              <Button variant="primary" onClick={() => { setEditing(null); setName(""); setComment(""); setZoneType({ label: "Public", value: "public" }); setModalError(""); setShowModal(true); }}>
                Create hosted zone
              </Button>
            }
          >
            Hosted zones
          </Header>
        }
        filter={<TextFilter {...filterProps} filteringPlaceholder="Find hosted zones" />}
        empty={zones === null ? "Loading hosted zones..." : collectionProps.empty}
      />

      <Modal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        header={editing ? "Edit hosted zone" : "Create hosted zone"}
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
          <FormField key="name" label="Domain name" description={editing ? "Cannot be renamed" : undefined}>
            <Input value={name} disabled={!!editing} onChange={({ detail }) => setName(detail.value)} placeholder="example.com" />
          </FormField>
          <FormField key="comment" label="Comment (optional)">
            <Input value={comment} onChange={({ detail }) => setComment(detail.value)} />
          </FormField>
          <FormField key="type" label="Type" description={editing ? "Cannot be changed" : undefined}>
            <Select
              selectedOption={zoneType}
              onChange={({ detail }) => setZoneType(detail.selectedOption as { label: string; value: string })}
              options={[{ label: "Public", value: "public" }, { label: "Private", value: "private" }]}
              disabled={!!editing}
            />
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
              <Button key="cancel" variant="link" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button key="delete" variant="primary" onClick={handleDelete}>Delete</Button>
            </SpaceBetween>
          </Box>
        }
      >
        Are you sure you want to delete this hosted zone and all its records? This action cannot be undone.
      </Modal>
    </>
  );
}
