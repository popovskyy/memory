import "./globals.css";
import Script from "next/script";

export const metadata = {
	title: "Сімейна Гра",
	description: "Сімейна Гра",
};

// 👇 Список картинок для передзавантаження
const puzzleImages = [
	"/images/puzzles/puzzle-01.jpg",
	"/images/puzzles/puzzle-02.jpg",
	"/images/puzzles/puzzle-03.jpg",
	"/images/puzzles/puzzle-04.jpg",
	"/images/puzzles/puzzle-05.jpg",
	"/images/puzzles/puzzle-06.jpg",
	"/images/puzzles/puzzle-07.jpg",
	"/images/puzzles/puzzle-08.jpg",
	"/images/puzzles/puzzle-09.jpg",
	"/images/puzzles/puzzle-10.jpg",
	"/images/puzzles/puzzle-11.jpg",
	"/images/puzzles/puzzle-12.jpg",
	"/images/puzzles/puzzle-13.jpg",
];


const pawsImages = [
	"/images/paws/builder.jpg",
	"/images/paws/chase.jpg",
	"/images/paws/everest.jpg",
	"/images/paws/marshal.jpg",
	"/images/paws/rocky.jpg",
	"/images/paws/sky.jpg",
	"/images/paws/taksa.jpg",
	"/images/paws/zooma.jpg",
	"/images/paws/elsa.jpg",
];

export default function RootLayout({ children }) {
	return (
		<html lang="uk">
		<head>
			<link rel="apple-touch-icon" sizes="57x57" href="/favicons/apple-icon-57x57.png" />
			<link rel="apple-touch-icon" sizes="60x60" href="/favicons/apple-icon-60x60.png" />
			<link rel="apple-touch-icon" sizes="72x72" href="/favicons/apple-icon-72x72.png" />
			<link rel="apple-touch-icon" sizes="76x76" href="/favicons/apple-icon-76x76.png" />
			<link rel="apple-touch-icon" sizes="114x114" href="/favicons/apple-icon-114x114.png" />
			<link rel="apple-touch-icon" sizes="120x120" href="/favicons/apple-icon-120x120.png" />
			<link rel="apple-touch-icon" sizes="144x144" href="/favicons/apple-icon-144x144.png" />
			<link rel="apple-touch-icon" sizes="152x152" href="/favicons/apple-icon-152x152.png" />
			<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-icon-180x180.png" />

			<link rel="icon" type="image/png" sizes="192x192" href="/favicons/android-icon-192x192.png" />
			<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
			<link rel="icon" type="image/png" sizes="96x96" href="/favicons/favicon-96x96.png" />
			<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />

			<link rel="manifest" href="/manifest.json" />

			<meta name="msapplication-TileColor" content="#ffffff" />
			<meta name="msapplication-TileImage" content="/favicons/ms-icon-144x144.png" />
			<meta name="theme-color" content="#ffffff" />

			{/* 🔥 PRELOAD ВСІХ ПАЗЛІВ 🔥 */}
			{puzzleImages.map((src) => (
				<link key={src} rel="preload" href={src} as="image" />
			))}

			{/* 🔥 PRELOAD ВСІХ ПАЗЛІВ 🔥 */}
			{pawsImages.map((src) => (
				<link key={src} rel="preload" href={src} as="image" />
			))}
		</head>
		<body>
		{children}

		{/* ⭐ Реєстрація service worker */}
		<Script id="sw-register" strategy="afterInteractive">
			{`
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.register("/sw.js")
                  .then(() => console.log("SW registered"))
                  .catch((err) => console.log("SW fail:", err));
              }
            `}
		</Script>
		</body>
		</html>
	);
}