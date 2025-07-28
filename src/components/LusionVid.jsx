'use client';
import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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

  // === ANIMATION CONTROL ===
  // Only apply displacement when uTime is within animation range
  float animationStart = 0.001;
  float animationEnd = 4.5; // Total animation duration
  
  // Early exit if outside animation range - keeps geometry perfect
  if (uTime < animationStart || uTime > animationEnd) {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
    return;
  }

  // === TIME PHASES ===
  float stretchDuration = 1.5;
  float stretchPhase = smoothstep(animationStart, stretchDuration, uTime);
  float wavePhaseTime = max(0.0, uTime - stretchDuration);
  
  // Fade out phase - starts at 3.5s and completes by 4.5s
  float fadeOutStart = 3.5;
  float fadeOutPhase = 1.0 - smoothstep(fadeOutStart, animationEnd, uTime);

  // === FINAL displacement accumulator ===
  vec2 totalDisplacement = vec2(0.0);

  if (stretchPhase > 0.0) {
    // === STRETCH: From Top-Right Corner (X-axis and slight -Y) ===
    vec2 stretchOrigin = vec2(1.0, 1.0);
    float distFromOrigin = distance(vUv, stretchOrigin);
    float maxDist = sqrt(2.0);
    float normDist = distFromOrigin / maxDist;

    // Stretch falloff based on distance from top-right corner
    float stretchFalloff = 1.0 - pow(normDist, 0.5);
    
    // Stretch displacement: primarily on X-axis with slight -Y
    vec2 stretchDisplacement = vec2(0.0);
    stretchDisplacement.x = stretchFalloff * 0.7 * stretchPhase * uWaveStrength;
    stretchDisplacement.y = -stretchFalloff * 0.1 * stretchPhase * uWaveStrength;

    // === ANTI-TILT COMPENSATION ===
    vec2 centerOffset = vec2(0.5, 0.5);
    vec2 uvFromCenter = vUv - centerOffset;

    float compensationX = -0.3 * stretchPhase * uWaveStrength;
    float compensationY = 0.02 * stretchPhase * uWaveStrength;

    stretchDisplacement.x += compensationX;
    stretchDisplacement.y += compensationY;

    // === WAVE: S-Shape Along Top, Bottom & Right Borders ===
    vec2 waveDisplacement = vec2(0.0);

    float horz = 1.0 - vUv.x;
    float vert = 1.0 - vUv.y;
    float waveTravelDist = horz + vert;

    float edgeTop = smoothstep(0.02, 0.0, abs(vUv.y - 1.0));
    float edgeBottom = smoothstep(0.02, 0.0, abs(vUv.y - 0.0));
    float edgeRight = smoothstep(0.02, 0.0, abs(vUv.x - 1.0));

        if (wavePhaseTime > 0.0 && stretchPhase >= 0.95) {
      // Wave starts from right and travels left (match stretch direction)
      float travelX = 1.0 - vUv.x;
      float waveArrival = travelX * 1.5;
      float waveTime = max(0.0, wavePhaseTime - waveArrival);

      // S-shape oscillation
      float sShapeX = sin(waveTime * 10.0 - travelX * 8.0);
      float sShapeY = sin(waveTime * 12.0 - travelX * 6.0);

      float waveX = sShapeX * exp(-waveTime * 1.5);
      float waveY = sShapeY * exp(-waveTime * 1.8);

      waveX *= smoothstep(0.0, 0.3, waveTime) * 2.0;
      waveY *= smoothstep(0.0, 0.3, waveTime) * 1.6;

      // Apply to edges
      waveDisplacement.y += -waveY * edgeTop * 0.2;
      waveDisplacement.x += waveX * edgeTop * 0.55;

      waveDisplacement.y += waveY * edgeBottom * 0.2;
      waveDisplacement.x += waveX * edgeBottom * 0.55;

      waveDisplacement.x += -waveX * edgeRight * 0.2;
      waveDisplacement.y += waveY * edgeRight * 0.12;
    }

    
    totalDisplacement = stretchDisplacement + waveDisplacement;
    
    // Apply fade out to smoothly return to original shape
    totalDisplacement *= fadeOutPhase;
  }
  
  pos.xy += totalDisplacement;
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
        gsap.from(mat.uniforms.uWaveStrength, {
          value: 5,
          duration: 2.5,
          ease: "elastic.out(1,0.3)",
          delay: -2,
        });

        // Initial time animation with proper reset
        gsap.timeline()
          .to(mat.uniforms.uTime, {
            value: 4.5, // Match the animationEnd in shader
            duration: 4.0,
            ease: "power2.out",
            delay: 0,
          })
          .to(mat.uniforms.uTime, {
            value: 0, // Reset to 0 for perfect geometry
            duration: 0.1,
            delay: 0.5,
          });

        // Scroll-triggered animation
        gsap.timeline({
          scrollTrigger: {
            pin: true,
            trigger: triggerRef.current,
            start: '10% top',
            end: 'bottom 50%',
            scrub: true,
            // markers: true,
            onUpdate: (self) => {
              const progress = self.progress;
              
              // Modulate wave strength based on scroll progress
              mat.uniforms.uWaveStrength.value = 1 + Math.sin(progress * 6) * 2;
              
              // Map progress to animation time range (0.001 to 4.5)
              mat.uniforms.uTime.value = 0.001 + (progress * 4.499);
            },
            onComplete: () => {
              // Ensure geometry returns to perfect state
              mat.uniforms.uTime.value = 0;
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
    <mesh rotateZ={degToRad(180)} ref={meshRef} scale={scaleVal} position={[-1.6, 0.4, 0]}>
      <planeGeometry args={[3, 2, 800, 800]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 }, // Starts at 0 for perfect geometry
          uTexture: { value: texture },
          uWaveStrength: { value: 0.5 },
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