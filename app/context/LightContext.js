"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LightContext = createContext();

export function LightProvider({ children }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchData = async () => {
		try {
			//nocache ламає кеш Safari на iPhone
			const res = await fetch(`/api/disconnections?nocache=${Date.now()}`, {
				cache: 'no-store',
				headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
			});

			const json = await res.json();
			if (json.data) {
				setRows(json.data);
				localStorage.setItem("light-data", JSON.stringify(json.data));
			}
		} catch (err) {
			console.error("Fetch error:", err);
			const local = localStorage.getItem("light-data");
			if (local) setRows(JSON.parse(local));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, 300000); // 5 хв
		return () => clearInterval(interval);
	}, []);

	return (
		<LightContext.Provider value={{ rows, loading, refresh: fetchData }}>
			{children}
		</LightContext.Provider>
	);
}

export const useLight = () => useContext(LightContext);