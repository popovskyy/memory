export default function WaterOrderLink() {
	const PRODUCT_ID = "124";
	const orderUrl = `https://dzherelna.rv.ua/checkout/?add-to-cart=${PRODUCT_ID}`;

	return (
		<div className="max-w-sm mx-auto my-6">
			<a
				href={orderUrl}
				className="
          flex items-center gap-5 p-4
          bg-[#F8FAFC] active:bg-[#F1F5F9]
          rounded-[24px] transition-all
          group
        "
			>
				{/* Кругла іконка з легким градієнтом */}
				<div className="
          flex items-center justify-center
          w-14 h-14 rounded-full
          bg-gradient-to-br from-blue-500 to-blue-600
          shadow-[0_4px_12px_rgba(59,130,246,0.3)]
          group-active:scale-90 transition-transform
        ">
					<span className="text-2xl text-white">💧</span>
				</div>

				{/* Текстовий блок */}
				<div className="flex flex-col flex-grow">
          <span className="text-[17px] font-bold text-slate-900 leading-tight">
            Острозька джерельна
          </span>
					<span className="text-[14px] text-slate-500 font-medium mt-0.5">
            18.9 л • 100 ₴
          </span>
				</div>

				{/* Нативна стрілочка */}
				<div className="pr-2">
					<svg
						width="20" height="20"
						viewBox="0 0 24 24" fill="none"
						stroke="#94A3B8" strokeWidth="2.5"
						strokeLinecap="round" strokeLinejoin="round"
					>
						<path d="m9 18 6-6-6-6"/>
					</svg>
				</div>
			</a>
		</div>
	);
}