'use client';
import { useState } from 'react';

export default function WaterOrderButton() {
	const [loading, setLoading] = useState(false);

	const handleOrder = () => {
		setLoading(true);

		const PRODUCT_ID = "124";

		// Формуємо об'єкт з усіма полями, які ми бачили в Payload
		const params = {
			'add-to-cart': PRODUCT_ID,
		};

		// Перетворюємо в Query String
		const queryString = new URLSearchParams(params).toString();

		// Фінальна лінка на чекаут з прокинутими даними
		const orderUrl = `https://dzherelna.rv.ua/checkout/?${queryString}`;

		// Невелика затримка для ефекту "обробки"
		setTimeout(() => {
			window.location.href = orderUrl;
		}, 600);
	};

	return (
		<div className="flex flex-col items-center gap-4 p-6 border border-blue-100 rounded-3xl bg-blue-50/30 shadow-sm">
			<div className="text-center">
							<p className="text-sm text-slate-500 font-medium">Острозька джерельна</p>
			</div>

			<button
				onClick={handleOrder}
				disabled={loading}
				className={`
          relative overflow-hidden group
          flex items-center gap-3 px-10 py-4 
          bg-blue-600 hover:bg-blue-700 text-white 
          rounded-2xl font-bold text-lg shadow-xl transition-all 
          active:scale-95 disabled:opacity-70 disabled:active:scale-100
        `}
			>
        <span className={`text-2xl transition-transform ${loading ? 'animate-bounce' : 'group-hover:scale-125'}`}>
          {loading ? '⌛' : '💧'}
        </span>

				<span className="tracking-tight">
          {loading ? 'Оформлення...' : 'Замовити воду'}
        </span>

				{/* Декоративний ефект завантаження на кнопці */}
				{loading && (
					<div className="absolute bottom-0 left-0 h-1 bg-blue-400 w-full animate-pulse" />
				)}
			</button>
		</div>
	);
}