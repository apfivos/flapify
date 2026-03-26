import { useEffect, useRef } from "react";
import { isEditableTarget } from "../lib/browser";

interface KeyboardShortcutHandlers {
  onToggleRotation: () => void;
  onNextScene: () => void;
  onPreviousScene: () => void;
  onDismissUi: () => void;
  onToggleFullscreen: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        handlersRef.current.onToggleRotation();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handlersRef.current.onNextScene();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlersRef.current.onPreviousScene();
        return;
      }

      if (event.key === "Escape") {
        handlersRef.current.onDismissUi();
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        handlersRef.current.onToggleFullscreen();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
