"use client";

import { Canvas } from "@react-three/fiber";
import { Stars, Sparkles } from "@react-three/drei";
import IslandWorld from "../diana/IslandWorld";
import Player from "../diana/Player";
import FollowCamera from "../diana/FollowCamera";
import LetterBlock from "./LetterBlock";

export default function AlphabetCanvas({
	inputRef,
	targetRef,
	playerPosRef,
	letterBlocks,
	targetChar,
	onLetterSelect,
	onGroundClick,
	showVictory,
}) {
	return (
		<Canvas
			shadows
			camera={{ position: [0, 6.5, 9], fov: 50 }}
			style={{ background: "linear-gradient(to bottom, #c084fc 0%, #e9d5ff 40%, #86efac 100%)" }}
		>
			<ambientLight intensity={0.75} />
			<directionalLight position={[8, 15, 6]} intensity={1.4} castShadow />
			<directionalLight position={[-6, 8, -4]} intensity={0.4} color="#fef3c7" />

			<Stars radius={80} depth={40} count={1500} factor={3} saturation={0.3} fade speed={0.4} />

			<IslandWorld onGroundClick={onGroundClick} />

			<Player
				inputRef={inputRef}
				targetRef={targetRef}
				playerPosRef={playerPosRef}
			/>

			{letterBlocks.map((block) => (
				<LetterBlock
					key={block.id}
					char={block.char}
					emoji={block.emoji}
					color={block.color}
					position={block.position}
					isTarget={block.char === targetChar}
					onSelect={onLetterSelect}
				/>
			))}

			{showVictory && (
				<Sparkles count={200} scale={20} size={6} speed={1} color="#fbbf24" />
			)}

			<FollowCamera playerPosRef={playerPosRef} />
		</Canvas>
	);
}
