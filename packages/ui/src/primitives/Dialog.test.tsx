import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Dialog } from './Dialog';

function Example() {
  return (
    <>
      <button type="button">Tashqaridagi tugma</button>
      <Dialog
        trigger={<Button>Ochish</Button>}
        title="Buyurtmani tasdiqlash"
        description="Bu amalni bekor qilib bolmaydi."
        closeLabel="Yopish"
      >
        <input aria-label="Izoh" />
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('boshida yopiq', () => {
    render(<Example />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('trigger bosilganda ochiladi va nomlanadi', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Ochish' }));

    // Nom bo'lmasa ekran o'quvchi oynani "dialog" deb e'lon qilardi.
    expect(screen.getByRole('dialog', { name: 'Buyurtmani tasdiqlash' })).toBeInTheDocument();
  });

  it('tavsif oynaga boglanadi', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Ochish' }));

    const dialog = screen.getByRole('dialog');
    const id = dialog.getAttribute('aria-describedby');
    expect(document.getElementById(id as string)).toHaveTextContent(
      'Bu amalni bekor qilib bolmaydi.',
    );
  });

  it('Escape bilan yopiladi', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Ochish' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('yopish tugmasi oqiladigan nomga ega', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Ochish' }));

    await userEvent.click(screen.getByRole('button', { name: 'Yopish' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('yopilgach fokus triggerga qaytadi', async () => {
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Ochish' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    // Fokus qaytmasa, klaviatura foydalanuvchisi sahifa boshiga tushib
    // qolardi va qayerda ekanini yo'qotardi.
    expect(trigger).toHaveFocus();
  });
});
