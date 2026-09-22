'use client';

import {
  Accordion,
  Badge,
  Button,
  Checkbox,
  Dialog,
  GlassCard,
  Input,
  MediaFrame,
  Pagination,
  Section,
  SectionHeader,
  Select,
  Sheet,
  Skeleton,
  StatBlock,
  Tabs,
  Textarea,
  ToastProvider,
  useToast,
} from '@barff/ui';
import { useState } from 'react';

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--color-line)] py-10">
      <h2 className="mb-6 text-sm font-medium uppercase tracking-widest text-[var(--color-fg-subtle)]">
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <Button variant="secondary" onClick={() => toast.show({ title: 'Saqlandi' })}>
      Toast korsatish
    </Button>
  );
}

export function UiGallery() {
  const [page, setPage] = useState(3);

  return (
    <ToastProvider closeLabel="Yopish">
      <Row title="Button">
        <Button variant="primary">Asosiy</Button>
        <Button variant="secondary">Ikkilamchi</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Xavfli</Button>
        <Button disabled>Ochirilgan</Button>
        <Button size="sm">Kichik</Button>
        <Button size="lg">Katta</Button>
        <Button asChild>
          <a href="#link">Havola-tugma</a>
        </Button>
      </Row>

      <Row title="Badge">
        <Badge>Neutral</Badge>
        <Badge tone="brand">Brand</Badge>
        <Badge tone="success">DELIVERED</Badge>
        <Badge tone="warning">PENDING_REVIEW</Badge>
        <Badge tone="danger">FAILED</Badge>
        <Badge tone="info">IN_TRANSIT</Badge>
      </Row>

      <Row title="Form">
        <div className="w-full max-w-sm space-y-5">
          <Input label="Kompaniya nomi" placeholder="Anor Savdo" required />
          <Input label="Telefon" hint="+998 formatida" defaultValue="+998 90 123 45 67" />
          <Input label="Email" error="Email manzili notogri" defaultValue="buzuq" />
          <Textarea label="Xabar" placeholder="Qisqacha yozing" />
          <Select
            label="Hudud"
            placeholder="Tanlang"
            options={[
              { value: 'tashkent', label: 'Toshkent' },
              { value: 'samarkand', label: 'Samarqand' },
              { value: 'bukhara', label: 'Buxoro', disabled: true },
            ]}
          />
          <Checkbox label="Shartlarga roziman" hint="Maxfiylik siyosati bilan tanishdim" />
        </div>
      </Row>

      <Row title="Overlay">
        <Dialog
          trigger={<Button variant="secondary">Dialog</Button>}
          title="Buyurtmani tasdiqlash"
          description="Tasdiqlangandan keyin buyurtma omborga tushadi."
          closeLabel="Yopish"
          footer={
            <>
              <Button variant="ghost">Bekor qilish</Button>
              <Button>Tasdiqlash</Button>
            </>
          }
        >
          <Input label="Izoh" placeholder="Ixtiyoriy" />
        </Dialog>

        <Sheet
          trigger={<Button variant="secondary">Sheet</Button>}
          title="Menyu"
          closeLabel="Yopish"
        >
          <nav className="flex flex-col gap-3 text-sm">
            <a href="#a">Mahsulotlar</a>
            <a href="#b">Ishlab chiqarish</a>
            <a href="#c">Aloqa</a>
          </nav>
        </Sheet>

        <ToastDemo />
      </Row>

      <Row title="Tabs / Accordion">
        <div className="w-full max-w-xl space-y-10">
          <Tabs
            label="Mahsulot tafsilotlari"
            items={[
              { value: 'tarkib', label: 'Tarkibi', content: 'Suv, shakar, meva konsentrati.' },
              { value: 'saqlash', label: 'Saqlash', content: '+2 dan +20 gacha, quruq joyda.' },
              { value: 'hujjat', label: 'Hujjatlar', content: 'Sertifikatlar S10 da qoshiladi.' },
            ]}
          />

          <Accordion
            items={[
              { value: 'a', title: 'Yetkazib berish qancha vaqt oladi?', content: 'MOCK javob.' },
              { value: 'b', title: 'Minimal buyurtma bormi?', content: 'MOCK javob.' },
            ]}
          />
        </div>
      </Row>

      <Row title="Pagination / Skeleton">
        <div className="w-full space-y-8">
          <Pagination
            page={page}
            totalPages={20}
            onPageChange={setPage}
            labels={{
              navigation: 'Sahifalash',
              previous: 'Oldingi sahifa',
              next: 'Keyingi sahifa',
              page: (n) => `${n}-sahifa`,
            }}
          />
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      </Row>

      <Row title="Surfaces">
        <div className="w-full space-y-12">
          <SectionHeader
            eyebrow="Mahsulotlar"
            title="Har bir tomchida tabiat"
            description="Bu SectionHeader komponenti — eyebrow, sarlavha, tavsif va amal."
            action={<Button variant="secondary">Hammasi</Button>}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <GlassCard className="p-6">
              <h3 className="font-medium">GlassCard</h3>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                Ingichka chegara, shaffof yuza, blur.
              </p>
            </GlassCard>
            <GlassCard interactive className="p-6">
              <h3 className="font-medium">interactive</h3>
              <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                Sichqoncha ostida yorishadi.
              </p>
            </GlassCard>
            <MediaFrame ratio="landscape" caption="MediaFrame — nisbat oldindan band">
              <div className="grid h-full place-items-center text-sm text-[var(--color-fg-subtle)]">
                rasm joyi
              </div>
            </MediaFrame>
          </div>

          <StatBlock
            unverifiedLabel="tasdiqlanmagan"
            stats={[
              { value: '—', label: 'Ishlab chiqarish quvvati', unverified: true },
              { value: '—', label: 'Xodimlar', unverified: true },
              { value: '3', label: 'Tillar' },
              { value: '2026', label: 'Loyiha boshlandi' },
            ]}
          />

          <Section tone="raised" className="rounded-xl px-6">
            <p className="text-sm text-[var(--color-fg-muted)]">
              Section tone=&quot;raised&quot; — qoshni bolimlardan ajralib turadi.
            </p>
          </Section>
        </div>
      </Row>
    </ToastProvider>
  );
}
