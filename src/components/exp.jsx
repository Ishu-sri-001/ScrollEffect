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

void main () {
  vUv = uv;
  vec3 pos = position;
  
  vec2 topRight = vec2(0.0, 1.0);
  float distanceFromTopRight = distance(vUv, topRight);
  
  // Normalize distance (0.0 at top-right, 1.0 at bottom-left)
  float maxDistance = sqrt(2.0); // distance from (0,0) to (1,1)
  float normalizedDistance = distanceFromTopRight / maxDistance;
  
  // Create time-based delay - top-right starts first
  float animationDelay = normalizedDistance * 1.2; 
  float effectiveTime = uTime - animationDelay;
  
  float animationStrength = smoothstep(0.0, 0.3, effectiveTime) * uWaveStrength;
  
  float delay = vUv.y;
  float delay2 = vUv.x;
  
  float wave = sin(pos.x * 1.5 - delay2 * 6.0 + effectiveTime * 2.) * 0.5;
  float wave2 = -cos(pos.y * 2.5 - delay * 8.0 + effectiveTime * 2.) * 0.8;
  

  pos.y -= wave * 0.1 * animationStrength;
  pos.x += wave2 * 0.1 * animationStrength;
  
  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
`;

const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;

float roundedRect(vec2 uv, float radius) {
  vec2 centeredUV = uv * 2.0 - 1.0; // Now range [-1, 1]
  vec2 rectSize = vec2(1.0) - radius * 2.0;

  vec2 d = abs(centeredUV) - rectSize;
  float dist = length(max(d, 0.0)) - radius;

  // Keep the border sharpness scale-invariant
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
`
;

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

        gsap.from(mat.uniforms.uWaveStrength, {
          value: 5,
          duration: 2.5,
          ease: "elastic.out(1,0.3)",
          delay: -2,
        });

        gsap.to(mat.uniforms.uTime, {
          value: 3,
          duration: 2.5,
          ease: "elastic.out(1,0.3)",
          delay: 0,
        });

        gsap.timeline({
          scrollTrigger: {
            pin: true,
            trigger: triggerRef.current,
            start: 'top top',
            end: 'bottom 50%',
            scrub: true,
            markers: true,
            onUpdate: (self) => {
              const progress = -self.progress;
              mat.uniforms.uWaveStrength.value = Math.sin(progress * 3.2 ) * 3;
              
              // Keep uTime moving for continuous animation
              mat.uniforms.uTime.value = self.progress * 3 + 3;
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
    <mesh rotateZ={degToRad(180)} ref={meshRef} scale={scaleVal} position={[-2.5, 0.9, 0]}>
      <planeGeometry args={[3, 2, 300, 300]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uTexture: { value: texture },
          uWaveStrength: { value: 0 },
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
    <div className="  relative" ref={triggerRef}>
      <div className='w-full h-[100vh] relative z-[2]'>

      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 5]} />
        <Cube triggerRef={triggerRef} />
      </Canvas>
      </div>
      <div className='absolute top-[70%]  z-[0] left-[50%] translate-[-50%]'>
        <h1 className='text-[15vw]'>
          LUSION
        </h1>
      </div>
    </div>
  );
};


export default Exp;