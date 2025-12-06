"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LightPage() {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const QUEUE_INDEX = 9; // 5.1
	const [isOffNow, setIsOffNow] = useState(false);
	const [nextEventText, setNextEventText] = useState("");

	const load = async () => {
		try {
			const res = await fetch("/api/disconnections");
			const json = await res.json();

			if (!json.error) {
				const tableRows = json.data.slice(3);
				setRows(tableRows);
				calcStatus(tableRows);
			} else {
				setError(json.error);
			}
		} catch {
			setError("Помилка запиту");
		}
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, []);

	// =================== PUSH API ===================
	const urlBase64ToUint8Array = (base64String) => {
		const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding)
			.replace(/-/g, "+")
			.replace(/_/g, "/");
		const rawData = window.atob(base64);
		return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
	};

	const subscribeToPush = async () => {
		try {
			console.log("Requesting permission...");
			const permission = await Notification.requestPermission();
			console.log("Permission:", permission);

			if (permission !== "granted") {
				throw new Error("Permission was not granted");
			}

			const reg = await navigator.serviceWorker.ready;
			console.log("ServiceWorker ready ✓");

			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(
					process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
				),
			});

			console.log("Sub:", sub);

			await fetch("/api/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(sub),
			});

			alert("🔔 Сповіщення увімкнено!");
		} catch (err) {
			console.error("PUSH ERROR ➜", err);
			alert("❌ Push ERROR: " + err.message);
		}
	};


	const sendTestPush = async () => {
		await fetch("/api/push-test", { method: "POST" });
		alert("📨 Якщо додаток встановлений — сповіщення має прийти!");
	};
	// =================================================

	// 🔥 Визначення чи зараз світло + таймер
	const calcStatus = (dataRows) => {
		const now = new Date();
		const todayStr = now.toLocaleDateString("uk-UA").replace(/\./g, ".");

		const todayRow = dataRows.find((r) => r[0] === todayStr);

		if (!todayRow) {
			setIsOffNow(false);
			setNextEventText("Очікуємо актуальний графік");
			return;
		}

		const ranges = todayRow[QUEUE_INDEX];

		if (ranges.includes("Очікується")) {
			setIsOffNow(false);
			setNextEventText("Очікується оновлення графіка");
			return;
		}

		const intervals = ranges.split(",").map((v) => v.trim());
		let offNow = false;
		let nextChangeText = "📅 Дані ще уточнюються";

		for (let interval of intervals) {
			const [startStr, endStr] = interval.split("-").map((s) => s.trim());
			const [sh, sm] = startStr.split(":").map(Number);
			const [eh, em] = endStr.split(":").map(Number);

			const start = new Date(now); start.setHours(sh, sm, 0, 0);
			const end = new Date(now); end.setHours(eh, em, 0, 0);

			if (now >= start && now <= end) {
				offNow = true;
				const diff = end - now;
				nextChangeText = `🔌 Світло повернеться через ${formatDiff(diff)}`;
			} else if (now < start && !offNow) {
				const diff = start - now;
				nextChangeText = `⚡ Вимкнуть через ${formatDiff(diff)}`;
				break;
			}
		}

		setIsOffNow(offNow);
		setNextEventText(nextChangeText);
	};

	const formatDiff = (ms) => {
		const totalMins = Math.floor(ms / 1000 / 60);
		const hours = Math.floor(totalMins / 60);
		const mins = totalMins % 60;
		return `${hours > 0 ? hours + " год " : ""}${mins} хв`;
	};

	if (loading) return <p className="text-center text-gray-300 p-6">Завантаження…</p>;
	if (error) return <p className="text-center text-red-500 p-6">{error}</p>;
	if (!rows.length) return null;

	const todayDate = new Date().toLocaleDateString("uk-UA").replace(/\./g, ".");

	return (
		<main className="min-h-screen bg-gray-900 text-white p-6 flex justify-center">
			<div className="max-w-[600px] w-full space-y-6">

				<Link
					href="/"
					className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition border border-gray-600"
				>
					<span className="text-xl">⬅</span>
					<span className="font-medium">Назад</span>
				</Link>

				{/* 🔥 Індикатор */}
				<div className={`text-center text-lg font-bold p-3 rounded-lg border shadow 
					${isOffNow ? "bg-red-700 border-red-500" : "bg-green-700 border-green-500"}`}>
					{isOffNow ? "🔴 Світло ВИМКНЕНО" : "🟢 Світло Є"}
				</div>

				{/* 🔔 ПУШ кнопки */}
				<button
					onClick={subscribeToPush}
					className="w-full bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold"
				>
					🔔 Включити сповіщення
				</button>

				<button
					onClick={sendTestPush}
					className="w-full bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg font-semibold"
				>
					📢 Тест сповіщення
				</button>

				{/* ⏱️ Таймер / стан */}
				<p className="text-center text-gray-300">{nextEventText}</p>

				<h1 className="text-xl mt-6 font-bold text-center">
					💡 Відключення — Щасливе <span className="text-yellow-300">(5.1)</span>
				</h1>

				{/* 📅 Графік на кілька днів */}
				<div className="space-y-4">
					{rows.slice(1).map((row, i) => {
						const isToday = row[0] === todayDate;
						return (
							<div key={i}
							     className={`p-4 rounded-lg shadow border
							    ${isToday ? "bg-gray-700 border-yellow-400" : "bg-gray-800 border-gray-700"}`}
							>
								<p className="font-semibold text-center mb-2">
									📅 {row[0]} {isToday && "🔥 (сьогодні)"}
								</p>
								<p className="text-center bg-gray-900 py-2 rounded-md">
									{row[QUEUE_INDEX]}
								</p>
							</div>
						);
					})}
				</div>
			</div>
		</main>
	);
}
