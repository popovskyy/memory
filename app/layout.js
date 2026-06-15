import "./globals.css";
import Script from "next/script";

export const metadata = {
	title: "Абетка Діани",
	description: "3D-гра для вивчення української абетки",
};

export default function RootLayout({ children }) {
	return (
		<html lang="uk">
		<head>
			<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-icon-180x180.png" />
			<link rel="icon" type="image/png" sizes="192x192" href="/favicons/android-icon-192x192.png" />
			<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
			<link rel="manifest" href="/manifest.json" />
			<meta name="theme-color" content="#5b21b6" />
		</head>
		<body>
			{children}
			<Script id="sw-cleanup" strategy="afterInteractive">
				{`
					if ("serviceWorker" in navigator) {
						navigator.serviceWorker.getRegistrations().then((regs) => {
							regs.forEach((r) => r.unregister());
						});
					}
				`}
			</Script>
		</body>
		</html>
	);
}
