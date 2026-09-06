// Compressed frames stay in memory after loading. Only a small, directional
// window is decoded, preventing a multi-gigabyte image cache on mobile devices.
export class FrameStore {
  constructor(manifest, base, { limit = 26, concurrency = 3, onAvailable = () => {} } = {}) {
    this.manifest = manifest;
    this.base = base;
    this.limit = limit;
    this.concurrency = concurrency;
    this.onAvailable = onAvailable;
    this.packs = [];
    this.cache = new Map();
    this.pending = new Map();
    this.queue = [];
    this.active = 0;
    this.focus = 0;
    this.pinned = -1;
    this.disposed = false;
    this.maxCache = 0;
    this.decodeErrors = 0;
  }

  async load(onProgress, signal) {
    let completed = 0;
    let next = 0;
    const sizes = this.manifest.packs.map(p => p.bytes);
    const total = sizes.reduce((a, b) => a + b, 0);
    const worker = async () => {
      while (next < sizes.length) {
        const index = next++;
        let lastError;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(`${this.base}/${this.manifest.packs[index].file}`, { signal, cache: 'force-cache' });
            if (!response.ok) throw new Error(`Image download failed (${response.status})`);
            const buffer = await response.arrayBuffer();
            if (buffer.byteLength !== sizes[index]) throw new Error('Incomplete image download');
            this.packs[index] = buffer;
            completed += buffer.byteLength;
            onProgress(completed / total);
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            if (signal?.aborted) throw error;
          }
        }
        if (lastError) throw lastError;
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
  }

  imageId(frame) { return this.manifest.map[Math.max(0, Math.min(this.manifest.frames - 1, Math.round(frame)))]; }
  get(frame) { return this.cache.get(this.imageId(frame)); }
  pin(frame) { this.pinned = this.imageId(frame); }

  ensure(frame) {
    const id = this.imageId(frame);
    if (this.cache.has(id)) return Promise.resolve(this.cache.get(id));
    if (this.pending.has(id)) return this.pending.get(id).promise;
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    this.pending.set(id, { promise, resolve, reject });
    this.queue.unshift(id);
    this.pump();
    return promise;
  }

  focusOn(frame, direction = 1) {
    this.focus = Math.round(frame);
    // Rebuild speculative work around the latest request; rapid reversals must
    // not leave a long stale decode queue ahead of the visible frame.
    const wanted = [];
    for (let offset = 0; offset < 18; offset++) wanted.push(this.imageId(this.focus + direction * offset));
    for (let offset = 1; offset <= 7; offset++) wanted.push(this.imageId(this.focus - direction * offset));
    this.queue = [...new Set([...wanted, ...this.queue.filter(id => this.pending.has(id))])]
      .filter(id => !this.cache.has(id));
    this.pump();
  }

  async decode(id) {
    const [pack, offset, length] = this.manifest.images[id];
    const blob = new Blob([new Uint8Array(this.packs[pack], offset, length)], { type: 'image/webp' });
    if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      image.close = () => { image.src = ''; };
      return image;
    } finally { URL.revokeObjectURL(url); }
  }

  pump() {
    if (this.disposed) return;
    while (this.active < this.concurrency && this.queue.length) {
      const id = this.queue.shift();
      if (this.cache.has(id) || this.inFlight?.has(id)) continue;
      this.inFlight ??= new Set();
      this.inFlight.add(id);
      this.active++;
      this.decode(id).then(bitmap => {
        if (this.disposed) { bitmap.close?.(); return; }
        this.cache.set(id, bitmap);
        this.evict();
        this.maxCache = Math.max(this.maxCache, this.cache.size);
        this.pending.get(id)?.resolve(bitmap);
        this.pending.delete(id);
        this.onAvailable();
      }).catch(error => {
        this.decodeErrors++;
        this.pending.get(id)?.reject(error);
        this.pending.delete(id);
      }).finally(() => {
        this.active--;
        this.inFlight.delete(id);
        this.pump();
      });
    }
  }

  evict() {
    if (this.cache.size <= this.limit) return;
    const focusId = this.imageId(this.focus);
    const candidates = [...this.cache.keys()].filter(id => id !== this.pinned && id !== focusId)
      .sort((a, b) => Math.abs(b - focusId) - Math.abs(a - focusId));
    while (this.cache.size > this.limit && candidates.length) {
      const id = candidates.shift();
      this.cache.get(id)?.close?.();
      this.cache.delete(id);
    }
  }

  destroy() {
    this.disposed = true;
    this.queue = [];
    for (const image of this.cache.values()) image.close?.();
    this.cache.clear();
    this.packs = [];
  }
}
