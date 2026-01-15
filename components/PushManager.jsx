"use client";
import { useState, useEffect } from "react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
	if (!base64String) return new Uint8Array();
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushManager() {
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// Перевіряємо, чи ми вже підписані при завантаженні
		if ("serviceWorker" in navigator && "PushManager" in window) {
			navigator.serviceWorker.ready.then((reg) => {
				reg.pushManager.getSubscription().then((sub) => {
					if (sub) setIsSubscribed(true);
				});
			});
		}
	}, []);

	const subscribe = async () => {
		try {
			setLoading(true);

			if (!("serviceWorker" in navigator)) {
				alert("❌ Цей браузер не підтримує пуші.");
				return;
			}

			const reg = await navigator.serviceWorker.ready;

			// 1. Запит дозволу (iOS вимагає цього після кліку)
			const permission = await Notification.requestPermission();
			if (permission !== "granted") {
				alert("❌ Дозвіл не отримано. Увімкни сповіщення в налаштуваннях телефону.");
				return;
			}

			// 2. Отримуємо токен від Apple/Google
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
			});

			// 3. Зберігаємо в Redis
			const res = await fetch("/api/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(sub),
			});

			if (res.ok) {
				setIsSubscribed(true);
				alert("✅ Готово! Ти підписався на графік світла.");
			} else {
				alert("⚠️ Помилка сервера. Спробуй пізніше.");
			}
		} catch (err) {
			console.error(err);
			alert("Error: " + err.message);
		} finally {
			setLoading(false);
		}
	};

	const sendTestPush = async () => {
		await fetch("/api/push-test", { method: "POST" });
		alert("🚀 Тестовий пуш відправлено! Чекай сповіщення.");
	};

	return (
		<div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-center">
			<h3 className="font-bold text-slate-200 mb-2">Сповіщення</h3>

			<button
				onClick={subscribe}
				disabled={isSubscribed || loading}
				className={`w-full py-3 px-4 rounded-xl font-bold transition shadow-lg ${
					isSubscribed
						? "bg-emerald-600 text-white cursor-default"
						: "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95"
				}`}
			>
				{loading
					? "⏳ Налаштування..."
					: isSubscribed
						? "✅ Сповіщення активні"
						: "🔔 Увімкнути сповіщення"
				}
			</button>

			{/* Кнопка тесту (показуємо, тільки якщо вже підписані) */}
			{isSubscribed && (
				<button
					onClick={sendTestPush}
					className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline"
				>
					Надіслати тестовий пуш
				</button>
			)}

			<p className="text-xs text-slate-500 mt-2 px-2">
				*Працює тільки якщо додати сайт на Домашній екран (PWA)
			</p>
		</div>
	);
}