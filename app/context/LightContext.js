"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LightContext = createContext();

// Глобальний кеш (живе поки вкладка відкрита)
let memoryData = [];
let memoryTime = 0;

export function LightProvider({ children }) {
	// Ініціалізуємось одразу з пам'яті, якщо там щось є
	const [rows, setRows] = useState(memoryData);
	const [loading, setLoading] = useState(rows.length === 0); // Якщо дані є в пам'яті — лоадінг false

	useEffect(() => {
		const initData = async () => {
			// 1. LocalStorage (якщо пам'ять пуста)
			if (rows.length === 0) {
				const local = localStorage.getItem("light-data");
				if (local) {
					try {
						const parsed = JSON.parse(local);
						setRows(parsed);
						memoryData = parsed;
						setLoading(false); // Показуємо старі дані, поки вантажимо нові
					} catch (e) {}
				}
			}

			// 2. Перевірка актуальності (5 хвилин)
			const lastTs = localStorage.getItem("light-last-ts");
			const lastTime = lastTs ? parseInt(lastTs) : 0;
			const now = Date.now();

			// Якщо кеш в пам'яті пустий АБО пройшло 5 хв з останнього запиту
			if (memoryData.length === 0 || now - Math.max(lastTime, memoryTime) > 300000) {
				console.log("📡 Context: Fetching fresh data...");

				try {
					const res = await fetch("/api/disconnections");
					if (!res.ok) throw new Error("API Error");

					const json = await res.json();

					if (json.data && json.data.length > 0) {
						// 🔥 ВАЖЛИВО: Фільтруємо сміття тут, щоб у компоненти йшли чисті дані
						// Шукаємо тільки рядки, які починаються з дати формату DD.MM.YYYY
						const cleanRows = json.data.filter(r =>
							r[0] && r[0].match(/^\d{2}\.\d{2}\.\d{4}$/)
						);

						if (cleanRows.length > 0) {
							setRows(cleanRows);

							// Оновлюємо глобальні змінні та сторедж
							memoryData = cleanRows;
							memoryTime = now;
							localStorage.setItem("light-data", JSON.stringify(cleanRows));
							localStorage.setItem("light-last-ts", now.toString());
						}
					}
				} catch (err) {
					console.error("Context fetch error:", err);
					// Тут можна додати setError(true), якщо хочеш виводити повідомлення
				}
			}

			setLoading(false);
		};

		initData();
	}, []); // [] означає "лише при маунті"

	return (
		<LightContext.Provider value={{ rows, loading }}>
			{children}
		</LightContext.Provider>
	);
}

export const useLight = () => useContext(LightContext);