import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="topbar">
          <a className="brand" href="/"><img src="/logo.svg" alt="Station Eden" /></a>
          <nav className="nav">
            <a href="/register">Регистрация</a>
            <a href="/login">Вход</a>
            <a href="/profile">Профиль</a>
            <a href="/admin/users">Участники</a>
          </nav>
        </header>
        <main className="container">
          {children}
        </main>
        <footer className="footer">© Station Eden</footer>
      </body>
    </html>
  );
}
