"use client";

import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const readCssColor = (variable, fallback) => {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return value || fallback;
};

/**
 * Lazy-built three.js backdrop for the hero: a particle nebula wrapped around
 * a slowly tumbling wireframe icosahedron. Camera reacts to pointer movement
 * and scroll depth, so the whole scene reads as a volume rather than a flat
 * background. three is imported inside the effect so it never lands in the
 * SSR output or the initial route chunk.
 */
const HeroScene = ({ quality = 'high' }) => {
    const mountRef = useRef(null);
    const themeColorsRef = useRef(null);
    const { theme } = useTheme();

    // Re-read accent colors when the theme flips; the running scene picks the
    // new values up through this ref without a rebuild.
    useEffect(() => {
        themeColorsRef.current = {
            cyan: readCssColor('--accent-cyan', '#22d3ee'),
            purple: readCssColor('--accent-purple', '#a855f7'),
            dirty: true,
        };
    }, [theme]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let disposed = false;
        let cleanup = null;

        (async () => {
            const THREE = await import('three');
            if (disposed || !mountRef.current) return;

            const particleCount = quality === 'high' ? 1300 : 650;

            const renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: quality === 'high',
                powerPreference: 'low-power',
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
            renderer.setSize(mount.clientWidth, mount.clientHeight);
            renderer.domElement.style.position = 'absolute';
            renderer.domElement.style.inset = '0';
            mount.appendChild(renderer.domElement);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(58, mount.clientWidth / mount.clientHeight, 0.1, 120);
            camera.position.z = 26;

            const colors = themeColorsRef.current || {};
            const cyan = new THREE.Color(colors.cyan || '#22d3ee');
            const purple = new THREE.Color(colors.purple || '#a855f7');

            const group = new THREE.Group();
            scene.add(group);

            // Particle nebula: points scattered in a thick spherical shell with
            // per-vertex colors blending between the two accent hues.
            const positions = new Float32Array(particleCount * 3);
            const particleColors = new Float32Array(particleCount * 3);
            const blend = new THREE.Color();
            for (let i = 0; i < particleCount; i += 1) {
                const radius = 11 + Math.random() * 16;
                const angleA = Math.random() * Math.PI * 2;
                const angleB = Math.acos(2 * Math.random() - 1);
                positions[i * 3] = radius * Math.sin(angleB) * Math.cos(angleA);
                positions[i * 3 + 1] = radius * Math.sin(angleB) * Math.sin(angleA) * 0.7;
                positions[i * 3 + 2] = radius * Math.cos(angleB) * 0.8;

                blend.copy(cyan).lerp(purple, Math.random());
                particleColors[i * 3] = blend.r;
                particleColors[i * 3 + 1] = blend.g;
                particleColors[i * 3 + 2] = blend.b;
            }
            const particleGeometry = new THREE.BufferGeometry();
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
            const particleMaterial = new THREE.PointsMaterial({
                size: 0.13,
                vertexColors: true,
                transparent: true,
                opacity: 0.3,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            const particles = new THREE.Points(particleGeometry, particleMaterial);
            group.add(particles);

            // Core wireframe icosahedron plus a faint outer cage for depth.
            const coreMaterial = new THREE.MeshBasicMaterial({
                color: cyan,
                wireframe: true,
                transparent: true,
                opacity: 0.12,
            });
            const core = new THREE.Mesh(new THREE.IcosahedronGeometry(6.5, 1), coreMaterial);
            group.add(core);

            const cageMaterial = new THREE.MeshBasicMaterial({
                color: purple,
                wireframe: true,
                transparent: true,
                opacity: 0.05,
            });
            const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(10.5, 0), cageMaterial);
            group.add(cage);

            // Pointer parallax target, eased every frame.
            const pointer = { x: 0, y: 0 };
            const onPointerMove = (event) => {
                pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
                pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
            };
            window.addEventListener('pointermove', onPointerMove, { passive: true });

            const onResize = () => {
                if (!mountRef.current) return;
                const { clientWidth, clientHeight } = mountRef.current;
                camera.aspect = clientWidth / clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(clientWidth, clientHeight);
            };
            window.addEventListener('resize', onResize);

            // Pause rendering when the hero scrolls away or the tab hides.
            let inView = true;
            const observer = new IntersectionObserver((entries) => {
                inView = entries.some((entry) => entry.isIntersecting);
            });
            observer.observe(mount);

            // Cap the decorative loop well below the display refresh rate: this
            // nebula drifts slowly, so 30/48fps is visually indistinguishable
            // from 120/144Hz while cutting GPU draw calls and battery/thermal
            // cost on every device.
            const targetFps = quality === 'high' ? 48 : 30;
            const frameInterval = 1000 / targetFps;

            let rafId = 0;
            let lastRender = 0;
            const startTime = performance.now();
            const renderLoop = (now) => {
                rafId = window.requestAnimationFrame(renderLoop);
                if (!inView || document.hidden) return;
                if (now - lastRender < frameInterval) return;
                lastRender = now;

                const elapsed = (now - startTime) / 1000;
                const themeColors = themeColorsRef.current;
                if (themeColors?.dirty) {
                    coreMaterial.color.set(themeColors.cyan);
                    cageMaterial.color.set(themeColors.purple);
                    themeColors.dirty = false;
                }

                particles.rotation.y = elapsed * 0.045;
                core.rotation.x = elapsed * 0.12;
                core.rotation.y = elapsed * 0.18;
                cage.rotation.x = -elapsed * 0.05;
                cage.rotation.y = -elapsed * 0.08;

                // Scroll depth: dive the camera forward and pitch the cluster
                // as the user leaves the hero.
                const scrollFactor = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.4);
                group.rotation.x = scrollFactor * 0.55;
                group.position.y = scrollFactor * 4;
                camera.position.z = 26 - scrollFactor * 7;

                camera.position.x += (pointer.x * 2.4 - camera.position.x) * 0.04;
                camera.position.y += (-pointer.y * 1.6 - camera.position.y) * 0.04;
                camera.lookAt(scene.position);

                renderer.render(scene, camera);
            };
            rafId = window.requestAnimationFrame(renderLoop);

            cleanup = () => {
                window.cancelAnimationFrame(rafId);
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('resize', onResize);
                observer.disconnect();
                particleGeometry.dispose();
                particleMaterial.dispose();
                core.geometry.dispose();
                coreMaterial.dispose();
                cage.geometry.dispose();
                cageMaterial.dispose();
                renderer.dispose();
                if (renderer.domElement.parentNode === mount) {
                    mount.removeChild(renderer.domElement);
                }
            };
        })();

        return () => {
            disposed = true;
            if (cleanup) cleanup();
        };
    }, [quality]);

    return (
        <div
            ref={mountRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
        />
    );
};

export default HeroScene;
