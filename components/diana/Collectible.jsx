"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function Collectible({ position, color, onCollect }) {
	const ref = useRef();
	const collected = useRef(false);

	useFrame((state) => {
		if (!ref.current || collected.current) return;
		const t = state.clock.elapsedTime;
		ref.current.rotation.y = t * 2;
		ref.current.position.y = 1.2 + Math.sin(t * 3 + position.x) * 0.25;
	});

	return (
		<group position={[position.x, 0, position.z]}>
			<mesh
				ref={ref}
				onPointerDown={(e) => {
					e.stopPropagation();
					if (!collected.current) {
						collected.current = true;
						onCollect?.();
					}
				}}
			>
				<octahedronGeometry args={[0.35, 0]} />
				<meshStandardMaterial
					color={color}
					emissive={color}
					emissiveIntensity={0.6}
					metalness={0.5}
					roughness={0.2}
				/>
			</mesh>
			<mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<ringGeometry args={[0.5, 0.65, 32]} />
				<meshBasicMaterial color={color} transparent opacity={0.3} />
			</mesh>
		</group>
	);
}
