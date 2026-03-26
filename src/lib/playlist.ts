import { DEFAULT_PLAYLIST } from "../constants";
import type { PersistedSettings, SceneId, ScenePlaylistItem } from "../types";

export function getSceneDuration(settings: PersistedSettings, sceneId: SceneId): number {
  return (
    settings.playlist.find((item) => item.id === sceneId)?.durationSec
    ?? DEFAULT_PLAYLIST.find((item) => item.id === sceneId)?.durationSec
    ?? 12
  );
}

export function getRenderablePlaylist(settings: PersistedSettings): ScenePlaylistItem[] {
  return settings.playlist.filter((item) => item.enabled);
}

export function getNextSceneId(
  playlist: ScenePlaylistItem[],
  currentSceneId: SceneId | null,
): SceneId | null {
  if (playlist.length === 0) {
    return null;
  }

  if (!currentSceneId) {
    return playlist[0].id;
  }

  const currentIndex = playlist.findIndex((item) => item.id === currentSceneId);
  if (currentIndex === -1) {
    return playlist[0].id;
  }

  return playlist[(currentIndex + 1) % playlist.length].id;
}

export function getPreviousSceneId(
  playlist: ScenePlaylistItem[],
  currentSceneId: SceneId | null,
): SceneId | null {
  if (playlist.length === 0) {
    return null;
  }

  if (!currentSceneId) {
    return playlist[0].id;
  }

  const currentIndex = playlist.findIndex((item) => item.id === currentSceneId);
  if (currentIndex === -1) {
    return playlist[0].id;
  }

  return playlist[(currentIndex - 1 + playlist.length) % playlist.length].id;
}
