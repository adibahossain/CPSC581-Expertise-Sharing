const WASM_INFO_RE =
  /Created TensorFlow Lite XNNPACK delegate for CPU|Created TensorFlow Lite|TfLite|Initialized .* delegate/i;

const CHANNELS = ["log", "info", "warn", "error", "debug"] as const;

let suppressionDepth = 0;
const saved = {} as Record<(typeof CHANNELS)[number], typeof console.log>;

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

function getConsoleText(arg: unknown): string | null {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.message;
  if (typeof arg === "object" && arg !== null && "message" in arg) {
    return typeof arg.message === "string" ? arg.message : null;
  }
  return null;
}

function shouldSuppress(args: unknown[]): boolean {
  return args.some((arg) => {
    const text = getConsoleText(arg);
    return text ? WASM_INFO_RE.test(text) : false;
  });
}

function installConsoleSuppression() {
  if (suppressionDepth > 0) {
    suppressionDepth += 1;
    return;
  }

  suppressionDepth = 1;

  for (const ch of CHANNELS) {
    saved[ch] = console[ch];
    console[ch] = (...args: unknown[]) => {
      if (shouldSuppress(args)) return;
      saved[ch].apply(console, args);
    };
  }
}

function restoreConsoleSuppression() {
  if (suppressionDepth === 0) return;

  suppressionDepth -= 1;
  if (suppressionDepth > 0) return;

  for (const ch of CHANNELS) {
    console[ch] = saved[ch];
  }
}

/**
 * Run `fn` while muting known MediaPipe / TFLite WASM info messages.
 * Emscripten may route through any console method; Next.js Turbopack
 * dev overlay surfaces all of them as errors.
 */
export function withSuppressedWasmLogs<T>(fn: () => Promise<T>): Promise<T>;
export function withSuppressedWasmLogs<T>(fn: () => T): T;
export function withSuppressedWasmLogs<T>(fn: () => T | Promise<T>): T | Promise<T> {
  installConsoleSuppression();

  try {
    const result = fn();
    if (isPromiseLike(result)) {
      return result.finally(restoreConsoleSuppression);
    }

    restoreConsoleSuppression();
    return result;
  } catch (error) {
    restoreConsoleSuppression();
    throw error;
  }
}
