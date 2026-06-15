"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { clampToMap } from "./gameData";

const MOVE_SPEED = 7;
const JUMP_FORCE = 6.5;
const GRAVITY = 18;

const HAIR = "#6B4423";
const SKIN = "#fde8d0";
const SHIRT = "#ec4899";
const PANTS = "#6366f1";

function DianaFace() {
	const [faceTexture, setFaceTexture] = useState(null);

	useEffect(() => {
		const loader = new THREE.TextureLoader();
		loader.load("/images/diana-face.jpg", (tex) => {
			tex.colorSpace = THREE.SRGBColorSpace;
			setFaceTexture(tex);
		});
	}, []);

	if (!faceTexture) {
		return (
			<RoundedBox position={[0, 1.1, 0.12]} args={[0.44, 0.44, 0.12]} radius={0.1} smoothness={4}>
				<meshStandardMaterial color={SKIN} />
			</RoundedBox>
		);
	}

	return (
		<>
			<mesh position={[0, 1.1, 0.21]}>
				<planeGeometry args={[0.5, 0.62]} />
				<meshStandardMaterial map={faceTexture} roughness={0.85} metalness={0.05} />
			</mesh>
			<mesh position={[0, 1.1, 0.22]}>
				<planeGeometry args={[0.54, 0.66]} />
				<meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
			</mesh>
		</>
	);
}

function DianaBody() {
	return (
		<group>
			{/* Ноги */}
			<RoundedBox position={[-0.15, 0.25, 0]} args={[0.22, 0.5, 0.22]} radius={0.04} smoothness={4}>
				<meshStandardMaterial color={PANTS} />
			</RoundedBox>
			<RoundedBox position={[0.15, 0.25, 0]} args={[0.22, 0.5, 0.22]} radius={0.04} smoothness={4}>
				<meshStandardMaterial color={PANTS} />
			</RoundedBox>

			{/* Тіло */}
			<RoundedBox position={[0, 0.7, 0]} args={[0.5, 0.45, 0.35]} radius={0.06} smoothness={4}>
				<meshStandardMaterial color={SHIRT} />
			</RoundedBox>

			{/* Задня частина голови */}
			<RoundedBox position={[0, 1.12, -0.1]} args={[0.44, 0.44, 0.28]} radius={0.08} smoothness={4}>
				<meshStandardMaterial color={SKIN} />
			</RoundedBox>

			{/* Волосся — ззаду і зверху (колір з фото) */}
			<RoundedBox position={[0, 1.38, -0.06]} args={[0.52, 0.22, 0.46]} radius={0.06} smoothness={4}>
				<meshStandardMaterial color={HAIR} />
			</RoundedBox>
			<RoundedBox position={[0, 1.1, -0.2]} args={[0.48, 0.42, 0.14]} radius={0.05} smoothness={4}>
				<meshStandardMaterial color={HAIR} />
			</RoundedBox>
			{/* Боки волосся */}
			<RoundedBox position={[-0.22, 1.12, 0]} args={[0.1, 0.38, 0.38]} radius={0.04} smoothness={4}>
				<meshStandardMaterial color={HAIR} />
			</RoundedBox>
			<RoundedBox position={[0.22, 1.12, 0]} args={[0.1, 0.38, 0.38]} radius={0.04} smoothness={4}>
				<meshStandardMaterial color={HAIR} />
			</RoundedBox>

			<DianaFace />
		</group>
	);
}

export default function Player({ inputRef, targetRef, playerPosRef, onMove }) {
	const groupRef = useRef();
	const velY = useRef(0);
	const onGround = useRef(true);
	const rotRef = useRef(0);

	useFrame((_, delta) => {
		const group = groupRef.current;
		if (!group) return;

		const input = inputRef.current;
		let dx = input.x;
		let dz = input.z;

		if (Math.abs(dx) < 0.1 && Math.abs(dz) < 0.1 && targetRef.current) {
			const tx = targetRef.current.x - playerPosRef.current.x;
			const tz = targetRef.current.z - playerPosRef.current.z;
			const dist = Math.sqrt(tx * tx + tz * tz);
			if (dist > 0.4) {
				dx = tx / dist;
				dz = tz / dist;
			} else {
				targetRef.current = null;
			}
		}

		if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
			playerPosRef.current.x += dx * MOVE_SPEED * delta;
			playerPosRef.current.z += dz * MOVE_SPEED * delta;
			rotRef.current = Math.atan2(dx, dz);
		}

		const clamped = clampToMap(playerPosRef.current.x, playerPosRef.current.z);
		playerPosRef.current.x = clamped.x;
		playerPosRef.current.z = clamped.z;

		if (input.jump && onGround.current) {
			velY.current = JUMP_FORCE;
			onGround.current = false;
			input.jump = false;
		}

		velY.current -= GRAVITY * delta;
		let y = group.position.y + velY.current * delta;
		if (y <= 0) {
			y = 0;
			velY.current = 0;
			onGround.current = true;
		}

		group.position.set(playerPosRef.current.x, y, playerPosRef.current.z);
		group.rotation.y = rotRef.current;
		onMove?.(playerPosRef.current.x, playerPosRef.current.z);
	});

	return (
		<group ref={groupRef}>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
				<circleGeometry args={[0.5, 24]} />
				<meshBasicMaterial color="#000000" transparent opacity={0.2} />
			</mesh>

			<DianaBody />
		</group>
	);
}
