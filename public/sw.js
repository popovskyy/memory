self.addEventListener("install", () => {
	console.log("SW installed");
	self.skipWaiting();
});

self.addEventListener("activate", () => {
	console.log("SW activated");
});

self.addEventListener("push", (event) => {
	const data = event.data?.json() ?? {};

	event.waitUntil(
		self.registration.showNotification(data.title ?? "⚡ Світло!", {
			body: data.body ?? "Перевір розклад 💡",
			icon: "/favicons/android-icon-192x192.png",
			badge: "/favicons/android-icon-192x192.png",
		})
	);
});
