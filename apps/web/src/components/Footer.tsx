export default function Footer() {
	const year = new Date().getFullYear()
	return (
		<footer className='footer' role='contentinfo'>
			<div className='shell'>
				<div className='footerLeft'>
					<span className='footerCopy'>
						© {year} Station Eden. Все права защищены.
					</span>
				</div>
				<nav className='footerNav' aria-label='Футер ссылки'>
					<a href='#'>Правила</a>
					<a href='#'>Политика</a>
					<a href='#'>Контакты</a>
				</nav>
			</div>
		</footer>
	)
}
