"use client";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: "/", action: "Focus search" },
  { keys: "c", action: "Create hosted zone / record" },
  { keys: "Esc", action: "Close modal" },
  { keys: "?", action: "Show this help" },
];

export default function ShortcutsHelp({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  return (
    <Modal visible={visible} onDismiss={onDismiss} header="Keyboard shortcuts" footer={
      <Box float="right">
        <Button variant="link" onClick={onDismiss}>Close</Button>
      </Box>
    }>
      <SpaceBetween size="s">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} style={{ display: "flex", justifyContent: "space-between" }}>
            <Box variant="code">{s.keys}</Box>
            <Box>{s.action}</Box>
          </div>
        ))}
      </SpaceBetween>
    </Modal>
  );
}
