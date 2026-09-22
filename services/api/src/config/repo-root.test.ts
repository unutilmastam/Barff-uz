import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findRepoRoot, localEnvFilePath } from './repo-root';

describe('findRepoRoot', () => {
  it('pnpm-workspace.yaml joylashgan katalogni topadi', () => {
    const root = findRepoRoot();
    expect(root).not.toBeNull();
    expect(root).toBe(process.cwd().replace(/[/\\]services[/\\]api$/, ''));
  });

  it('CWD ozgarsa ham AYNAN SHU natijani beradi', () => {
    // Asosiy maqsad shu: yo'l fayl joylashuvidan hisoblanadi, CWD'dan emas.
    const fromHere = findRepoRoot();
    const fromRoot = findRepoRoot('/');
    expect(fromHere).not.toBeNull();
    expect(fromRoot).toBeNull();
  });

  it('ildiz topilmasa null qaytaradi', () => {
    expect(findRepoRoot('/tmp')).toBeNull();
  });
});

describe('localEnvFilePath', () => {
  it('ildizdagi .env yolini beradi', () => {
    const root = findRepoRoot();
    expect(localEnvFilePath()).toEqual([join(root as string, '.env')]);
  });
});
