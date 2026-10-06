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
  const [zones, setZones] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [flashes, setFlashes] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const router = useRouter();

  const load = () => getZones().then(setZones);
  useEffect(() => { load(); }, []);

  const filtered = zones.filter((z) => z.name.toLowerCase().includes(filter.toLowerCase()));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const flash = (type: string, content: string) => {
    const id = Date.now().toString();
    setFlashes([{ type, content, dismissible: true, onDismiss: () => setFlashes([]) }]);
    setTimeout(() => setFlashes([]), 3000);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateZone(editing.id, { name, comment });
        flash("success", "Hosted zone updated");
      } else {
        await createZone(name, comment);
        flash("success", "Hosted zone created");
      }
      setShowModal(false);
      setEditing(null);
      setName("");
      setComment("");
      load();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this hosted zone?")) {
      await deleteZone(id);
      flash("success", "Hosted zone deleted");
      load();
    }
  };

  const openEdit = (zone: any) => {
    setEditing(zone);
    setName(zone.name);
    setComment(zone.comment || "");
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
              <Button variant="primary" onClick={() => { setEditing(null); setName(""); setComment(""); setShowModal(true); }}>
                Create hosted zone
              </Button>
            }
          >
            Hosted zones
          </Header>
        }
        filter={<TextFilter filteringText={filter} onChange={({ detail }) => setFilter(detail.filteringText)} />}
        empty={<Box textAlign="center" color="inherit"><b>No hosted zones</b></Box>}
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
        </SpaceBetween>
      </Modal>
    </>
  );
}
