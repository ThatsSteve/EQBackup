import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Scene3D.jsx — Canvas 3D identico a App.jsx:188-226 (pre-Fase 4).
 * Particelle animate + point light che reagisce a step e baseVol.
 */
export function Scene3D({ state }) {
  const lightRef = useRef();
  const particlesRef = useRef();

  const { step, baseVol } = state;

  useFrame((clockState) => {
    const t = clockState.clock.getElapsedTime();

    if (lightRef.current) {
      lightRef.current.position.lerp(new THREE.Vector3(0, 0, 2), 0.05);
      lightRef.current.intensity = 5;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.1;
      particlesRef.current.material.opacity = step >= 2 ? 0.2 + (baseVol / 200) : 0.2;
    }
  });

  const particles = [];
  for (let i = 0; i < 500; i++) {
    particles.push((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
  }
  const positions = new Float32Array(particles);

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight ref={lightRef} color="#ff3366" distance={10} />
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#a0a0b0" transparent opacity={0.5} />
      </points>
    </>
  );
}