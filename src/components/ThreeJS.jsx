'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 📦 Vertex Shader
const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 🎨 Fragment Shader
const fragmentShader = `
  varying vec2 vUv;

  void main() {
    gl_FragColor = vec4(1.0, 0.2, 0.6, 1.0);
  }
`;

const ShaderBox = () => {
  const meshRef = useRef();

  // 🔁 Animate rotation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2, 1, 1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const Scene = () => (
  <Canvas camera={{ position: [0, 0, 5] }}>
    <ambientLight />
    <ShaderBox />
  </Canvas>
);

export default Scene;
