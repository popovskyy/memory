self.addEventListener("install", () => {
	console.log("SW installed");
	// Змушує SW активуватися відразу, не чекаючи перезавантаження вкладки
	self.skipWaiting();
});

self.addEventListener("activate", () => {
	console.log("SW activated");
});

// 1. Отримуємо і показуємо пуш
self.addEventListener("push", (event) => {
	const data = event.data?.json() ?? {};

	event.waitUntil(
		self.registration.showNotification(data.title ?? "⚡ Світло!", {
			body: data.body ?? "Перевір розклад 💡",
			icon: "/favicons/android-icon-192x192.png", // Іконка збоку (Android/PC)
			badge: "/favicons/android-icon-192x192.png", // Маленька іконка в статус-барі (Android)
			vibrate: [200, 100, 200], // Вібрація (тільки Android)
		})
	);
});

// 2. Обробляємо КЛІК по сповіщенню (Те, чого не вистачало)
self.addEventListener("notificationclick", (event) => {
	// Закриваємо саме сповіщення
	event.notification.close();

	// Відкриваємо вікно або фокусуємось на ньому, якщо вже відкрито
	event.waitUntil(
		clients.matchAll({ type: "window" }).then((clientList) => {
			// Якщо вкладка вже відкрита - фокусуємось на ній
			for (const client of clientList) {
				if (client.url.includes("/light") && "focus" in client) {
					return client.focus();
				}
			}
			// Якщо ні - відкриваємо нову (відразу на сторінку світла)
			if (clients.openWindow) {
				return clients.openWindow("/light");
			}
		})
	);
});