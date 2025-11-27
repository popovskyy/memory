import "./globals.css";

export const metadata = {
  title: "Memory Game",
  description: "Kids Memory Game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
