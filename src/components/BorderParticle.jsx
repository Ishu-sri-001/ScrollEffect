'use client';
import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function ParticleFillModel() {
  const { scene } = useGLTF('/model/HighPoly.glb');
  const groupRef = useRef();

  useEffect(() => {
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.01,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });

    const finalGroup = new THREE.Group();

    scene.traverse((child) => {
      if (!child.isMesh) return;

      const geometry = child.geometry.clone();
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();

      const particles = voxelFill(geometry, 0.02); // voxel size

      const bufferGeometry = new THREE.BufferGeometry();
      bufferGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));

      const points = new THREE.Points(bufferGeometry, particleMaterial);
      finalGroup.add(points);
    });

    if (groupRef.current) {
      groupRef.current.add(finalGroup);
    }
  }, [scene]);

  return <group ref={groupRef} />;
}

// ✅ Voxel-based solid fill — no raycast, no BVH
function voxelFill(geometry, voxelSize = 0.02) {
  const mesh = new THREE.Mesh(geometry);
  const box = geometry.boundingBox;
  const min = box.min;
  const max = box.max;

  const positions = [];

  const deltaX = max.x - min.x;
  const deltaY = max.y - min.y;
  const deltaZ = max.z - min.z;

  const stepsX = Math.floor(deltaX / voxelSize);
  const stepsY = Math.floor(deltaY / voxelSize);
  const stepsZ = Math.floor(deltaZ / voxelSize);

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

        let inside = false;

        for (const tri of triangles) {
          if (pointInTriangleVolume(position, tri, voxelSize)) {
            inside = true;
            break;
          }
        }

        if (inside) {
          positions.push(position.x, position.y, position.z);
        }
      }
    }
  }

  return new Float32Array(positions);
}

// Helper to check if a voxel cube center is close enough to a triangle (within thickness)
function pointInTriangleVolume(p, triangle, threshold = 0.02) {
  const closest = new THREE.Vector3();
  triangle.closestPointToPoint(p, closest);
  const dist = p.distanceTo(closest);
  return dist < threshold;
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
