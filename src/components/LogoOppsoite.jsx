'use client';
import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;

function ParticleModel() {
  const { scene } = useGLTF('/model/ModelPerfectSquare.glb');
  const groupRef = useRef();

  const vertexShader = `
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = 1.5;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      gl_FragColor = vec4(1.0, 1.0, 1.0, 0.2);
    }
  `;

  useEffect(() => {
    const particleMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const tempVec = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    
    // Multiple ray directions for better coverage
    const rayDirections = [
      new THREE.Vector3(1, 0, 0),   // +X
      new THREE.Vector3(-1, 0, 0),  // -X
      new THREE.Vector3(0, 1, 0),   // +Y
      new THREE.Vector3(0, -1, 0),  // -Y
      new THREE.Vector3(0, 0, 1),   // +Z
      new THREE.Vector3(0, 0, -1),  // -Z
    ];

    scene.traverse((child) => {
      if (child.isMesh) {
        const mesh = child.clone();
        mesh.geometry = mesh.geometry.clone();
        mesh.updateMatrixWorld(true);

        const geometry = mesh.geometry;
        geometry.computeBoundingBox();
        geometry.boundsTree = new MeshBVH(geometry);

        const bbox = geometry.boundingBox;
        const spacing = 0.025; // Adjust for density

        const insidePoints = [];

        for (let x = bbox.min.x; x <= bbox.max.x; x += spacing) {
          for (let y = bbox.min.y; y <= bbox.max.y; y += spacing) {
            for (let z = bbox.min.z; z <= bbox.max.z; z += spacing) {
              tempVec.set(x, y, z);

              let isInside = false;
              let validTests = 0;

              // Test with multiple ray directions
              for (const direction of rayDirections) {
                raycaster.set(tempVec, direction);
                const intersects = raycaster.intersectObject(mesh, true);
                
                if (intersects.length > 0) {
                  validTests++;
                  // Point is inside if odd number of intersections
                  if (intersects.length % 2 === 1) {
                    isInside = true;
                  }
                }
              }

              // Only add point if it's consistently inside from multiple directions
              if (isInside && validTests >= 3) {
                insidePoints.push(x, y, z);
              }
            }
          }
        }

        console.log(`Generated ${insidePoints.length / 3} interior particles`);

        const bufferGeometry = new THREE.BufferGeometry();
        bufferGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(insidePoints, 3)
        );

        const points = new THREE.Points(bufferGeometry, particleMaterial);
        groupRef.current.add(points);
      }
    });
  }, [scene]);

  return <group ref={groupRef} />;
}

const ModelViewer = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black' }}>
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <ParticleModel />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

export default ModelViewer;