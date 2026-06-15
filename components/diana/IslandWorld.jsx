"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { MAP_HALF } from "./gameData";

function Tree({ position, scale = 1 }) {
	return (
		<group position={position} scale={scale}>
			<RoundedBox position={[0, 0.6, 0]} args={[0.45, 1.2, 0.45]} radius={0.05} smoothness={3}>
				<meshStandardMaterial color="#78716c" />
			</RoundedBox>
			<RoundedBox position={[0, 1.6, 0]} args={[1.5, 1.2, 1.5]} radius={0.1} smoothness={4}>
				<meshStandardMaterial color="#22c55e" />
			</RoundedBox>
			<RoundedBox position={[0, 2.3, 0]} args={[1.2, 0.9, 1.2]} radius={0.1} smoothness={4}>
				<meshStandardMaterial color="#16a34a" />
			</RoundedBox>
		</group>
	);
}

function Flower({ position, color }) {
	return (
		<group position={position}>
			<mesh position={[0, 0.15, 0]}>
				<sphereGeometry args={[0.12, 8, 8]} />
				<meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
			</mesh>
			<mesh position={[0, 0.05, 0]}>
				<cylinderGeometry args={[0.03, 0.03, 0.15, 6]} />
				<meshStandardMaterial color="#22c55e" />
			</mesh>
		</group>
	);
}

function AnimatedWater() {
	const ref = useRef();
	useFrame((state) => {
		if (ref.current) {
			ref.current.position.y = -0.15 + Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
		}
	});
	return (
		<mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
			<circleGeometry args={[MAP_HALF + 6, 64]} />
			<meshStandardMaterial color="#38bdf8" transparent opacity={0.75} metalness={0.3} roughness={0.2} />
		</mesh>
	);
}

export default function IslandWorld({ onGroundClick }) {
	const trees = [
		[-10, -8], [11, -9], [-9, 10], [10, 9], [-12, 2], [12, -2],
		[-5, -11], [6, 11], [-11, 5], [9, -12],
	];
	const flowers = [
		[-3, 4, "#f472b6"], [4, -3, "#fbbf24"], [-6, -4, "#a78bfa"],
		[7, 5, "#34d399"], [2, 7, "#fb923c"], [-8, 1, "#60a5fa"],
		[5, -7, "#f472b6"], [-2, -8, "#fbbf24"], [8, 2, "#a78bfa"],
	];

	return (
		<group>
			{/* Острів — пісок */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
				<circleGeometry args={[MAP_HALF + 1.5, 64]} />
				<meshStandardMaterial color="#fcd34d" />
			</mesh>

			{/* Трава */}
			<mesh
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0, 0]}
				receiveShadow
				onPointerDown={(e) => {
					e.stopPropagation();
					onGroundClick?.(e.point.x, e.point.z);
				}}
			>
				<circleGeometry args={[MAP_HALF, 64]} />
				<meshStandardMaterial color="#4ade80" />
			</mesh>

			{/* Яскраві зони трави */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
				<circleGeometry args={[MAP_HALF - 3, 48]} />
				<meshStandardMaterial color="#86efac" />
			</mesh>

			<AnimatedWater />

			{/* Озеро */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
				<circleGeometry args={[3.5, 32]} />
				<meshStandardMaterial color="#0ea5e9" transparent opacity={0.85} metalness={0.4} roughness={0.1} />
			</mesh>

			{trees.map(([x, z], i) => (
				<Tree key={i} position={[x, 0, z]} scale={0.8 + (i % 3) * 0.15} />
			))}

			{flowers.map(([x, z, color], i) => (
				<Flower key={i} position={[x, 0, z]} color={color} />
			))}

			{/* Декоративні кубики Minecraft */}
			{[
				[-4, 0.25, 5, "#f472b6"],
				[5, 0.25, -4, "#60a5fa"],
				[-7, 0.25, -6, "#fbbf24"],
				[8, 0.25, 3, "#a78bfa"],
			].map(([x, y, z, color], i) => (
				<RoundedBox key={i} position={[x, y, z]} args={[0.5, 0.5, 0.5]} radius={0.06} smoothness={3}>
					<meshStandardMaterial color={color} />
				</RoundedBox>
			))}

			{/* Каміння */}
			{[
				[-6, 0.2, 3], [7, 0.15, -7], [-3, 0.18, -9],
			].map(([x, y, z], i) => (
				<RoundedBox key={`rock-${i}`} position={[x, y, z]} args={[0.6, 0.35, 0.5]} radius={0.08} smoothness={3}>
					<meshStandardMaterial color="#9ca3af" />
				</RoundedBox>
			))}
		</group>
	);
}
