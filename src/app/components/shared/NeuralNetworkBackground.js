"use client";
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import useDevicePerformance from '../../hooks/useDevicePerformance';

const NeuralNetworkBackground = ({ density = "medium" }) => {
    const { tier, prefersReducedMotion } = useDevicePerformance();
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Adaptive configuration based on device performance
    const config = useMemo(() => {
        const densityMap = {
            low: { nodes: 8, connections: 12, speed: 0.5 },
            medium: { nodes: 15, connections: 25, speed: 1 },
            high: { nodes: 25, connections: 40, speed: 1.5 }
        };

        const baseConfig = densityMap[density] || densityMap.medium;

        if (prefersReducedMotion || tier === 'low') {
            return {
                ...baseConfig,
                enableAnimation: false,
                enablePulse: false,
                enableGlow: false,
                opacity: 0.1,
            };
        } else if (tier === 'medium') {
            return {
                ...baseConfig,
                enableAnimation: true,
                enablePulse: false,
                enableGlow: true,
                opacity: 0.2,
            };
        } else {
            return {
                ...baseConfig,
                enableAnimation: true,
                enablePulse: true,
                enableGlow: true,
                opacity: 0.3,
            };
        }
    }, [tier, prefersReducedMotion, density]);

    // Generate neural network nodes
    const nodes = useMemo(() => {
        return [...Array(config.nodes)].map((_, i) => ({
            id: i,
            x: Math.random(),
            y: Math.random(),
            vx: (Math.random() - 0.5) * config.speed * 0.001,
            vy: (Math.random() - 0.5) * config.speed * 0.001,
            radius: Math.random() * 2 + 1,
            pulsePhase: Math.random() * Math.PI * 2,
        }));
    }, [config.nodes, config.speed]);

    // Generate connections between nearby nodes
    const connections = useMemo(() => {
        const connectionList = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const distance = Math.sqrt(
                    Math.pow(nodes[i].x - nodes[j].x, 2) + 
                    Math.pow(nodes[i].y - nodes[j].y, 2)
                );
                if (distance < 0.3) { // Connect nearby nodes
                    connectionList.push({
                        from: i,
                        to: j,
                        strength: 1 - distance / 0.3,
                    });
                }
            }
        }
        return connectionList.slice(0, config.connections);
    }, [nodes, config.connections]);

    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (!canvasRef.current || !config.enableAnimation) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        let time = 0;

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update node positions
            if (config.enableAnimation) {
                nodes.forEach(node => {
                    node.x += node.vx;
                    node.y += node.vy;

                    // Bounce off edges
                    if (node.x <= 0 || node.x >= 1) node.vx *= -1;
                    if (node.y <= 0 || node.y >= 1) node.vy *= -1;

                    // Keep nodes in bounds
                    node.x = Math.max(0, Math.min(1, node.x));
                    node.y = Math.max(0, Math.min(1, node.y));
                });
            }

            // Draw connections
            connections.forEach(connection => {
                const fromNode = nodes[connection.from];
                const toNode = nodes[connection.to];

                ctx.beginPath();
                ctx.moveTo(
                    fromNode.x * canvas.width,
                    fromNode.y * canvas.height
                );
                ctx.lineTo(
                    toNode.x * canvas.width,
                    toNode.y * canvas.height
                );

                const gradient = ctx.createLinearGradient(
                    fromNode.x * canvas.width,
                    fromNode.y * canvas.height,
                    toNode.x * canvas.width,
                    toNode.y * canvas.height
                );

                const pulse = config.enablePulse ? 
                    Math.sin(time * 0.002 + fromNode.pulsePhase) * 0.5 + 0.5 : 1;

                gradient.addColorStop(0, `rgba(0, 255, 255, ${connection.strength * config.opacity * pulse})`);
                gradient.addColorStop(0.5, `rgba(255, 0, 255, ${connection.strength * config.opacity * pulse * 0.5})`);
                gradient.addColorStop(1, `rgba(0, 255, 255, ${connection.strength * config.opacity * pulse})`);

                ctx.strokeStyle = gradient;
                ctx.lineWidth = connection.strength * 2;
                ctx.stroke();

                // Add glow effect
                if (config.enableGlow) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            });

            // Draw nodes
            nodes.forEach(node => {
                const pulse = config.enablePulse ? 
                    Math.sin(time * 0.003 + node.pulsePhase) * 0.3 + 1 : 1;

                ctx.beginPath();
                ctx.arc(
                    node.x * canvas.width,
                    node.y * canvas.height,
                    node.radius * pulse,
                    0,
                    Math.PI * 2
                );

                const gradient = ctx.createRadialGradient(
                    node.x * canvas.width,
                    node.y * canvas.height,
                    0,
                    node.x * canvas.width,
                    node.y * canvas.height,
                    node.radius * pulse * 3
                );

                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.6)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

                ctx.fillStyle = gradient;
                ctx.fill();

                // Add glow to nodes
                if (config.enableGlow) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            time += 16; // Approximate 60fps timing
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [dimensions, nodes, connections, config]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{
                opacity: config.opacity,
                mixBlendMode: 'screen',
            }}
        />
    );
};

export default NeuralNetworkBackground;
