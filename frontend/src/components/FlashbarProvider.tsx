"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import Flashbar, { FlashbarProps } from "@cloudscape-design/components/flashbar";

type FlashType = "success" | "error" | "info" | "warning";

export interface FlashMessage {
  id: string;
  type: FlashType;
  content: string;
  dismissible: boolean;
  onDismiss: () => void;
}

interface FlashbarContextType {
  flash: (type: FlashType, content: string, timeoutMs?: number) => void;
}

const FlashbarContext = createContext<FlashbarContextType>({ flash: () => {} });

export function FlashbarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((m) => (m as { id?: string }).id !== id));
  }, []);

  const flash = useCallback(
    (type: FlashType, content: string, timeoutMs = 5000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [
        ...prev,
        { id, type, content, dismissible: true, onDismiss: () => remove(id) },
      ]);
      if (timeoutMs > 0) {
        setTimeout(() => remove(id), timeoutMs);
      }
    },
    [remove]
  );

  return (
    <FlashbarContext.Provider value={{ flash }}>
      <Flashbar items={items} />
      {children}
    </FlashbarContext.Provider>
  );
}

export function useFlashbar() {
  return useContext(FlashbarContext);
}
