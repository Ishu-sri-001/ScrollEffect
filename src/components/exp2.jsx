
'use client';
import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/dist/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger); 

const vertexShader = 
`
precision highp float;
varying vec2 vUv;
// uniform float uTime;
uniform float uWaveStrength;

void main () {
  vUv = uv;
  vec3 pos = position;
  
  float delay = vUv.y;
  float delay2= vUv.x;
  
  float delay3 = 1.0 - 0.5 * (vUv.x + vUv.y);
  
  float wave = cos(pos.x * 3.0 - delay2 * 6.0) * 0.3;
  float wave2 = -sin(pos.y * 2.5 - delay * 8.0) * 0.8;
  
  pos.y += wave * 0.1 * uWaveStrength;
  pos.x += wave2 * 0.2 * uWaveStrength;
  
  
  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}

`
;

const fragmentShader = 
`
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
        duration: 2,
        ease: "power2.out",
        delay: -2,
      });

      gsap.timeline({
        scrollTrigger: {
          pin:true,
          trigger: triggerRef.current,
          start: 'top top',
          end: 'bottom center',
          scrub: true,
          markers: true,
          onUpdate: (self) => {
            const progress = self.progress;
            mat.uniforms.uWaveStrength.value = Math.sin(progress * 3.2) * 3;
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
          // z: 1.5,
          ease: "power1.inOut",
        }, 0);
    }
  });

  return () => ctx.revert();
}, [triggerRef]);


  return (
   <mesh ref={meshRef} scale={scaleVal} position={[-2.5,0.9, 0]}>

      <planeGeometry args={[3, 2, 300, 300]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
        //   uTime: { value: 0 },
          uTexture: { value: texture },
          uWaveStrength: { value: 0 },
        }}
        side={THREE.DoubleSide}
        transparent={true}
      />
    </mesh>
  );
};


const Exp2 = () => {
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


export default Exp2;