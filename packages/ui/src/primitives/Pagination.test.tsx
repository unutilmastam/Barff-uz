import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, visiblePages } from './Pagination';

const labels = {
  navigation: 'Sahifalash',
  previous: 'Oldingi',
  next: 'Keyingi',
  page: (n: number) => `${n}-sahifa`,
};

describe('visiblePages', () => {
  it('kam sahifada hammasini korsatadi', () => {
    expect(visiblePages(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('kop sahifada uzilish qoyadi', () => {
    expect(visiblePages(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it('boshida chap uzilish yoq', () => {
    expect(visiblePages(2, 20)).toEqual([1, 2, 3, null, 20]);
  });

  it('oxirida ong uzilish yoq', () => {
    expect(visiblePages(19, 20)).toEqual([1, null, 18, 19, 20]);
  });

  it('joriy sahifa har doim korinadi', () => {
    for (const page of [1, 5, 13, 40]) {
      expect(visiblePages(page, 40)).toContain(page);
    }
  });
});

describe('Pagination', () => {
  it('bitta sahifada umuman chizilmaydi', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} labels={labels} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('joriy sahifani aria-current bilan belgilaydi', () => {
    render(<Pagination page={3} totalPages={10} onPageChange={vi.fn()} labels={labels} />);
    expect(screen.getByRole('button', { name: '3-sahifa' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('birinchi sahifada "oldingi" ochirilgan', () => {
    render(<Pagination page={1} totalPages={10} onPageChange={vi.fn()} labels={labels} />);
    expect(screen.getByRole('button', { name: 'Oldingi' })).toBeDisabled();
  });

  it('oxirgi sahifada "keyingi" ochirilgan', () => {
    render(<Pagination page={10} totalPages={10} onPageChange={vi.fn()} labels={labels} />);
    expect(screen.getByRole('button', { name: 'Keyingi' })).toBeDisabled();
  });

  it('sahifa bosilganda raqam uzatiladi', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={10} onPageChange={onPageChange} labels={labels} />);

    await userEvent.click(screen.getByRole('button', { name: '2-sahifa' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('navigatsiya landmark nomi bor', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} labels={labels} />);
    expect(screen.getByRole('navigation', { name: 'Sahifalash' })).toBeInTheDocument();
  });
});
