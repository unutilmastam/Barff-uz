import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('yorliq maydonga bogliq', () => {
    render(<Input label="Telefon" />);
    // `getByLabelText` faqat yorliq to'g'ri bog'langandagina topadi.
    expect(screen.getByLabelText('Telefon')).toBeInTheDocument();
  });

  it('yorliq bosilganda maydon fokus oladi', async () => {
    render(<Input label="Email" />);
    await userEvent.click(screen.getByText('Email'));
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('xato role=alert bilan elon qilinadi', () => {
    render(<Input label="Email" error="Email notogri" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Email notogri');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('xato maydonga aria-describedby orqali bogliq', () => {
    render(<Input label="Email" error="Email notogri" />);

    const input = screen.getByLabelText('Email');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy as string)).toHaveTextContent('Email notogri');
  });

  it('izoh ham aria-describedby ga qoshiladi', () => {
    render(<Input label="Telefon" hint="+998 formatida" />);

    const input = screen.getByLabelText('Telefon');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toContain('+998 formatida');
  });

  it('xatosiz holatda aria-invalid qoyilmaydi', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('bir sahifadagi ikki maydon turli id oladi', () => {
    render(
      <>
        <Input label="Birinchi" />
        <Input label="Ikkinchi" />
      </>,
    );

    expect(screen.getByLabelText('Birinchi').id).not.toBe(screen.getByLabelText('Ikkinchi').id);
  });
});
