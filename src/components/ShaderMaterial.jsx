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
    modelPosition.z += sin(modelPosition.y * 3. + uTime) * 0.2;
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

void main() {
  vec4 color = mix(vec4(1., .0, .0, 1.), vec4(.0, .0, .0, 1.), vUv.x);
  vec4 color2 = vec4(1., .4118, .4118, 1.);
  vec4 color3 = vec4(1., .6235, .2941, 1.);
  vec4 color4 = vec4(.6039, 1., .749, 1.);
  vec4 color5 = mix(color, color2, vUv.x*sin(uTime));
  vec4 color6 = mix(color3, color4, vUv.x);
  vec4 color7 = mix(color5, color6, vUv.y*cos(uTime)*.3);
  float val=smoothstep(.0, 1.,vUv.x);
  gl_FragColor = vec4(val,val,val,1.);
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
      <planeGeometry args={[2, 3, 100, 100]} />
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

const ShaderScene = () => {
  return (
    <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
      {/* Lighting (optional with ShaderMaterial) */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      <Cube />
      <OrbitControls enableDamping />
    </Canvas>
  );
};

export default ShaderScene;