import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// NestJS dekoratorlari `emitDecoratorMetadata` ni talab qiladi — esbuild uni
// qo'llab-quvvatlamaydi, shuning uchun testlarda SWC transformeri ishlatiladi.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.test.ts', 'test/**/*.e2e-spec.ts'],
    // Muhit o'zgaruvchilari modul import qilinishidan OLDIN o'rnatilishi kerak.
    setupFiles: ['./test/setup-env.ts'],
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
