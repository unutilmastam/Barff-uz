import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Accordion } from './Accordion';

const items = [
  { value: 'a', title: 'Yetkazib berish', content: 'Toshkent boylab 1 kun.' },
  { value: 'b', title: 'Tolov', content: 'Naqd yoki otkazma.' },
];

describe('Accordion', () => {
  it('sarlavhalar tugma sifatida chiziladi', () => {
    render(<Accordion items={items} />);
    expect(screen.getByRole('button', { name: 'Yetkazib berish' })).toBeInTheDocument();
  });

  it('boshida yopiq — aria-expanded false', () => {
    render(<Accordion items={items} />);
    expect(screen.getByRole('button', { name: 'Tolov' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('bosilganda ochiladi va kontent korinadi', async () => {
    render(<Accordion items={items} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tolov' }));

    expect(screen.getByRole('button', { name: 'Tolov' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Naqd yoki otkazma.')).toBeVisible();
  });

  it('single rejimda ikkinchisi ochilsa birinchisi yopiladi', async () => {
    render(<Accordion items={items} mode="single" />);

    await userEvent.click(screen.getByRole('button', { name: 'Yetkazib berish' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tolov' }));

    expect(screen.getByRole('button', { name: 'Yetkazib berish' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('multiple rejimda ikkalasi ham ochiq qoladi', async () => {
    render(<Accordion items={items} mode="multiple" />);

    await userEvent.click(screen.getByRole('button', { name: 'Yetkazib berish' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tolov' }));

    expect(screen.getByRole('button', { name: 'Yetkazib berish' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Tolov' })).toHaveAttribute('aria-expanded', 'true');
  });
});
