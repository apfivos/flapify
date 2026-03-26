import { DEFAULT_SETTINGS } from "../constants";
import {
  getNextSceneId,
  getPreviousSceneId,
  getRenderablePlaylist,
  getSceneDuration,
} from "./playlist";

describe("playlist helpers", () => {
  it("omits custom scene when there are no custom messages", () => {
    const playlist = getRenderablePlaylist(DEFAULT_SETTINGS);
    expect(playlist.some((item) => item.id === "custom")).toBe(false);
  });

  it("cycles through the enabled scenes", () => {
    const playlist = getRenderablePlaylist(DEFAULT_SETTINGS);
    expect(getNextSceneId(playlist, playlist[0].id)).toBe(playlist[1].id);
    expect(getNextSceneId(playlist, playlist[playlist.length - 1].id)).toBe(playlist[0].id);
    expect(getPreviousSceneId(playlist, playlist[0].id)).toBe(playlist[playlist.length - 1].id);
  });

  it("reads persisted durations", () => {
    expect(getSceneDuration(DEFAULT_SETTINGS, "marketsDashboard")).toBe(15);
  });
});
