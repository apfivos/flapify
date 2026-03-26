import { centerText } from "../lib/board";
import { renderScene } from "../lib/scenes";
import { Board } from "./Board";
import type { AppFeeds, PersistedSettings, SceneId } from "../types";

interface SceneBoardProps {
  activeSceneId: SceneId | null;
  now: Date;
  settings: PersistedSettings;
  feeds: AppFeeds;
  quoteIndex: number;
  customIndex: number;
  onBusyChange?: (busy: boolean) => void;
}

export function SceneBoard({
  activeSceneId,
  now,
  settings,
  feeds,
  quoteIndex,
  customIndex,
  onBusyChange,
}: SceneBoardProps) {
  const grid = activeSceneId
    ? renderScene(activeSceneId, {
        now,
        settings,
        feeds,
        quoteIndex,
        customIndex,
      })
    : centerText("ENABLE A SCENE IN ADVANCED");

  return <Board grid={grid} onBusyChange={onBusyChange} />;
}
