"use client";
import { useEffect, useState } from "react";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import Button from "@cloudscape-design/components/button";

const STORAGE_KEY = "colorMode";

function readMode(): Mode {
  if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === Mode.Dark) {
    return Mode.Dark;
  }
  return Mode.Light;
}

export default function DarkModeToggle() {
  const [mode, setMode] = useState<Mode>(Mode.Light);

  useEffect(() => {
    const initial = readMode();
    // Hydration-restore from localStorage; suppress the new set-state-in-effect rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initial);
    applyMode(initial);
  }, []);

  const toggle = () => {
    const next = mode === Mode.Dark ? Mode.Light : Mode.Dark;
    setMode(next);
    applyMode(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <Button
      id="dark-mode-toggle"
      variant="icon"
      iconName={mode === Mode.Dark ? "star" : "settings"}
      ariaLabel="Toggle dark mode"
      onClick={toggle}
    />
  );
}