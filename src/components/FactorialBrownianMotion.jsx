'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// 📦 Vertex Shader
const vertexShader = `
precision highp float;
varying vec2 vUv;
uniform float uTime;

void main () {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.z += modelPosition.y ;
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;
}
`;

// 🎨 Fragment Shader
const fragmentShader = `
  precision highp float;
varying vec2 vUv;
uniform float uTime;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

#define OCTAVES 5


float random (in vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}

float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

float fbm (in vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;
    //
    // Loop of octaves
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 2.;
        amplitude *= .5;
    }
    return value;
}

void main() {
  vec4 color= vec4(0.,0.,0.,1.0);
  color+=fbm(vUv*3.);
  gl_FragColor = color;
  }
`;

const Cube = () => {
  const meshRef = useRef();

  // Animation loop
  const functionAnimate = () => {
    useFrame((state) => {
      if (meshRef.current) {
       
        meshRef.current.material.uniforms.uTime.value+=0.1;
      }
    });
  };

  functionAnimate();

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2, 100, 100]} />
      <shaderMaterial
        vertexShader={vertexShader}
        uniforms={{
          uTime: {
            value: 0
          }
        }}
        fragmentShader={fragmentShader}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const FactorialBrownianMotion = () => {
  return (
    <Canvas camera={{ position: [2, 2, 3], fov: 50 }}>
      {/* Lighting (optional with ShaderMaterial) */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      <Cube />
      <OrbitControls enableDamping />
    </Canvas>
  );
};

export default FactorialBrownianMotion;