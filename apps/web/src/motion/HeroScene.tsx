'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * Bosh ekrandagi uch o'lchamli kompozitsiya (CLAUDE.md §17).
 *
 * DIQQAT: bu BARFF mahsulotining haqiqiy modeli EMAS. Shisha shakli
 * kodda, lathe geometriya bilan quriladi — ya'ni mavhum bezak.
 * Haqiqiy model va mahsulot fotosurati BARFF dan kelgach
 * almashtiriladi (CLAUDE.md §1).
 *
 * NEGA tashqi `.glb` fayl yo'q: u qo'shimcha so'rov va megabaytlar
 * demak, va bizda haqiqiy model yo'q — o'ylab topilgan shishani fayl
 * sifatida saqlash uni "haqiqiy" ko'rsatardi.
 *
 * NEGA drei ISHLATILMADI: bu sahnada undan faqat `Float` va
 * `Environment` kerak bo'lardi. Birinchisi bir necha qator kod,
 * ikkinchisi esa tashqi HDR fayl talab qiladi. Butun kutubxonani
 * shuning uchun yuklash bundle'ni bekorga og'irlashtirardi.
 */

/** Shisha profili — lathe uchun kesim chizig'i. */
function bottleProfile(): THREE.Vector2[] {
  // Tag -> tana -> yelka -> bo'yin -> og'iz.
  const shape: [number, number][] = [
    [0, -1.5],
    [0.52, -1.5],
    [0.55, -1.35],
    [0.55, 0.2],
    [0.5, 0.45],
    [0.28, 0.75],
    [0.22, 0.9],
    [0.22, 1.35],
    [0.26, 1.4],
    [0, 1.42],
  ];

  return shape.map(([x, y]) => new THREE.Vector2(x, y));
}

function Bottle() {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.LatheGeometry(bottleProfile(), 64), []);

  useFrame((state) => {
    if (group.current === null) return;

    const t = state.clock.elapsedTime;
    // Juda sekin va kichik harakat: e'tiborni tortmasligi kerak.
    group.current.rotation.y = t * 0.15;
    group.current.position.y = Math.sin(t * 0.6) * 0.06;
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        {/*
          Shishasimon material. Haqiqiy sinish (`transmission`)
          ISHLATILMAYDI: u har kadrda sahnani qayta chizadi va kuchsiz
          qurilmada kadrlar sonini yarmiga tushiradi.
        */}
        <meshPhysicalMaterial
          color="#0f2a1c"
          roughness={0.18}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
}

/** Havoda suzuvchi zarrachalar. */
function Particles({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    return buffer;
  }, [count]);

  useFrame((state) => {
    if (points.current === null) return;
    points.current.rotation.y = state.clock.elapsedTime * 0.04;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={0.03} color="#16b45f" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

/**
 * Zarrachalar soni qurilmaga qarab.
 *
 * Telefon ekranida ularning yarmi ham ko'rinmaydi, lekin har biri
 * kadrga yuk qo'shadi.
 */
function particleCount(): number {
  return window.matchMedia('(min-width: 1024px)').matches ? 140 : 60;
}

export default function HeroScene() {
  const count = useMemo(() => particleCount(), []);

  return (
    <Canvas
      // Sahna BEZAK: undagi ma'lumot matnda ham bor, shuning uchun
      // ekran o'quvchidan yashiriladi.
      aria-hidden="true"
      camera={{ position: [0, 0, 5], fov: 38 }}
      // Yuqori chegara 2: retina'da 3x chizish foyda bermaydi, lekin
      // piksel sonini ikki barobar oshiradi.
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} color="#d9ffe9" />
      <directionalLight position={[-4, -1, -2]} intensity={0.5} color="#16b45f" />

      <Bottle />
      <Particles count={count} />
    </Canvas>
  );
}
