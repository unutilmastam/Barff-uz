'use client';

import { useEffect, useRef } from 'react';
// Tip sifatida — bu import qurilgan kodda QOLMAYDI, ya'ni `three`
// asosiy bundle'ga tushmaydi. Ishlash paytidagi nusxa dinamik.
import type * as ThreeTypes from 'three';
import { useMotionEnabled } from './useMotionEnabled';
import { hasWebGL } from './webgl';

/**
 * Hero ortidagi HAJMLI zarracha maydoni (WebGL).
 *
 * ================== NEGA AYNAN ZARRACHA ==================
 *
 * Avvalgi 3D sahna kodda qurilgan MAVHUM shisha edi — BARFF
 * mahsuloti emas. Uni qaytarish ikki muammo tug'dirardi: ekranda
 * ikkita turli shisha (tekis illyustratsiya va 3D) paydo bo'lardi, va
 * qurilmaga qarab mahsulot boshqacha ko'rinardi. Shuning uchun WebGL
 * qatlam mahsulotni CHIZMAYDI — u faqat chuqurlik beradi.
 *
 * Zarrachalar bezak, ya'ni hech qanday mahsulot da'vosi yo'q
 * (CLAUDE.md §1). Haqiqiy `.glb` model kelgach (Q24) shu qatlam
 * o'rniga rost mahsulot sahnasi qo'yiladi.
 *
 * ================== QACHON ISHLAYDI ==================
 *
 * Uch shart: harakat yoqilgan (`useMotionEnabled` — reduced-motion,
 * qurilma quvvati, hidratsiya), WebGL mavjud, va ekran keng. Aks
 * holda hech narsa chizilmaydi va hero tekis kompozitsiya bilan
 * to'liq ishlaydi.
 *
 * `three` DINAMIK yuklanadi — u asosiy bundle'ga tushmaydi
 * (CLAUDE.md §17).
 */

/** Zarrachalar soni. Ekran kengligiga qarab kamayadi. */
const COUNT = { wide: 900, narrow: 420 };

export function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const enabled = useMotionEnabled();

  useEffect(() => {
    const canvas = ref.current;
    if (!enabled || canvas === null) return undefined;
    if (!hasWebGL()) return undefined;
    // Tor ekranda WebGL kontekstini ochish batareyani bekorga yeydi.
    if (!window.matchMedia('(min-width: 768px)').matches) return undefined;

    let cancelled = false;
    let stop: (() => void) | undefined;

    void (async () => {
      const THREE = await import('three');
      if (cancelled) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.z = 14;

      const count = window.innerWidth >= 1280 ? COUNT.wide : COUNT.narrow;
      const positions = new Float32Array(count * 3);
      const speeds = new Float32Array(count);

      for (let i = 0; i < count; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 26;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
        speeds[i] = 0.08 + Math.random() * 0.22;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      /*
        Rang KO'RINISHGA qarab olinadi: yorug' fonda och kulrang
        zarracha ko'rinmaydi, qorong'ida esa to'q kulrang. Qiymat
        hisoblangan `--color-fg` dan olinadi, ya'ni palitra
        o'zgarsa bu ham o'zgaradi.
      */
      const fg = getComputedStyle(document.documentElement).getPropertyValue('--color-fg').trim();

      const material = new THREE.PointsMaterial({
        color: new THREE.Color(fg || '#0a0a0a'),
        size: 0.055,
        transparent: true,
        opacity: 0.35,
        sizeAttenuation: true,
        depthWrite: false,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      const resize = () => {
        const { clientWidth, clientHeight } = canvas;
        if (clientWidth === 0 || clientHeight === 0) return;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
      };
      resize();

      const observer = new ResizeObserver(resize);
      observer.observe(canvas);

      // Kursor sahnani juda yengil buradi — "tirik" his beradi.
      const pointer = { x: 0, y: 0 };
      const onMove = (event: MouseEvent) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener('mousemove', onMove);

      let frame = 0;
      let previous = performance.now();

      const render = (now: number) => {
        const delta = Math.min((now - previous) / 1000, 0.1);
        previous = now;

        const attribute = geometry.getAttribute('position') as ThreeTypes.BufferAttribute;
        const array = attribute.array as Float32Array;

        for (let i = 0; i < count; i += 1) {
          const index = i * 3 + 1;
          const next = (array[index] ?? 0) + (speeds[i] ?? 0) * delta;
          // Yuqoriga chiqib ketgan zarracha pastdan qaytib kiradi.
          array[index] = next > 9 ? -9 : next;
        }
        attribute.needsUpdate = true;

        points.rotation.y += (pointer.x * 0.25 - points.rotation.y) * 0.02;
        points.rotation.x += (-pointer.y * 0.15 - points.rotation.x) * 0.02;

        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);

      stop = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener('mousemove', onMove);
        geometry.dispose();
        material.dispose();
        // Kontekst bo'shatilmasa brauzerdagi WebGL kontekstlari
        // chegarasi tez to'lib qoladi.
        renderer.dispose();
      };
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [enabled]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
