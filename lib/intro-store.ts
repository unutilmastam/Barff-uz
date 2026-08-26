/**
 * Kirish (Loader) tugaganini bildiruvchi signal.
 *
 * Loader birinchi yuklashda 1.4s ko'rinadi. Hero timeline'i darhol boshlansa,
 * u loader ORTIDA o'ynab tugaydi va foydalanuvchi animatsiyani umuman ko'rmaydi.
 * Shu sababli Hero shu store'ni kutadi.
 *
 * `useSyncExternalStore` uchun store: server `false`, Loader tugagach `true`.
 */
let finished = false;
const listeners = new Set<() => void>();

export const introStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): boolean {
    return finished;
  },

  getServerSnapshot(): boolean {
    return false;
  },

  complete() {
    if (finished) return;
    finished = true;
    listeners.forEach((listener) => listener());
  },
};
