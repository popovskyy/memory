"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LightContext = createContext();

export function LightProvider({ children }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchData = async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/disconnections?t=${Date.now()}`, {
				cache: 'no-store'
			});
			const json = await res.json();
			if (json.data) setRows(json.data);
		} catch (err) {
			console.error("Fetch error:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []); // Тільки один раз при вході

	return (
		<LightContext.Provider value={{ rows, loading }}>
			{children}
		</LightContext.Provider>
	);
}

export const useLight = () => useContext(LightContext);