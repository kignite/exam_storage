import './globals.css';

export const metadata = {
  title: '題庫 App',
  description: '背誦模式與答題模式'
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
