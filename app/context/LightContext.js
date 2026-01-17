"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LightContext = createContext();

export function LightProvider({ children }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchData = async () => {
		setLoading(true);
		try {
			// Додаємо t=Date.now() щоб обійти кеш браузера на iPhone
			const res = await fetch(`/api/disconnections?t=${Date.now()}`, {
				cache: 'no-store',
				headers: { 'Cache-Control': 'no-cache' }
			});

			if (!res.ok) throw new Error("Fetch failed");
			const json = await res.json();

			if (json.data) {
				// Фільтруємо лише рядки з датами DD.MM.YYYY
				const cleanRows = json.data.filter(r =>
					r[0] && r[0].match(/^\d{2}\.\d{2}\.\d{4}$/)
				);
				setRows(cleanRows);
				localStorage.setItem("light-data", JSON.stringify(cleanRows));
			}
		} catch (err) {
			console.error("Context Error:", err);
			// Спроба взяти старе з localStorage якщо мережа впала
			const local = localStorage.getItem("light-data");
			if (local) setRows(JSON.parse(local));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
		// Оновлюємо кожні 10 хвилин поки вкладка відкрита
		const interval = setInterval(fetchData, 600000);
		return () => clearInterval(interval);
	}, []);

	return (
		<LightContext.Provider value={{ rows, loading, refresh: fetchData }}>
			{children}
		</LightContext.Provider>
	);
}

export const useLight = () => useContext(LightContext);