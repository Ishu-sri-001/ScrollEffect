'use client';
import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/dist/ScrollTrigger';
import { degToRad } from 'three/src/math/MathUtils.js';
gsap.registerPlugin(ScrollTrigger);

const vertexShader = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uWaveStrength;

void main() {
  vUv = uv;
  vec3 pos = position;

  // === TIME PHASES ===
  float stretchDuration = 1.5;
  float stretchPhase = smoothstep(0.0, stretchDuration, uTime);
  stretchPhase = min(stretchPhase, 1.0);

  float wavePhaseTime = max(0.0, uTime - stretchDuration);

  // === STRETCH: From Top-Right Corner (X-axis and slight -Y) ===
  vec2 stretchOrigin = vec2(1.0, 1.0);
  float distFromOrigin = distance(vUv, stretchOrigin);
  float maxDist = sqrt(2.0);
  float normDist = distFromOrigin / maxDist;

  // Stretch falloff based on distance from top-right corner
  float stretchFalloff = 1.0 - pow(normDist, 0.5);
  
  // Stretch displacement: primarily on X-axis with slight -Y
  vec2 stretchDisplacement = vec2(0.0);
  stretchDisplacement.x = stretchFalloff * 0.6 * stretchPhase * uWaveStrength; // X-axis stretch
  stretchDisplacement.y = -stretchFalloff * 0.1 * stretchPhase * uWaveStrength; // Slight -Y stretch
  
  // === ANTI-TILT COMPENSATION ===
  // Calculate the center of mass shift and compensate to prevent tilting
  vec2 centerOffset = vec2(0.5, 0.5); // UV center
  vec2 uvFromCenter = vUv - centerOffset;
  
  // Compensation factors based on the stretch amounts
  float compensationX = -0.12 * stretchPhase * uWaveStrength; // Counteract X-axis shift
  float compensationY = 0.02 * stretchPhase * uWaveStrength;  // Counteract Y-axis shift
  
  // Apply compensation uniformly to maintain shape
  stretchDisplacement.x += compensationX;
  stretchDisplacement.y += compensationY;

  // === WAVE: S-Shape Along Top, Bottom & Right Borders (Both X and Y axes) ===
  vec2 waveDisplacement = vec2(0.0);

  // Compute L-path distance from top-right corner
  float horz = 1.0 - vUv.x;
  float vert = 1.0 - vUv.y;
  float waveTravelDist = horz + vert;

  // Edge masks with sharper falloff for border-only effect
  float edgeTop = smoothstep(0.02, 0.0, abs(vUv.y - 1.0));    // top edge
  float edgeBottom = smoothstep(0.02, 0.0, abs(vUv.y - 0.0)); // bottom edge
  float edgeRight = smoothstep(0.02, 0.0, abs(vUv.x - 1.0));  // right edge

  if (wavePhaseTime > 0.0 && stretchPhase >= 0.95) {
    float waveArrival = waveTravelDist * 1.2;
    float waveTime = max(0.0, wavePhaseTime - waveArrival);

    // S-shaped wave pattern for both axes
    float sShapeY = sin(waveTime * 12.0 - waveTravelDist * 8.0); // Y-axis wave
    float sShapeX = sin(waveTime * 10.0 - waveTravelDist * 6.0); // X-axis wave
    
    float waveY = sShapeY * exp(-waveTime * 1.8);
    float waveX = sShapeX * exp(-waveTime * 1.5);
    
    // Apply smooth wave onset and boost amplitude
    waveY *= smoothstep(0.0, 0.3, waveTime) * 1.8;
    waveX *= smoothstep(0.0, 0.3, waveTime) * 1.2;

    // Apply displacement on borders with S-shapes on both axes
    // Top edge: Y displacement (up/down) + X displacement (left/right)
    waveDisplacement.y += -waveY * edgeTop * 0.18;
    waveDisplacement.x += waveX * edgeTop * 0.12;
    
    // Bottom edge: Y displacement (up/down) + X displacement (left/right)  
    waveDisplacement.y += waveY * edgeBottom * 0.18;
    waveDisplacement.x += waveX * edgeBottom * 0.12;
    
    // Right edge: X displacement (left/right) + Y displacement (up/down)
    waveDisplacement.x += -waveX * edgeRight * 0.15;
    waveDisplacement.y += waveY * edgeRight * 0.10;
  }

  // === FINAL COMBINED DEFORMATION ===
  vec2 totalDisplacement = stretchDisplacement + waveDisplacement;
  pos.x += totalDisplacement.x;
  pos.y += totalDisplacement.y;

  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;

float roundedRect(vec2 uv, float radius) {
  vec2 centeredUV = uv * 2.0 - 1.0;
  vec2 rectSize = vec2(1.0) - radius * 2.0;
  vec2 d = abs(centeredUV) - rectSize;
  float dist = length(max(d, 0.0)) - radius;
  float smoothing = fwidth(dist) * 1.5;
  return 1.0 - smoothstep(0.0, smoothing, dist);
}

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  float mask = roundedRect(vUv, 0.15);
  tex.a *= mask;
  if (tex.a < 0.01) discard;
  gl_FragColor = tex;
}
`;

const Cube = ({ triggerRef }) => {
  const [scaleVal, setScaleVal] = useState(1);
  const meshRef = useRef();
  const videoRef = useRef(document.createElement('video'));

  useEffect(() => {
    const video = videoRef.current;
    video.src = '/front-page.mp4'; 
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.play();
  }, []);

  const texture = new THREE.VideoTexture(videoRef.current);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.format = THREE.RGBFormat;

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (meshRef.current && triggerRef.current) {
        const mat = meshRef.current.material;

        // Initial animation on load
        // gsap.from(mat.uniforms.uWaveStrength, {
        //   value: 5,
        //   duration: 2.5,
        //   ease: "elastic.out(1,0.3)",
        //   delay: -2,
        // });

        gsap.to(mat.uniforms.uTime, {
          value: 5, // Increased to allow for longer stretch + wave sequence
          duration: 4.0,
          ease: "power2.out",
          delay: 0,
        });

        // Scroll-triggered animation
        gsap.timeline({
          scrollTrigger: {
            pin: true,
            trigger: triggerRef.current,
            start: '10% top',
            end: 'bottom 50%',
            scrub: true,
            markers: true,
            onUpdate: (self) => {
              const progress = self.progress;
              
              // Modulate wave strength based on scroll progress
              mat.uniforms.uWaveStrength.value = 1 + Math.sin(progress * 6) * 2;
              
              // Continuous time progression for ongoing animation
              mat.uniforms.uTime.value = progress * 5 + 4;
            }
          }
        })
          .to(meshRef.current.position, {
            x: 0.1,
            y: -0.5,
            ease: "power1.inOut",
          }, 0)
          .to(meshRef.current.scale, {
            x: 2,
            y: 1.5,
            ease: "power1.inOut",
          }, 0);
      }
    });

    return () => ctx.revert();
  }, [triggerRef]);

  return (
    <mesh rotateZ={degToRad(180)} ref={meshRef} scale={scaleVal} position={[-1.9, 0.4, 0]}>
      <planeGeometry args={[3, 2, 600, 600]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
  uTime: { value: 0 },
  uTexture: { value: texture },
  uWaveStrength: { value: 0.6 },
}}

        side={THREE.DoubleSide}
        transparent={true}
      />
    </mesh>
  );
};

const Exp = () => {
  const triggerRef = useRef();

  return (
    <div className="relative" ref={triggerRef}>
      <div className='w-full h-[120vh] relative z-[2]'>
        <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 3, 5]} />
          <Cube triggerRef={triggerRef} />
        </Canvas>
      </div>
      <div className='absolute top-[70%] z-[0] left-[50%] translate-x-[-50%]'>
        <h1 className='text-[15vw]'>
          LUSION
        </h1>
      </div>
    </div>
  );
};

export default Exp;