"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Table from "@cloudscape-design/components/table";
import Button from "@cloudscape-design/components/button";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Link from "@cloudscape-design/components/link";
import TextFilter from "@cloudscape-design/components/text-filter";
import Modal from "@cloudscape-design/components/modal";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Pagination from "@cloudscape-design/components/pagination";
import { useCollection } from "@cloudscape-design/collection-hooks";
import { getZones, updateZone, deleteZone } from "@/lib/api";
import { useFlashbar } from "@/components/FlashbarProvider";
import type { HostedZone } from "@/lib/types";

export default function HostedZonesPage() {
  const [zones, setZones] = useState<HostedZone[] | null>(null);
  const { flash } = useFlashbar();
  const router = useRouter();

  const load = useCallback(() => getZones().then(setZones).catch(() => { setZones([]); flash("error", "Unable to load hosted zones"); }), [flash]);
  useEffect(() => { load(); }, [load]);

  const { items, filterProps, paginationProps, collectionProps, filteredItemsCount, actions } = useCollection<HostedZone>(zones || [], {
    filtering: {
      filteringFunction: (item, filteringText) =>
        item.name.toLowerCase().includes(filteringText.toLowerCase()) ||
        (item.comment || "").toLowerCase().includes(filteringText.toLowerCase()),
      empty: (
        <Box textAlign="center" color="text-status-inactive" padding={{ vertical: "xl" }}>
          <SpaceBetween size="s" direction="vertical" alignItems="center">
            <Header variant="h2">No hosted zones</Header>
            <Box fontWeight="normal">You don&apos;t have any hosted zones. Create one to get started.</Box>
            <Button variant="primary" onClick={() => router.push("/hosted-zones/create")}>Create hosted zone</Button>
          </SpaceBetween>
        </Box>
      ),
      noMatch: (
        <Box textAlign="center" color="text-status-inactive" padding={{ vertical: "xl" }}>
          <SpaceBetween size="s" direction="vertical" alignItems="center">
            <Header variant="h2">No results</Header>
            <Box fontWeight="normal">No hosted zones match the current filter.</Box>
          </SpaceBetween>
        </Box>
      ),
    },
    sorting: { defaultState: { sortingColumn: { sortingField: "name" }, isDescending: false } },
    pagination: { pageSize: 10 },
    selection: { trackBy: "id" },
  });

  const selected = collectionProps.selectedItems || [];
  const selectedZone = selected.length === 1 ? selected[0] : null;

  const [editing, setEditing] = useState<HostedZone | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editError, setEditError] = useState("");

  const openEdit = () => {
    if (!selectedZone) return;
    setEditing(selectedZone);
    setEditComment(selectedZone.comment || "");
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updateZone(editing.id, { comment: editComment });
      flash("success", "Hosted zone updated");
      setEditing(null);
      load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed");
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<HostedZone | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteZone(deleteTarget.id);
      flash("success", "Hosted zone deleted");
      setDeleteTarget(null);
      setDeleteConfirm("");
      actions.setSelectedItems([]);
      load();
    } catch (e) {
      flash("error", e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <>
      <Table
        {...collectionProps}
        columnDefinitions={[
          {
            id: "name",
            header: "Hosted zone name",
            sortingField: "name",
            cell: (item: HostedZone) => (
              <Link onFollow={(e) => { e.preventDefault(); router.push(`/hosted-zones/${item.id}`); }}>{item.name}</Link>
            ),
          },
          { id: "zone_type", header: "Type", sortingField: "zone_type", cell: (item: HostedZone) => (item.zone_type === "private" ? "Private hosted zone" : "Public hosted zone") },
          { id: "created_by", header: "Created by", sortingField: "created_by", cell: (item: HostedZone) => item.created_by || "—" },
          { id: "record_count", header: "Record count", sortingField: "record_count", cell: (item: HostedZone) => item.record_count ?? "—" },
          { id: "comment", header: "Description", cell: (item: HostedZone) => item.comment || "—" },
          { id: "zone_id_str", header: "Hosted zone ID", cell: (item: HostedZone) => item.zone_id_str || "—" },
        ]}
        items={items}
        variant="container"
        selectionType="single"
        trackBy="id"
        pagination={paginationProps && <Pagination {...paginationProps} />}
        header={
          <Header
            counter={`(${filteredItemsCount ?? 0})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button disabled={!selectedZone} onClick={() => selectedZone && router.push(`/hosted-zones/${selectedZone.id}`)}>View details</Button>
                <Button disabled={!selectedZone} onClick={openEdit}>Edit</Button>
                <Button disabled={!selectedZone} onClick={() => selectedZone && setDeleteTarget(selectedZone)}>Delete</Button>
                <Button variant="primary" onClick={() => router.push("/hosted-zones/create")}>Create hosted zone</Button>
              </SpaceBetween>
            }
          >
            Hosted zones
          </Header>
        }
        filter={
          <TextFilter
            {...filterProps}
            filteringPlaceholder="Find hosted zones"
            countText={`${filteredItemsCount ?? 0} match${filteredItemsCount === 1 ? "" : "es"}`}
          />
        }
        empty={zones === null ? "Loading hosted zones..." : collectionProps.empty}
      />

      <Modal visible={!!editing} onDismiss={() => setEditing(null)} header="Edit hosted zone" footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit}>Save</Button>
          </SpaceBetween>
        </Box>
      }>
        <SpaceBetween size="l">
          {editError && <Box color="text-status-error">{editError}</Box>}
          <FormField label="Description">
            <Input value={editComment} onChange={({ detail }) => setEditComment(detail.value)} />
          </FormField>
        </SpaceBetween>
      </Modal>

      <Modal visible={!!deleteTarget} onDismiss={() => setDeleteTarget(null)} header="Delete hosted zone" footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="primary" disabled={deleteConfirm !== "delete"} onClick={handleDelete}>Delete</Button>
          </SpaceBetween>
        </Box>
      }>
        <SpaceBetween size="l">
          <Box>To confirm deletion, type <b>delete</b> below.</Box>
          <FormField label="Confirmation">
            <Input value={deleteConfirm} onChange={({ detail }) => setDeleteConfirm(detail.value)} placeholder="delete" />
          </FormField>
        </SpaceBetween>
      </Modal>
    </>
  );
}
