"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const RADIUS = 58;
const BASE_SIZE = 124;
const KNOB_SIZE = 54;
const DEAD_ZONE = 0.12;

function useIsTouchDevice() {
	const [touch, setTouch] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(pointer: coarse)");
		const update = () => {
			setTouch(mq.matches || navigator.maxTouchPoints > 0);
		};
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	return touch;
}

export default function MobileGamepad({ containerRef, onMove, onJump }) {
	const touch = useIsTouchDevice();
	const stickRef = useRef(null);
	const [stick, setStick] = useState(null);

	const toLocal = useCallback((clientX, clientY) => {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return { x: clientX, y: clientY };
		return { x: clientX - rect.left, y: clientY - rect.top };
	}, [containerRef]);

	const applyMove = useCallback(
		(dx, dy) => {
			const len = Math.sqrt(dx * dx + dy * dy);
			if (len < DEAD_ZONE) {
				onMove(0, 0);
				return;
			}
			const clamped = Math.min(len, 1);
			onMove((dx / len) * clamped, (dy / len) * clamped);
		},
		[onMove]
	);

	const findStickTouch = useCallback((list) => {
		if (!stickRef.current) return null;
		for (const t of list) {
			if (t.identifier === stickRef.current.id) return t;
		}
		return null;
	}, []);

	const onTouchStart = useCallback(
		(e) => {
			if (stickRef.current) return;

			const t = e.changedTouches[0];
			if (!t) return;

			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const relX = t.clientX - rect.left;
			const relY = t.clientY - rect.top;
			if (relX > rect.width * 0.55) return;
			if (relY < rect.height * 0.4) return;

			e.preventDefault();
			const local = toLocal(t.clientX, t.clientY);
			stickRef.current = { id: t.identifier, x: local.x, y: local.y };
			setStick({ x: local.x, y: local.y, knobX: 0, knobY: 0 });
			applyMove(0, 0);
		},
		[applyMove, containerRef, toLocal]
	);

	const onTouchMove = useCallback(
		(e) => {
			const t = findStickTouch(e.changedTouches);
			if (!t || !stickRef.current) return;

			e.preventDefault();
			const local = toLocal(t.clientX, t.clientY);
			let dx = local.x - stickRef.current.x;
			let dy = local.y - stickRef.current.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > RADIUS) {
				dx = (dx / dist) * RADIUS;
				dy = (dy / dist) * RADIUS;
			}

			setStick({
				x: stickRef.current.x,
				y: stickRef.current.y,
				knobX: dx,
				knobY: dy,
			});
			applyMove(dx / RADIUS, dy / RADIUS);
		},
		[applyMove, findStickTouch, toLocal]
	);

	const endStick = useCallback(
		(e) => {
			const t = findStickTouch(e.changedTouches);
			if (!t) return;

			e.preventDefault();
			stickRef.current = null;
			setStick(null);
			onMove(0, 0);
		},
		[findStickTouch, onMove]
	);

	useEffect(() => {
		if (!touch) return;

		const el = containerRef.current;
		if (!el) return;

		const opts = { passive: false };
		el.addEventListener("touchstart", onTouchStart, opts);
		el.addEventListener("touchmove", onTouchMove, opts);
		el.addEventListener("touchend", endStick, opts);
		el.addEventListener("touchcancel", endStick, opts);

		return () => {
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", endStick);
			el.removeEventListener("touchcancel", endStick);
		};
	}, [touch, containerRef, onTouchStart, onTouchMove, endStick]);

	if (!touch) return null;

	return (
		<>
			{stick && (
				<div
					className="absolute z-30 pointer-events-none"
					style={{
						left: stick.x - BASE_SIZE / 2,
						top: stick.y - BASE_SIZE / 2,
						width: BASE_SIZE,
						height: BASE_SIZE,
					}}
				>
					<div className="absolute inset-0 rounded-full bg-black/35 border-2 border-white/25 backdrop-blur-sm shadow-lg" />
					<div
						className="absolute rounded-full bg-white/90 border-2 border-white shadow-md"
						style={{
							width: KNOB_SIZE,
							height: KNOB_SIZE,
							left: BASE_SIZE / 2 - KNOB_SIZE / 2 + stick.knobX,
							top: BASE_SIZE / 2 - KNOB_SIZE / 2 + stick.knobY,
						}}
					/>
				</div>
			)}

			<button
				type="button"
				onTouchStart={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onJump();
				}}
				onMouseDown={(e) => {
					e.preventDefault();
					onJump();
				}}
				className="absolute z-30 right-4 bottom-4 w-[4.5rem] h-[4.5rem] rounded-full bg-white/95 border-[3px] border-white/80 text-violet-700 text-2xl font-black shadow-xl active:scale-90 active:bg-violet-100 transition-transform select-none touch-none"
				aria-label="Стрибок"
			>
				↑
			</button>
		</>
	);
}

export { useIsTouchDevice };
