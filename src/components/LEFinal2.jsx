'use client';
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const ImageGrid = () => {
  const mountRef = useRef(null);
  const canvasRef = useRef(null);
  const planesRef = useRef([]);
  const scrollRef = useRef(0);
  const prevScrollRef = useRef(0);
  const scrollSpeedRef = useRef(0);
  const animationFrameRef = useRef(null);
  const lastScrollTimeRef = useRef(0);
  const deformationFactorRef = useRef(1); // Factor to control deformation intensity
  const yWaveFactorRef = useRef(1); // Separate factor for Y-axis wave

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    // Create render target for canvas
    const renderTarget = new THREE.WebGLRenderTarget(width, height);
    
    // Canvas setup for geometries
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Load texture and create planes
    const loader = new THREE.TextureLoader();
    loader.load('/pic.jpg', (texture) => {
      const planeWidth = 7;
      const planeHeight = 4;
      const marginX = 0.5;
      const marginY = 7;

      const cols = 2;
      const rows = 6;

      for (let i = 0; i < rows * cols; i++) {
        const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 30, 20);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const plane = new THREE.Mesh(geometry, material);

        const row = Math.floor(i / cols);
        const col = i % cols;

        plane.position.x = (col - 0.5) * (planeWidth + marginX);
        plane.position.y = -row * (planeHeight + marginY);

        // Save original positions and metadata for deformation
        plane.geometry.userData.originalPositions = geometry.attributes.position.array.slice();
        plane.userData.rowIndex = row;
        plane.userData.colIndex = col;

        scene.add(plane);
        planesRef.current.push(plane);
      }
    });

    // Handle scroll with speed calculation
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const scrollDelta = currentScroll - prevScrollRef.current;
      
      // Calculate scroll speed (smoothed)
      scrollSpeedRef.current = scrollSpeedRef.current * 0.8 + Math.abs(scrollDelta) * 0.2;
      
      scrollRef.current = currentScroll;
      prevScrollRef.current = currentScroll;
      
      // Update last scroll time
      lastScrollTimeRef.current = Date.now();
    };
    window.addEventListener('scroll', handleScroll);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const scrollOffset = scrollRef.current / window.innerHeight;
      // Normalize scroll speed (adjust multiplier for sensitivity)
      const normalizedScrollSpeed = Math.min(scrollSpeedRef.current * 0.1, 3);

      // Check if scrolling has stopped (no scroll for 150ms)
      const timeSinceLastScroll = Date.now() - lastScrollTimeRef.current;
      const isScrollingStopped = timeSinceLastScroll > 10;

      // Update deformation factor (for Z-axis curves)
      if (isScrollingStopped) {
        // Smoothly reduce deformation when scrolling stops
        yWaveFactorRef.current = Math.max(0, yWaveFactorRef.current - 0.05);
      } else {
        // Restore deformation when scrolling
        deformationFactorRef.current = Math.min(1, deformationFactorRef.current + 0.1);
      }

      // Update Y-wave factor (separate control for Y-axis wave)
      if (isScrollingStopped) {
        // Smoothly reduce Y-wave when scrolling stops
        yWaveFactorRef.current = 0;
      } else {
        // Restore Y-wave when scrolling
        yWaveFactorRef.current = Math.min(1, yWaveFactorRef.current + 0.1);
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      planesRef.current.forEach((plane, index) => {
        const rowIndex = Math.floor(index / 2);
        const baseY = -(rowIndex * (2.2 + 3));
        plane.position.y = baseY + scrollOffset * 6;

        const vector = plane.position.clone().project(camera);
        const screenY = (1 - vector.y) * height / 2;

        const targetYScreen = height / 2;
        const activationZone = height / 0.7;

        const distanceFromTarget = Math.abs(screenY - targetYScreen);
        let t = 1 - Math.min(distanceFromTarget / activationZone, 1);
        
        // Apply deformation factor to t for Z-axis waves only
        const tForZDeformation = t * deformationFactorRef.current;
        // Apply separate Y-wave factor for Y-axis waves
        const tForYDeformation = t * yWaveFactorRef.current;
        
        if (t > 0) {
          plane.rotation.x = t * 0.02;
          plane.position.z = t * -0.2;
          plane.scale.setScalar(1 - t * 0.04);

          const posAttr = plane.geometry.attributes.position;
          const original = plane.geometry.userData.originalPositions;
          const h = plane.geometry.parameters.height;
          const w = plane.geometry.parameters.width;
          const colIndex = index % 2;

          for (let i = 0; i < posAttr.count; i++) {
            const ix = i * 3;
            const x = original[ix];
            const y = original[ix + 1];

            const normalizedX = (x + w / 2) / w; // 0 (left) to 1 (right)

            // Calculate global screen Y position for this vertex
            const globalVertexY = plane.position.y + y;
            const globalVertexVector = new THREE.Vector3(plane.position.x + x, globalVertexY, plane.position.z);
            globalVertexVector.project(camera);
            const vertexScreenY = (1 - globalVertexVector.y) * height / 2;
            
            // Normalize vertex screen Y position (0 = top of screen, 1 = bottom of screen)
            const screenNormalizedY = vertexScreenY / height;
            
            // Z-axis curvature - follows screen height curve
            const baseCurveIntensity = 0.15;
            const speedMultiplier = 1 + normalizedScrollSpeed * 0.5;
            const curveIntensity = baseCurveIntensity * speedMultiplier;
            
            // Create curve based on screen position (sine wave across full screen height)
            const screenZCurve = -Math.sin(screenNormalizedY * Math.PI) * curveIntensity * tForZDeformation;
            let deformZ = screenZCurve;
            
            // Y-axis wave - only on outer edges, following screen curve
            let deformY = 0;
            const yWaveIntensity = 0.3;
            
            if (colIndex === 0) {
              // Left plane - wave only on left outer edge
              const leftEdgeFactor = Math.pow(1 - normalizedX, 2);
              // Y wave follows the same screen curve pattern
              const screenYWave = Math.sin(screenNormalizedY * Math.PI * 2) * 0.5; // More frequent wave
              // Ensure minimum value is 0 by using Math.max, and apply Y-wave factor
              deformY = Math.max(0, screenYWave * leftEdgeFactor * yWaveIntensity * tForYDeformation);
            } else {
              // Right plane - wave only on right outer edge  
              const rightEdgeFactor = Math.pow(normalizedX, 2);
              // Y wave follows the same screen curve pattern
              const screenYWave = Math.sin(screenNormalizedY * Math.PI * 2) * 0.5; // More frequent wave
              // Ensure minimum value is 0 by using Math.max, and apply Y-wave factor
              deformY = Math.max(0, screenYWave * rightEdgeFactor * yWaveIntensity * tForYDeformation);
            }
            
            // No X deformation
            let deformX = 0;

            // Assign deformed positions
            posAttr.array[ix] = x; // Keep original X position
            posAttr.array[ix + 1] = y + deformY;
            posAttr.array[ix + 2] = original[ix + 2] + deformZ;
          }
          posAttr.needsUpdate = true;
        } else {
          // Reset geometry when not in activation zone
          const posAttr = plane.geometry.attributes.position;
          const original = plane.geometry.userData.originalPositions;
  
          for (let i = 0; i < posAttr.count; i++) {
            const ix = i * 3;
            posAttr.array[ix] = original[ix];
            posAttr.array[ix + 1] = original[ix + 1];
            posAttr.array[ix + 2] = original[ix + 2];
          }
          posAttr.needsUpdate = true;
          
          // Reset transformations
          plane.rotation.x = 0;
          plane.position.z = 0;
          plane.scale.setScalar(1);
        }
      });
      
      // Gradually reduce scroll speed for smooth effect
      scrollSpeedRef.current *= 0.95;
      
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('scroll', handleScroll);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      planesRef.current = [];
    };
  }, []);

  return (
    <div style={{ height: '700vh' }}>
      <div
        ref={mountRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
};

export default ImageGrid;