import { Link } from "@tanstack/react-router"

export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="site-footer">
      <span>
        newsnext is the next version of
        {" "}
        <a href="https://github.com/ourongxing/newsnow" target="_blank" rel="noreferrer">ourongxing/newsnow</a>
      </span>
      <nav aria-label="Footer navigation">
        <Link to="/privacy">Privacy</Link>
        <Link to="/support">Support</Link>
      </nav>
    </footer>
  )
}
