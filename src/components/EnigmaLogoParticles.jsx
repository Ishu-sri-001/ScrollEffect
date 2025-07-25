'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function ParticleFillModel() {
  const { scene } = useGLTF('/model/HighPoly.glb');
  const groupRef = useRef();
  const particlesRef = useRef();
  const originalPositionsRef = useRef([]);
  const targetOffsetsRef = useRef([]);
  const scatterAmountRef = useRef(0);
  const hoveringRef = useRef(false);

  useEffect(() => {
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.01,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });

    const finalGroup = new THREE.Group();
    const allPositions = [];

    scene.traverse((child) => {
      if (!child.isMesh) return;

      const geometry = child.geometry.clone();
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      const filled = voxelFill(geometry, 0.02);
      for (let i = 0; i < filled.length; i += 3) {
        allPositions.push(filled[i], filled[i + 1], filled[i + 2]);
      }
    });

    const bufferGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(allPositions);
    originalPositionsRef.current = [...positions];

    // Generate scatter directions
    const directions = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize().multiplyScalar(0.2);
      directions[i] = dir.x;
      directions[i + 1] = dir.y;
      directions[i + 2] = dir.z;
    }

    targetOffsetsRef.current = directions;

    bufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    bufferGeometry.setAttribute('scatterDir', new THREE.BufferAttribute(directions, 3));

    const points = new THREE.Points(bufferGeometry, particleMaterial);
    particlesRef.current = bufferGeometry;

    finalGroup.add(points);
    groupRef.current.add(finalGroup);
  }, [scene]);

  // 🟡 Mouse enter/leave detection
  useEffect(() => {
    const domElement = document.querySelector('canvas');
    if (!domElement) return;

    const handleEnter = () => (hoveringRef.current = true);
    const handleLeave = () => (hoveringRef.current = false);

    domElement.addEventListener('mouseenter', handleEnter);
    domElement.addEventListener('mouseleave', handleLeave);
    return () => {
      domElement.removeEventListener('mouseenter', handleEnter);
      domElement.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  //  Animate scatter effect on hover
  useFrame(() => {
    if (!particlesRef.current) return;

    const positions = particlesRef.current.getAttribute('position');
    const scatterDirs = particlesRef.current.getAttribute('scatterDir');

    // Animate scatterAmount (0 to 1)
    if (hoveringRef.current) {
      scatterAmountRef.current = THREE.MathUtils.lerp(scatterAmountRef.current, 1, 0.05);
    } else {
      scatterAmountRef.current = THREE.MathUtils.lerp(scatterAmountRef.current, 0, 0.05);
    }

    const factor = scatterAmountRef.current;

    for (let i = 0; i < positions.count; i++) {
      const idx = i * 3;
      const ox = originalPositionsRef.current[idx];
      const oy = originalPositionsRef.current[idx + 1];
      const oz = originalPositionsRef.current[idx + 2];

      const dx = scatterDirs.array[idx];
      const dy = scatterDirs.array[idx + 1];
      const dz = scatterDirs.array[idx + 2];

      // Interpolate positions
      positions.array[idx] += (ox + dx * factor - positions.array[idx]) * 0.1;
      positions.array[idx + 1] += (oy + dy * factor - positions.array[idx + 1]) * 0.1;
      positions.array[idx + 2] += (oz + dz * factor - positions.array[idx + 2]) * 0.1;
    }

    positions.needsUpdate = true;
  });

  return <group ref={groupRef} />;
}


//  Voxel-based solid fill
function voxelFill(geometry, voxelSize = 0.02) {
  const mesh = new THREE.Mesh(geometry);
  const box = geometry.boundingBox;
  const min = box.min;
  const max = box.max;

  const positions = [];

  const stepsX = Math.floor((max.x - min.x) / voxelSize);
  const stepsY = Math.floor((max.y - min.y) / voxelSize);
  const stepsZ = Math.floor((max.z - min.z) / voxelSize);

  const position = new THREE.Vector3();
  const triangle = new THREE.Triangle();
  const triangles = [];

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 3) {
    triangle.set(
      new THREE.Vector3().fromBufferAttribute(pos, i),
      new THREE.Vector3().fromBufferAttribute(pos, i + 1),
      new THREE.Vector3().fromBufferAttribute(pos, i + 2)
    );
    triangles.push(triangle.clone());
  }

  for (let i = 0; i < stepsX; i++) {
    for (let j = 0; j < stepsY; j++) {
      for (let k = 0; k < stepsZ; k++) {
        position.set(
          min.x + i * voxelSize,
          min.y + j * voxelSize,
          min.z + k * voxelSize
        );

        for (const tri of triangles) {
          if (pointInTriangleVolume(position, tri, voxelSize)) {
            positions.push(position.x, position.y, position.z);
            break;
          }
        }
      }
    }
  }

  return new Float32Array(positions);
}

function pointInTriangleVolume(p, triangle, threshold = 0.02) {
  const closest = new THREE.Vector3();
  triangle.closestPointToPoint(p, closest);
  return p.distanceTo(closest) < threshold;
}

const ModelViewer = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black' }}>
      <Canvas camera={{ position: [2, 2, 2], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <ParticleFillModel />
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default ModelViewer;
