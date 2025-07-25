'use client'
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const ParticleCircle = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const particlesRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const originalPositionsRef = useRef([]);
  const velocitiesRef = useRef([]);
  const baseAnimationRef = useRef(0);
  const animationIdRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create particles in a filled circle
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const originalPositions = [];
    const velocities = [];

    const circleRadius = 2;

    for (let i = 0; i < particleCount; i++) {
      // Generate random point within circle using polar coordinates
      const r = Math.sqrt(Math.random()) * circleRadius;
      const theta = Math.random() * Math.PI * 2;
      
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const z = (Math.random() - 0.5) * 0.5; // Small z variation

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Store original positions
      originalPositions.push(new THREE.Vector3(x, y, z));
      velocities.push(new THREE.Vector3(0, 0, 0));

      // Color particles with a gradient from center
      const distanceFromCenter = r / circleRadius;
      const hue = 0.6 - distanceFromCenter * 0.3; // Blue to purple gradient
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    originalPositionsRef.current = originalPositions;
    velocitiesRef.current = velocities;

    // Particle material
    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    // Mouse interaction
    const raycaster = new THREE.Raycaster();

    const handleMouseMove = (event) => {
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    // Event listeners
    mountRef.current.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      if (!particlesRef.current || !originalPositionsRef.current) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // Update base animation timer
      baseAnimationRef.current += 0.005;

      const positions = particlesRef.current.geometry.attributes.position.array;
      const repelStrength = 0.15;
      const returnStrength = 0.008;
      const maxDistance = 0.4;
      const damping = 0.98;

      // Convert mouse position to world coordinates
      raycaster.setFromCamera(mouseRef.current, camera);
      const intersectPoint = raycaster.ray.at(5, new THREE.Vector3());
      intersectPoint.z = 0;

      for (let i = 0; i < originalPositionsRef.current.length; i++) {
        const originalPos = originalPositionsRef.current[i];
        const velocity = velocitiesRef.current[i];
        
        const currentPos = new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        );

        // Calculate distance to mouse
        const distanceToMouse = currentPos.distanceTo(intersectPoint);

        if (distanceToMouse < maxDistance) {
          // Repel from mouse with scatter effect
          const repelDirection = currentPos.clone().sub(intersectPoint).normalize();
          const repelForce = Math.pow((maxDistance - distanceToMouse) / maxDistance, 2);
          
          // Add some randomness for scatter effect
          const randomAngle = (Math.random() - 0.5) * 0.3;
          repelDirection.applyAxisAngle(new THREE.Vector3(0, 0, 1), randomAngle);
          
          velocity.add(repelDirection.multiplyScalar(repelStrength * repelForce));
        }

        // Add gentle floating animation to original position
        const floatOffset = new THREE.Vector3(
          Math.sin(baseAnimationRef.current + i * 0.01) * 0.02,
          Math.cos(baseAnimationRef.current + i * 0.015) * 0.02,
          Math.sin(baseAnimationRef.current * 0.5 + i * 0.02) * 0.01
        );
        const targetPos = originalPos.clone().add(floatOffset);

        // Return to animated original position
        const returnDirection = targetPos.clone().sub(currentPos);
        velocity.add(returnDirection.multiplyScalar(returnStrength));

        // Apply damping
        velocity.multiplyScalar(damping);

        // Update position
        currentPos.add(velocity);

        positions[i * 3] = currentPos.x;
        positions[i * 3 + 1] = currentPos.y;
        positions[i * 3 + 2] = currentPos.z;
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousemove', handleMouseMove);
      }
      window.removeEventListener('resize', handleResize);
      
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <div 
        ref={mountRef} 
        className="w-full h-full cursor-none"
        style={{ touchAction: 'none' }}
      />
      
    </div>
  );
};

export default ParticleCircle;