import { startTransition } from "react";
import type { PersistedSettings, SceneId, ScenePlaylistItem } from "../../types";

export interface DrawerPanelCommonProps {
  settings: PersistedSettings;
  updateSettings: (updater: (current: PersistedSettings) => PersistedSettings) => void;
}

export function withTransition(
  onSettingsChange: (updater: (current: PersistedSettings) => PersistedSettings) => void,
): DrawerPanelCommonProps["updateSettings"] {
  return (updater) => {
    startTransition(() => {
      onSettingsChange(updater);
    });
  };
}

export function replacePlaylistItem(
  playlist: ScenePlaylistItem[],
  sceneId: SceneId,
  mapper: (current: ScenePlaylistItem) => ScenePlaylistItem,
): ScenePlaylistItem[] {
  return playlist.map((item) => (item.id === sceneId ? mapper(item) : item));
}

export function moveScene(
  playlist: ScenePlaylistItem[],
  sceneId: SceneId,
  direction: -1 | 1,
): ScenePlaylistItem[] {
  const index = playlist.findIndex((item) => item.id === sceneId);
  const targetIndex = index + direction;

  if (index === -1 || targetIndex < 0 || targetIndex >= playlist.length) {
    return playlist;
  }

  const next = [...playlist];
  const [entry] = next.splice(index, 1);
  next.splice(targetIndex, 0, entry);
  return next;
}
