/**
 * 3D karusel hisobi (toza funksiyalar — DOM yo'q, shuning uchun test qilinadi).
 *
 * Shishalar aylana bo'ylab turadi va kamera oldidagisi eng katta, orqadagisi
 * kichik, xira va qorong'i. `offset` — elementning "oldingi" holatdan necha
 * qadam uzoqligi (0 = aynan oldida, ±1 = qo'shni).
 */
export interface Placement {
  /** Gorizontal siljish (px). */
  x: number;
  /** Chuqurlik (px): 0 — oldida, manfiy — orqada. */
  z: number;
  scale: number;
  /** Markazga qarab burilish (gradus). */
  rotate: number;
  opacity: number;
  brightness: number;
  zIndex: number;
  /** Orqa yorug'lik vazni: oldidagi element uchun 1, qo'shnida 0. */
  glow: number;
}

/** `i` ning `current` ga nisbatan eng qisqa yo'ldagi masofasi: (-count/2, count/2]. */
export function wrapOffset(index: number, current: number, count: number): number {
  const raw = (((index - current) % count) + count) % count;
  return raw > count / 2 ? raw - count : raw;
}

export function placeItem(offset: number, count: number, radius: number): Placement {
  const theta = (offset * Math.PI * 2) / count;
  const depth = (Math.cos(theta) + 1) / 2;

  return {
    x: Math.sin(theta) * radius,
    z: (Math.cos(theta) - 1) * radius * 0.55,
    scale: 0.5 + 0.5 * depth ** 1.2,
    rotate: Math.sin(theta) * 34,
    opacity: 0.12 + 0.88 * depth ** 1.7,
    brightness: 0.5 + 0.5 * depth,
    zIndex: Math.round(depth * 100),
    glow: Math.max(0, 1 - Math.abs(offset)),
  };
}

/** CSS qiymatlari: serverda va brauzerda BIR XIL satr chiqishi uchun yaxlitlanadi. */
export function toStyle(p: Placement): {
  transform: string;
  opacity: number;
  filter: string;
  zIndex: number;
} {
  const n = (v: number) => v.toFixed(3);

  return {
    transform: `translate3d(${n(p.x)}px, 0, ${n(p.z)}px) rotateY(${n(p.rotate)}deg) scale(${n(p.scale)})`,
    opacity: Number(n(p.opacity)),
    filter: `brightness(${n(p.brightness)})`,
    zIndex: p.zIndex,
  };
}

/** Eng yaqin butun indeks (aylana bo'ylab). */
export function snapIndex(current: number, count: number): number {
  return (((Math.round(current) % count) + count) % count) as number;
}
