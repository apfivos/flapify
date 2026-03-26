import { useEffect, useRef, useState } from "react";
import { getNextSceneId, getSceneDuration } from "../lib/playlist";
import type { PersistedSettings, SceneId, ScenePlaylistItem } from "../types";

const INITIAL_SETTLE_GRACE_MS = 80;

interface UseSceneRotationOptions {
  activeSceneId: SceneId | null;
  playlist: ScenePlaylistItem[];
  settings: PersistedSettings;
  rotationPaused: boolean;
  boardBusy: boolean;
  onAdvance: (nextSceneId: SceneId | null) => void;
}

export function useSceneRotation({
  activeSceneId,
  playlist,
  settings,
  rotationPaused,
  boardBusy,
  onAdvance,
}: UseSceneRotationOptions) {
  const [sceneReady, setSceneReady] = useState(false);
  const boardBusyRef = useRef(boardBusy);
  const sceneSawBusyRef = useRef(false);
  const pendingAdvanceRef = useRef(false);

  boardBusyRef.current = boardBusy;

  useEffect(() => {
    sceneSawBusyRef.current = false;
    pendingAdvanceRef.current = false;

    if (!activeSceneId || playlist.length < 2) {
      setSceneReady(true);
      return;
    }

    setSceneReady(false);

    const timeoutId = window.setTimeout(() => {
      if (!sceneSawBusyRef.current && !boardBusyRef.current) {
        setSceneReady(true);
      }
    }, INITIAL_SETTLE_GRACE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activeSceneId, playlist.length]);

  useEffect(() => {
    if (sceneReady) {
      return;
    }

    if (boardBusy) {
      sceneSawBusyRef.current = true;
      return;
    }

    if (sceneSawBusyRef.current) {
      setSceneReady(true);
    }
  }, [boardBusy, sceneReady]);

  useEffect(() => {
    if (rotationPaused) {
      pendingAdvanceRef.current = false;
    }
  }, [rotationPaused]);

  useEffect(() => {
    if (rotationPaused || playlist.length < 2 || !activeSceneId || !sceneReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (boardBusyRef.current) {
        pendingAdvanceRef.current = true;
        return;
      }

      onAdvance(getNextSceneId(playlist, activeSceneId));
    }, getSceneDuration(settings, activeSceneId) * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [activeSceneId, onAdvance, playlist, rotationPaused, sceneReady, settings]);

  useEffect(() => {
    if (rotationPaused || !pendingAdvanceRef.current || boardBusy || !activeSceneId) {
      return;
    }

    pendingAdvanceRef.current = false;
    onAdvance(getNextSceneId(playlist, activeSceneId));
  }, [activeSceneId, boardBusy, onAdvance, playlist, rotationPaused]);
}
