'use client';

import { useEffect, useRef } from 'react';

interface TrophyProps {
  size?: number;
  autoRotate?: boolean;
}

export default function Trophy3D({ size = 200, autoRotate = true }: TrophyProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    let animId: number;

    import('three').then((THREE) => {
      if (!mounted || !mountRef.current) return;
      
      const W = size, H = size;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      const canvas = renderer.domElement;
      mountRef.current.appendChild(canvas);

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
      camera.position.set(0, 0.5, 4);

      // Lighting
      const ambient = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambient);

      const pointLight = new THREE.PointLight(0xfbbf24, 2, 10);
      pointLight.position.set(2, 3, 2);
      scene.add(pointLight);

      const rimLight = new THREE.PointLight(0x7c3aed, 1.5, 10);
      rimLight.position.set(-2, -1, -2);
      scene.add(rimLight);

      // Trophy group
      const group = new THREE.Group();
      scene.add(group);

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0xd97706,
        emissiveIntensity: 0.3,
      });

      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x92400e,
        metalness: 0.7,
        roughness: 0.3,
      });

      // Cup body (lathe geometry)
      const points: any[] = [];
      points.push(new THREE.Vector2(0.0, 0.0));
      points.push(new THREE.Vector2(0.4, 0.0));
      points.push(new THREE.Vector2(0.5, 0.2));
      points.push(new THREE.Vector2(0.55, 0.5));
      points.push(new THREE.Vector2(0.5, 0.9));
      points.push(new THREE.Vector2(0.6, 1.2));
      points.push(new THREE.Vector2(0.7, 1.5));
      points.push(new THREE.Vector2(0.6, 1.6));
      points.push(new THREE.Vector2(0.0, 1.6));

      const cupGeom = new THREE.LatheGeometry(points, 32);
      const cup     = new THREE.Mesh(cupGeom, goldMat);
      cup.position.y = 0.3;
      group.add(cup);

      // Base plate
      const baseGeom = new THREE.CylinderGeometry(0.6, 0.7, 0.2, 32);
      const base     = new THREE.Mesh(baseGeom, baseMat);
      base.position.y = 0.1;
      group.add(base);

      // Stem
      const stemGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.3, 16);
      const stem     = new THREE.Mesh(stemGeom, goldMat);
      stem.position.y = 0.35;
      group.add(stem);

      // Star on top
      const starShape = new THREE.Shape();
      const numPoints = 5;
      const outerR = 0.22, innerR = 0.10;
      for (let i = 0; i < numPoints * 2; i++) {
        const r  = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / numPoints - Math.PI / 2;
        if (i === 0) starShape.moveTo(r * Math.cos(angle), r * Math.sin(angle));
        else         starShape.lineTo(r * Math.cos(angle), r * Math.sin(angle));
      }
      starShape.closePath();
      const extrudeSettings = { depth: 0.08, bevelEnabled: false };
      const starGeom = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
      const starMat  = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 1,
        roughness: 0,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.5,
      });
      const star = new THREE.Mesh(starGeom, starMat);
      star.position.set(0, 2.0, 0);
      star.rotation.x = -Math.PI / 2;
      group.add(star);

      // Handles (left & right)
      const handleCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.6, 0.6, 0),
        new THREE.Vector3(1.1, 1.0, 0),
        new THREE.Vector3(0.65, 1.4, 0),
      );
      const handleGeom = new THREE.TubeGeometry(handleCurve, 20, 0.06, 8, false);
      const handleL = new THREE.Mesh(handleGeom, goldMat);
      const handleR = handleL.clone();
      handleR.scale.x = -1;
      group.add(handleL, handleR);

      group.position.y = -0.8;

      let t = 0;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        t += 0.01;
        if (autoRotate) group.rotation.y = t;
        group.position.y = -0.8 + Math.sin(t) * 0.08;
        star.rotation.z = t * 1.5;
        renderer.render(scene, camera);
      };
      animate();

      cleanupRef.current = () => {
        cancelAnimationFrame(animId);
        renderer.dispose();
        cupGeom.dispose();
        baseGeom.dispose();
        stemGeom.dispose();
        starGeom.dispose();
        handleGeom.dispose();
        goldMat.dispose();
        baseMat.dispose();
        starMat.dispose();
        if (mountRef.current && mountRef.current.contains(canvas)) {
          mountRef.current.removeChild(canvas);
        }
      };
    });

    return () => {
      mounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [size, autoRotate]);

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size, display: 'inline-block' }}
    />
  );
}
