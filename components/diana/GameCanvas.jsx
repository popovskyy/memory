"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars, Sparkles, Cloud } from "@react-three/drei";
import IslandWorld from "./IslandWorld";
import Player from "./Player";
import FollowCamera from "./FollowCamera";
import Collectible from "./Collectible";
import WanderingPet from "./WanderingPet";

export default function GameCanvas({
	inputRef,
	targetRef,
	playerPosRef,
	collectibles,
	pets,
	befriendedIds,
	onCollect,
	onPetNear,
	onGroundClick,
	showVictory,
}) {
	return (
		<Canvas
			shadows
			camera={{ position: [0, 6.5, 9], fov: 50 }}
			style={{ background: "linear-gradient(to bottom, #7dd3fc 0%, #bae6fd 40%, #86efac 100%)" }}
		>
			<ambientLight intensity={0.55} />
			<directionalLight
				position={[8, 15, 6]}
				intensity={1.4}
				castShadow
				shadow-mapSize={[1024, 1024]}
			/>
			<directionalLight position={[-6, 8, -4]} intensity={0.35} color="#fef3c7" />

			<Stars radius={80} depth={40} count={3000} factor={3} saturation={0.2} fade speed={0.5} />
			<Cloud position={[-12, 10, -15]} speed={0.15} opacity={0.5} />
			<Cloud position={[10, 12, -18]} speed={0.1} opacity={0.4} scale={1.5} />
			<Cloud position={[0, 14, -20]} speed={0.12} opacity={0.35} scale={2} />

			<IslandWorld onGroundClick={onGroundClick} />

			<Suspense fallback={null}>
				<Player
					inputRef={inputRef}
					targetRef={targetRef}
					playerPosRef={playerPosRef}
				/>
			</Suspense>

			{collectibles
				.filter((c) => !c.collected)
				.map((c) => (
					<Collectible
						key={c.id}
						position={c.position}
						color={c.color}
						onCollect={() => onCollect(c.id)}
					/>
				))}

			{pets.map((pet) => (
				<WanderingPet
					key={pet.id}
					pet={pet}
					playerPosRef={playerPosRef}
					befriended={befriendedIds.includes(pet.id)}
					onNear={(id) => onPetNear?.(id)}
				/>
			))}

			{showVictory && (
				<Sparkles count={200} scale={20} size={6} speed={1} color="#fbbf24" />
			)}

			<FollowCamera playerPosRef={playerPosRef} />
		</Canvas>
	);
}
