'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const Cube = () => {
  const meshRef = useRef();

  // 🔁 Animate cube rotation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={'#ff3366'} />
    </mesh>
  );
};

const Scene = () => {
  return (
    <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* Cube */}
      <Cube />

      {/* Orbit Controls */}
      <OrbitControls enableDamping />
    </Canvas>
  );
};

export default Scene;
