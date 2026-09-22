import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('standart turi `button` — formani tasodifan yubormaydi', () => {
    render(<Button>Yuborish</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('aniq berilgan `type` saqlanadi', () => {
    render(<Button type="submit">Yuborish</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('bosilganda hodisani chaqiradi', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Bosing</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("o'chirilgan holatda bosilmaydi", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Bosing
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('klaviatura bilan ishlaydi', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Bosing</Button>);

    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });

  it('asChild bilan havolani tugma korinishida chizadi', () => {
    render(
      <Button asChild>
        <a href="/uz">Havola</a>
      </Button>,
    );

    // `<a>` `<a>` bo'lib qolishi shart: aks holda klaviatura xulqi
    // va kontekst menyusi buziladi.
    const link = screen.getByRole('link', { name: 'Havola' });
    expect(link).toHaveAttribute('href', '/uz');
    expect(link).not.toHaveAttribute('type');
  });
});
