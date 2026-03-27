import { BOARD_SIZE_PRESETS } from "../constants";
import { centerText, resolveBoardDimensions } from "../lib/board";
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
  const board = resolveBoardDimensions(BOARD_SIZE_PRESETS[settings.boardSize]);
  const grid = activeSceneId
    ? renderScene(activeSceneId, {
        now,
        settings,
        feeds,
        board,
        quoteIndex,
        customIndex,
      })
    : centerText("ENABLE A SCENE IN ADVANCED", board);

  return <Board grid={grid} onBusyChange={onBusyChange} />;
}
