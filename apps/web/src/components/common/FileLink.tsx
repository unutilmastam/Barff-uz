import { type PublicFile } from '@barff/types';

/**
 * Hujjat havolasi.
 *
 * `download` ATAYLAB qo'yilmagan: PDF ni brauzerda ochib ko'rish
 * yuklab olishdan ko'ra ko'proq kerak bo'ladi, yuklab olish esa
 * ko'ruvchi ichida bir bosishda mavjud.
 *
 * Fayl hajmi havola matnida ko'rinadi — mobil internetdagi
 * foydalanuvchi bosishdan oldin nimaga rozi bo'layotganini bilsin.
 */
export function FileLink({
  file,
  label,
  actionLabel,
}: {
  file: PublicFile;
  label: string;
  actionLabel: string;
}) {
  return (
    <a
      href={file.url}
      // Tashqi obyekt xotirasiga havola — yangi oynada ochiladi.
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-4 rounded-lg border border-[var(--color-line)] px-4 py-3 transition-colors hover:border-[var(--color-line-strong)] hover:bg-[var(--color-glass)]"
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{label}</span>
        <span className="text-sm text-[var(--color-fg-subtle)]">
          {formatType(file.mimeType)}
          {file.byteSize !== null && ` · ${formatSize(file.byteSize)}`}
        </span>
      </span>

      <span className="shrink-0 text-sm text-[var(--color-accent-text)]">{actionLabel}</span>
    </a>
  );
}

function formatType(mimeType: string): string {
  return mimeType === 'application/pdf' ? 'PDF' : (mimeType.split('/')[1]?.toUpperCase() ?? 'FILE');
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);

  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
