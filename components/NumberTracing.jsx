"use client";
import { useRef, useState, useEffect } from "react";
import confetti from "canvas-confetti";

export default function NumberTracing() {
	const canvasRef = useRef(null);
	const [currentNumber, setCurrentNumber] = useState(1);
	const [isDrawing, setIsDrawing] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

	const templatePixelsRef = useRef([]);

	// Google Audio (successAudio) видалено

	useEffect(() => {
		setupCanvasAndTemplate();
	}, [currentNumber]);

	const setupCanvasAndTemplate = () => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });

		const size = 350;
		const scale = window.devicePixelRatio || 1;

		canvas.width = size * scale;
		canvas.height = size * scale;
		canvas.style.width = `${size}px`;
		canvas.style.height = `${size}px`;

		ctx.scale(scale, scale);

		setShowSuccess(false);
		drawTemplate(ctx, currentNumber);
		scanTemplatePixels(ctx, size * scale, size * scale);
	};

	const drawTemplate = (ctx, number) => {
		ctx.clearRect(0, 0, 350, 350);

		ctx.font = "bold 280px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		ctx.strokeStyle = "#e5e7eb";
		ctx.lineWidth = 30;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.setLineDash([15, 15]);

		ctx.strokeText(number.toString(), 175, 195);
	};

	const scanTemplatePixels = (ctx, width, height) => {
		const imageData = ctx.getImageData(0, 0, width, height);
		const pixels = imageData.data;
		const templateCoords = [];

		for (let i = 0; i < pixels.length; i += 16) {
			const r = pixels[i];
			const a = pixels[i + 3];
			if (a > 0 && r < 250) {
				templateCoords.push(i);
			}
		}
		templatePixelsRef.current = templateCoords;
	};

	const startDrawing = (e) => {
		if (showSuccess) return;
		const { x, y } = getCoordinates(e);
		const ctx = canvasRef.current.getContext("2d");

		ctx.beginPath();
		ctx.moveTo(x, y);

		ctx.strokeStyle = "#3b82f6";
		ctx.lineWidth = 40;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.setLineDash([]);

		setIsDrawing(true);
	};

	const draw = (e) => {
		if (!isDrawing || showSuccess) return;
		const { x, y } = getCoordinates(e);
		const ctx = canvasRef.current.getContext("2d");

		ctx.lineTo(x, y);
		ctx.stroke();
	};

	const stopDrawing = () => {
		if (!isDrawing) return;
		setIsDrawing(false);
		checkSuccess();
	};

	const checkSuccess = () => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		const width = canvas.width;
		const height = canvas.height;

		const imageData = ctx.getImageData(0, 0, width, height);
		const pixels = imageData.data;

		let hits = 0;
		const totalPoints = templatePixelsRef.current.length;

		if (totalPoints === 0) return;

		for (let index of templatePixelsRef.current) {
			const r = pixels[index];
			const b = pixels[index + 2];
			if (b > 200 && r < 100) {
				hits++;
			}
		}

		const accuracy = (hits / totalPoints) * 100;

		// Поріг 25% - достатньо для дитини
		if (accuracy > 50) {
			triggerWin();
		}
	};

	const triggerWin = () => {
		setShowSuccess(true);

		// Звук магії прибрали, тому запускаємо голос цифри трохи швидше (через 300мс замість 800мс)
		setTimeout(() => {
			playNumberVoice(currentNumber);
		}, 300);

		// Салют
		confetti({
			particleCount: 150,
			spread: 70,
			origin: { y: 0.6 },
			colors: ['#FFD700', '#FF0000', '#00FF00', '#0000FF']
		});

		setTimeout(() => {
			confetti({ particleCount: 100, angle: 60, spread: 55, origin: { x: 0 } });
			confetti({ particleCount: 100, angle: 120, spread: 55, origin: { x: 1 } });
		}, 400);
	};

	// 🔊 Функція програвання локального MP3 файлу
	const playNumberVoice = (num) => {
		// Файли мають лежати в public/numbers/1.mp3, public/numbers/2.mp3 і т.д.
		const audio = new Audio(`/numbers/${num}.mp3`);
		audio.play().catch(e => console.error("Не знайдено файл озвучки:", e));
	};

	const getCoordinates = (e) => {
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		let clientX, clientY;
		if (e.touches && e.touches.length > 0) {
			clientX = e.touches[0].clientX;
			clientY = e.touches[0].clientY;
		} else {
			clientX = e.clientX;
			clientY = e.clientY;
		}

		return {
			x: (clientX - rect.left) * (canvas.width / rect.width / scaleX),
			y: (clientY - rect.top) * (canvas.height / rect.height / scaleY)
		};
	};

	const clearCanvas = () => {
		setupCanvasAndTemplate();
	};

	const nextNumber = () => {
		setCurrentNumber((prev) => (prev === 9 ? 0 : prev + 1));
	};

	const prevNumber = () => {
		setCurrentNumber((prev) => (prev === 0 ? 9 : prev - 1));
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-yellow-100 p-4 select-none">
			<h1 className="text-3xl font-bold text-orange-600 mb-6 font-sans">
				🎨 Намалюй цифру!
			</h1>

			<div className="relative bg-white rounded-3xl shadow-xl border-4 border-orange-300 overflow-hidden">
				<canvas
					ref={canvasRef}
					onMouseDown={startDrawing}
					onMouseMove={draw}
					onMouseUp={stopDrawing}
					onMouseLeave={stopDrawing}
					onTouchStart={startDrawing}
					onTouchMove={draw}
					onTouchEnd={stopDrawing}
					style={{
						touchAction: "none",
						width: "350px",
						height: "350px"
					}}
					className="cursor-crosshair"
				/>

				{showSuccess && (
					<div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none animate-pulse">
						<span className="text-8xl">🌟</span>
					</div>
				)}
			</div>

			<div className="mt-8 flex gap-4 w-full max-w-[350px]">
				<button
					onClick={prevNumber}
					className="flex-1 bg-white p-4 rounded-xl text-2xl shadow-md border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 transition"
				>
					⬅️
				</button>

				<button
					onClick={clearCanvas}
					className="flex-1 bg-red-500 text-white font-bold p-4 rounded-xl shadow-md border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition"
				>
					{showSuccess ? "Ще раз" : "Стерти"}
				</button>

				<button
					onClick={nextNumber}
					className="flex-1 bg-green-500 text-white p-4 rounded-xl text-2xl shadow-md border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition"
				>
					➡️
				</button>
			</div>

			<div className="mt-4 text-gray-500 font-bold text-xl">
				Цифра: {currentNumber}
			</div>
		</div>
	);
}