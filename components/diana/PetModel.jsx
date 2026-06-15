"use client";

import { RoundedBox } from "@react-three/drei";

function Box({ position, size, color, radius = 0.05 }) {
	return (
		<RoundedBox position={position} args={size} radius={radius} smoothness={4}>
			<meshStandardMaterial color={color} />
		</RoundedBox>
	);
}

function CatModel({ color }) {
	return (
		<group>
			<Box position={[0, 0.45, 0]} size={[0.7, 0.55, 0.5]} color={color} />
			<Box position={[0, 0.95, 0.08]} size={[0.55, 0.5, 0.5]} color={color} />
			<Box position={[-0.2, 1.28, 0.08]} size={[0.14, 0.2, 0.12]} color={color} />
			<Box position={[0.2, 1.28, 0.08]} size={[0.14, 0.2, 0.12]} color={color} />
			<Box position={[-0.22, 0.12, 0.15]} size={[0.2, 0.28, 0.2]} color={color} />
			<Box position={[0.22, 0.12, 0.15]} size={[0.2, 0.28, 0.2]} color={color} />
			<Box position={[0, 0.48, 0.28]} size={[0.12, 0.08, 0.06]} color="#1f2937" />
			<Box position={[-0.12, 0.48, 0.28]} size={[0.06, 0.06, 0.04]} color="#1f2937" />
			<Box position={[0.12, 0.48, 0.28]} size={[0.06, 0.06, 0.04]} color="#1f2937" />
			<Box position={[0, 0.38, 0.32]} size={[0.08, 0.05, 0.04]} color="#f472b6" />
		</group>
	);
}

function DogModel({ color }) {
	return (
		<group>
			<Box position={[0, 0.48, 0]} size={[0.75, 0.6, 0.55]} color={color} />
			<Box position={[0, 1, 0.15]} size={[0.58, 0.55, 0.55]} color={color} />
			<Box position={[0, 1, 0.48]} size={[0.28, 0.25, 0.2]} color={color} />
			<Box position={[-0.28, 0.12, 0.12]} size={[0.22, 0.32, 0.22]} color={color} />
			<Box position={[0.28, 0.12, 0.12]} size={[0.22, 0.32, 0.22]} color={color} />
			<Box position={[-0.1, 0.52, 0.3]} size={[0.06, 0.06, 0.04]} color="#1f2937" />
			<Box position={[0.1, 0.52, 0.3]} size={[0.06, 0.06, 0.04]} color="#1f2937" />
		</group>
	);
}

function RabbitModel({ color }) {
	return (
		<group>
			<Box position={[0, 0.4, 0]} size={[0.6, 0.5, 0.45]} color={color} />
			<Box position={[0, 0.88, 0.04]} size={[0.48, 0.45, 0.45]} color={color} />
			<Box position={[-0.14, 1.35, 0.04]} size={[0.12, 0.45, 0.12]} color={color} />
			<Box position={[0.14, 1.35, 0.04]} size={[0.12, 0.45, 0.12]} color={color} />
			<Box position={[-0.22, 0.1, 0.12]} size={[0.18, 0.25, 0.18]} color={color} />
			<Box position={[0.22, 0.1, 0.12]} size={[0.18, 0.25, 0.18]} color={color} />
		</group>
	);
}

function FoxModel({ color }) {
	return (
		<group>
			<Box position={[0, 0.45, 0]} size={[0.65, 0.55, 0.5]} color={color} />
			<Box position={[0, 0.95, 0.12]} size={[0.52, 0.5, 0.5]} color={color} />
			<Box position={[-0.18, 1.22, 0.12]} size={[0.14, 0.16, 0.1]} color={color} />
			<Box position={[0.18, 1.22, 0.12]} size={[0.14, 0.16, 0.1]} color={color} />
			<Box position={[0, 0.92, 0.42]} size={[0.2, 0.2, 0.28]} color="#fef3c7" />
			<Box position={[-0.24, 0.1, 0.12]} size={[0.2, 0.28, 0.2]} color={color} />
			<Box position={[0.24, 0.1, 0.12]} size={[0.2, 0.28, 0.2]} color={color} />
		</group>
	);
}

function PandaModel() {
	return (
		<group>
			<Box position={[0, 0.5, 0]} size={[0.8, 0.65, 0.6]} color="#f3f4f6" />
			<Box position={[0, 1.05, 0.08]} size={[0.62, 0.58, 0.58]} color="#f3f4f6" />
			<Box position={[-0.22, 1.08, 0.32]} size={[0.16, 0.16, 0.08]} color="#1f2937" />
			<Box position={[0.22, 1.08, 0.32]} size={[0.16, 0.16, 0.08]} color="#1f2937" />
			<Box position={[-0.24, 1.28, 0.08]} size={[0.16, 0.18, 0.12]} color="#1f2937" />
			<Box position={[0.24, 1.28, 0.08]} size={[0.16, 0.18, 0.12]} color="#1f2937" />
			<Box position={[-0.3, 0.12, 0.12]} size={[0.24, 0.32, 0.24]} color="#1f2937" />
			<Box position={[0.3, 0.12, 0.12]} size={[0.24, 0.32, 0.24]} color="#1f2937" />
			<Box position={[0, 1.02, 0.38]} size={[0.18, 0.14, 0.1]} color="#1f2937" />
		</group>
	);
}

const MODELS = {
	cat: CatModel,
	dog: DogModel,
	rabbit: RabbitModel,
	fox: FoxModel,
	panda: PandaModel,
};

export default function PetModel({ animalId, color, scale = 1 }) {
	const Model = MODELS[animalId];
	if (!Model) return null;

	return (
		<group scale={scale}>
			{animalId === "panda" ? <PandaModel /> : <Model color={color} />}
		</group>
	);
}
