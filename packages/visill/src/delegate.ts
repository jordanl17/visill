export function delegate<EventName extends keyof HTMLElementEventMap>(
  root: Element,
  selector: string,
  event: EventName,
  handler: (event: HTMLElementEventMap[EventName], target: Element) => void,
): () => void {
  function listener(listenerEvent: HTMLElementEventMap[EventName]): void {
    const matched = (listenerEvent.target as Element | null)?.closest(selector)
    if (matched && root.contains(matched)) {
      handler(listenerEvent, matched)
    }
  }

  root.addEventListener(event, listener as EventListener)
  return () => root.removeEventListener(event, listener as EventListener)
}
