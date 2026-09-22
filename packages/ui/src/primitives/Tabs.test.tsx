import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs } from './Tabs';

const items = [
  { value: 'tarkib', label: 'Tarkibi', content: 'Suv, shakar, konsentrat.' },
  { value: 'saqlash', label: 'Saqlash', content: '+2 dan +20 gacha.' },
];

describe('Tabs', () => {
  it('tablist nomlangan', () => {
    render(<Tabs items={items} label="Mahsulot tafsilotlari" />);
    expect(screen.getByRole('tablist', { name: 'Mahsulot tafsilotlari' })).toBeInTheDocument();
  });

  it('birinchi tab boshida tanlangan', () => {
    render(<Tabs items={items} label="Tafsilotlar" />);
    expect(screen.getByRole('tab', { name: 'Tarkibi' })).toHaveAttribute('aria-selected', 'true');
  });

  it('bosilganda tab almashadi', async () => {
    render(<Tabs items={items} label="Tafsilotlar" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Saqlash' }));

    expect(screen.getByRole('tab', { name: 'Saqlash' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('+2 dan +20 gacha.')).toBeVisible();
  });

  it("o'q tugmalari bilan yurish ishlaydi", async () => {
    render(<Tabs items={items} label="Tafsilotlar" />);

    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Tarkibi' })).toHaveFocus();

    // Radix o'q tugmalarini o'zi boshqaradi — qo'lbola variantda bu ishlamasdi.
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Saqlash' })).toHaveFocus();
  });

  it('defaultValue hurmat qilinadi', () => {
    render(<Tabs items={items} label="Tafsilotlar" defaultValue="saqlash" />);
    expect(screen.getByRole('tab', { name: 'Saqlash' })).toHaveAttribute('aria-selected', 'true');
  });
});
