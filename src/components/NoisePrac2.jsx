'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

const vertexShader = `
precision highp float;
varying vec2 vUv;
uniform float uTime;

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Classic Perlin 3D noise
float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);        // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);        // Fractional part
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = fract(ixy0 * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy0 = abs(gx0) - 0.5;
  vec4 tx0 = floor(gx0 + 0.5);
  gx0 = gx0 - tx0;

  vec4 gx1 = fract(ixy1 * (1.0 / 41.0)) * 2.0 - 1.0;
  vec4 gy1 = abs(gx1) - 0.5;
  vec4 tx1 = floor(gx1 + 0.5);
  gx1 = gx1 - tx1;

  vec3 g000 = vec3(gx0.x, gy0.x, gx0.y);
  vec3 g100 = vec3(gx0.z, gy0.z, gx0.w);
  vec3 g010 = vec3(gx0.y, gy0.y, gx0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gx1.x);
  vec3 g001 = vec3(gx1.y, gy1.y, gx1.z);
  vec3 g101 = vec3(gx1.w, gy1.w, gx1.x);
  vec3 g011 = vec3(gx1.z, gy1.z, gx1.y);
  vec3 g111 = vec3(gx1.x, gy1.x, gx1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;

  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.y, Pf0.z));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.x, Pf1.y, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.x, Pf0.y, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.y, Pf1.z));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

varying float noise;


void main () {
    vUv = uv;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    noise= cnoise(vec3(modelPosition.xy,uTime*0.5))*0.8;
    modelPosition.z += noise*0.3;
    // modelPosition.x += cnoise(vec3(modelPosition.xy, uTime * 0.1)) * 0.2;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

}
`;

const fragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
varying float noise;

void main() {
    vec4 color=vec4(1.,0.,0.,1.);
    color.rgb+=noise;
    gl_FragColor =color;
}

`;


const ShaderPlane = () => {
  const meshRef = useRef();
  const materialRef = useRef();

  useFrame(({ clock }) => {
  materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
});


  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2, 100, 100]} />

      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.DoubleSide}
        uniforms={{
          uTime: { value: 0.0 }
        }}
        flatShading={false}
        wireframe={false}
      />
    </mesh>
  );
};

const NoisePrac2 = () => (
  <Canvas
  camera={{ position: [0, 0, 2] }}
>
  <ambientLight />
  <ShaderPlane />
  <OrbitControls />
</Canvas>

);

export default NoisePrac2;
