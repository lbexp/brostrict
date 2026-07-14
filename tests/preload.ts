import { createChromeMock } from './unit/shared/chrome-mock';

(globalThis as typeof globalThis & { chrome: ReturnType<typeof createChromeMock> }).chrome = createChromeMock();
