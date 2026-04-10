export class RequestBusyGuard<TKey> {
  private readonly activeKeys = new Set<TKey>();

  async run<T>(
    key: TKey,
    onBusy: () => Promise<T> | T,
    task: () => Promise<T> | T,
  ): Promise<T> {
    if (this.activeKeys.has(key)) {
      return await onBusy();
    }

    this.activeKeys.add(key);

    try {
      return await task();
    } finally {
      this.activeKeys.delete(key);
    }
  }
}
