let activeScrape = Promise.resolve();

/** Serialize browser-backed scrape jobs within a warm server function instance. */
export async function runSerializedScrape<T>(task: () => Promise<T>): Promise<T> {
  const previous = activeScrape;
  let release!: () => void;
  activeScrape = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await task();
  } finally {
    release();
  }
}
