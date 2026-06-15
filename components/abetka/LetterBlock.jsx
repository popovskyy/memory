"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";

export default function LetterBlock({ char, emoji, color, position, onSelect, isTarget }) {
	const groupRef = useRef();
	const baseY = 1.4;

	useFrame((state) => {
		if (!groupRef.current) return;
		const t = state.clock.elapsedTime;
		groupRef.current.position.y = baseY + Math.sin(t * 2 + position[0]) * 0.15;
		groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
	});

	return (
		<group
			ref={groupRef}
			position={position}
			onPointerDown={(e) => {
				e.stopPropagation();
				onSelect?.(char);
			}}
		>
			<RoundedBox position={[0, 0.3, 0]} args={[1.4, 0.5, 1.4]} radius={0.1} smoothness={4}>
				<meshStandardMaterial
					color={color}
					emissive={isTarget ? color : "#000000"}
					emissiveIntensity={isTarget ? 0.5 : 0.1}
				/>
			</RoundedBox>

			<mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<ringGeometry args={[0.9, 1.1, 32]} />
				<meshBasicMaterial color={color} transparent opacity={0.35} />
			</mesh>

			<Html center position={[0, 1.35, 0]} distanceFactor={10} style={{ pointerEvents: "none" }}>
				<div className="flex flex-col items-center select-none">
					{emoji && <span className="text-2xl leading-none mb-0.5">{emoji}</span>}
					<span
						className="text-5xl font-black text-white leading-none"
						style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)" }}
					>
						{char}
					</span>
				</div>
			</Html>
		</group>
	);
}
