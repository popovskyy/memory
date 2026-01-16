"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LightContext = createContext();

// Глобальні змінні, щоб дані жили навіть якщо компонент перемонтується
let memoryData = [];
let memoryTime = 0;

export function LightProvider({ children }) {
	const [rows, setRows] = useState(memoryData);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const initData = async () => {
			// 1. Спочатку пробуємо взяти з LocalStorage (щоб показати хоч щось миттєво)
			if (rows.length === 0) {
				const local = localStorage.getItem("light-data");
				if (local) {
					try {
						const parsed = JSON.parse(local);
						setRows(parsed);
						memoryData = parsed; // Зберігаємо в глобалку
					} catch (e) {}
				}
			}

			// 2. Перевіряємо, чи треба оновлювати (раз на 5 хв)
			const lastTs = localStorage.getItem("light-last-ts");
			const lastTime = lastTs ? parseInt(lastTs) : 0;
			const now = Date.now();

			// Якщо даних немає АБО пройшло 5 хв
			if (memoryData.length === 0 || now - lastTime > 300000) {
				console.log("📡 Context: Fetching fresh data...");
				try {
					const res = await fetch("/api/disconnections");
					const json = await res.json();
					if (json.data && json.data.length > 0) {
						const newRows = json.data.slice(3);

						// Оновлюємо все
						setRows(newRows);
						memoryData = newRows;

						localStorage.setItem("light-data", JSON.stringify(newRows));
						localStorage.setItem("light-last-ts", now.toString());
					}
				} catch (err) {
					console.error("Context fetch error:", err);
				}
			}

			setLoading(false);
		};

		initData();
	}, []);

	return (
		<LightContext.Provider value={{ rows, loading }}>
			{children}
		</LightContext.Provider>
	);
}

export const useLight = () => useContext(LightContext);