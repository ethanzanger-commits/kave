import './globals.css';

export const metadata = {
  title: 'Kave',
  description: 'Match professionals for coffee',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
