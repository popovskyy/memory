import "./globals.css";

export const metadata = {
  title: "Сімейна Гра",
  description: "Сімейна Гра",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
