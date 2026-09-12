import "./globals.css";

export const metadata = {
  title: "प्रश्न पत्र निर्माता",
  description: "Halfyearly exam paper generator",
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
