"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { getAnimalById, clampToMap, dist2d } from "./gameData";
import PetModel from "./PetModel";

export default function WanderingPet({
	pet,
	playerPosRef,
	befriended,
	onNear,
}) {
	const groupRef = useRef();
	const posRef = useRef({ x: pet.position.x, z: pet.position.z });
	const wanderAngle = useRef(Math.random() * Math.PI * 2);
	const wasNear = useRef(false);
	const animal = getAnimalById(pet.animalId);

	useFrame((state, delta) => {
		if (!groupRef.current || !animal) return;
		const t = state.clock.elapsedTime;
		const player = playerPosRef.current;

		if (befriended) {
			const targetX = player.x + pet.followOffset.x;
			const targetZ = player.z + pet.followOffset.z;
			posRef.current.x += (targetX - posRef.current.x) * 4 * delta;
			posRef.current.z += (targetZ - posRef.current.z) * 4 * delta;
		} else {
			wanderAngle.current += delta * 0.5;
			posRef.current.x += Math.cos(wanderAngle.current) * 0.8 * delta;
			posRef.current.z += Math.sin(wanderAngle.current * 0.7) * 0.8 * delta;
			const clamped = clampToMap(posRef.current.x, posRef.current.z);
			posRef.current.x = clamped.x;
			posRef.current.z = clamped.z;
		}

		const dist = dist2d(posRef.current.x, posRef.current.z, player.x, player.z);
		if (!befriended) {
			const isNear = dist < 2.5;
			if (isNear) {
				onNear?.(pet.id);
			} else if (wasNear.current) {
				onNear?.(null);
			}
			wasNear.current = isNear;
		}

		groupRef.current.position.set(
			posRef.current.x,
			Math.sin(t * 3 + pet.id.length) * 0.05,
			posRef.current.z
		);
		groupRef.current.rotation.y = Math.atan2(
			player.x - posRef.current.x,
			player.z - posRef.current.z
		);
	});

	if (!animal) return null;

	return (
		<group ref={groupRef}>
			<PetModel animalId={pet.animalId} color={animal.color} scale={1.1} />

			{!befriended && (
				<mesh position={[0, 2, 0]}>
					<sphereGeometry args={[0.12, 12, 12]} />
					<meshBasicMaterial color="#fbbf24" />
				</mesh>
			)}

			{befriended && (
				<mesh position={[0, 2.2, 0]}>
					<sphereGeometry args={[0.15, 8, 8]} />
					<meshBasicMaterial color="#f472b6" />
				</mesh>
			)}
		</group>
	);
}
