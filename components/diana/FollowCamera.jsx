"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FollowCamera({ playerPosRef }) {
	const target = useRef(new THREE.Vector3());
	const desired = useRef(new THREE.Vector3());

	useFrame(({ camera }) => {
		const { x, z } = playerPosRef.current;
		target.current.set(x, 1.2, z);
		desired.current.set(x, 6.5, z + 9);
		camera.position.lerp(desired.current, 0.08);
		camera.lookAt(target.current);
	});

	return null;
}
