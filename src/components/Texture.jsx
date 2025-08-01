'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ✅ Vertex Shader with Perlin Noise
const vertexShader = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
varying float vNoise;

// GLSL Classic Perlin 3D Noise (cnoise)
vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}
vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}
vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);        // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P);        // Fractional part
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
  vec4 iz0 = vec4(Pi0.z);
  vec4 iz1 = vec4(Pi1.z);

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = fract(ixy0 * (1.0 / 7.0)) * 2.0 - 1.0;
  vec4 gy0 = fract(floor(ixy0 * (1.0 / 7.0)) * (1.0 / 7.0)) * 2.0 - 1.0;
  vec4 gz0 = 1.0 - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = fract(ixy1 * (1.0 / 7.0)) * 2.0 - 1.0;
  vec4 gy1 = fract(floor(ixy1 * (1.0 / 7.0)) * (1.0 / 7.0)) * 2.0 - 1.0;
  vec4 gz1 = 1.0 - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

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
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), 
                 vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

void main () {
  vUv = uv;
  
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);

  float noise = cnoise(vec3(modelPosition.xyz * 1.0 + uTime * 0.5));
  vNoise=noise;
  modelPosition.z += noise * 0.4;

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;
}
`;



// ✅ Fragment Shader (with texture)
const fragmentShader = `
precision highp float;
varying float vNoise;

uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  texColor.rgb+=vNoise*0.5;
  gl_FragColor = texColor;
}
`;

const Cube = () => {
  const meshRef = useRef();
  const texture = useLoader(THREE.TextureLoader, '/pic.jpg');

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2, 300, 300]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uTexture: { value: texture },
        }}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const ShaderScene = () => {
  return (
    <Canvas camera={{ position: [2, 2, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <OrbitControls enableDamping />
      <Cube />
    </Canvas>
  );
};

export default ShaderScene;



// 'use client';
// import React, { useRef } from 'react';
// import { Canvas, useFrame } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei';
// import * as THREE from 'three';
// import { useLoader } from '@react-three/fiber';
// import { TextureLoader } from 'three';


// // 📦 Vertex Shader
// const vertexShader = `
// precision highp float;
// varying vec2 vUv;
// uniform float uTime;

// void main () {
//     vUv = uv;
//     vec4 modelPosition = modelMatrix * vec4(position, 1.0);
//     // modelPosition.z += modelPosition.y ;
//     vec4 viewPosition = viewMatrix * modelPosition;
//     vec4 projectedPosition = projectionMatrix * viewPosition;
//     gl_Position = projectedPosition;

// }
// `;

// // 🎨 Fragment Shader
// const fragmentShader = `
//  precision highp float;

// varying vec2 vUv;
// uniform float uTime;
// uniform sampler2D uTexture;

// void main() {
//   vec4 texColor = texture2D(uTexture, vUv); // Sample the texture using UVs
//   gl_FragColor = texColor;
// }

// `;

// const Cube = () => {
//   const meshRef = useRef();

//   // Load the texture
//   const texture = useLoader(TextureLoader, '/pic.jpg'); 

//   // ShaderMaterial with texture uniform
//   const shaderMaterial = new THREE.ShaderMaterial({
//     vertexShader,
//     fragmentShader,
//     uniforms: {
//       uTime: { value: 0 },
//       uTexture: { value: texture }, // 
//     },
//     side: THREE.DoubleSide,
//   });

//   useFrame((state) => {
//     if (meshRef.current) {
//       shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
//     }
//   });

//   return (
//     <mesh ref={meshRef} material={shaderMaterial}>
//       <planeGeometry args={[2, 2, 100, 100]} />
//     </mesh>
//   );
// };





// const ShaderScene = () => {
//   return (
//     <Canvas camera={{ position: [2, 2, 5], fov: 75 }}>
//       {/* Lighting (optional with ShaderMaterial) */}
//       <ambientLight intensity={0.5} />
//       <directionalLight position={[5, 5, 5]} intensity={1} />

//       <Cube />
//       <OrbitControls enableDamping />
//     </Canvas>
//   );
// };

// export default ShaderScene;