'use client';
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const ParticleSystem = () => {
  const mountRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create scene
    const scene = new THREE.Scene();

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.position.z = 2;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Load texture
    const textureLoader = new THREE.TextureLoader();
    const cross = textureLoader.load('/plus.png');

    // Torus geometry (central)
    const geometry = new THREE.TorusGeometry(0.7, 0.2, 16, 100);

    // Particles geometry
    const particlesGeometry = new THREE.BufferGeometry();
    const partiCnt = 5000;
    const posnArray = new Float32Array(partiCnt * 3);

    for (let i = 0; i < partiCnt * 3; i++) {
      posnArray[i] = (Math.random() - 0.5) * 5;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posnArray, 3));

    // Materials
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.005,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
    });

    // const particlesMaterial = new THREE.PointsMaterial({
    //   size: 0.008,
    //   alphaMap: cross,
    //   transparent: true,
    //   alphaTest: 0.5,
    //   color: 'white',
    // });

    // Meshes
    const torus = new THREE.Points(geometry, material);
    // const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(torus);

    // Mouse move tracking
    const onMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / width) * 2 - 1;
      mouseRef.current.y = -(e.clientY / height) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      // Use mouse coordinates to gently rotate particles
      // particlesMesh.rotation.y = mouseRef.current.x * 0.5;
      // particlesMesh.rotation.x = mouseRef.current.y * 0.5;

      torus.rotation.y += 0.01;

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      window.removeEventListener('mousemove', onMouseMove);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh', background: 'black' }} />;
};

export default ParticleSystem;
