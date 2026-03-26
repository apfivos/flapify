export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}

export async function toggleFullscreen(): Promise<boolean> {
  if (!document.fullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
      return true;
    }
    return false;
  }

  await document.exitFullscreen().catch(() => undefined);
  return false;
}
