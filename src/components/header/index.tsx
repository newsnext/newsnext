import { Link } from "@tanstack/react-router"

export function Header() {
  return (
    <header className="absolute top-0 inset-x-0 z-20 p-6 py-4 flex-center backdrop-blur-sm pointer-events-none">
      <Link to="/" className="flex gap-2 items-center pointer-events-auto">
        <div className="h-10 w-10 bg-cover" title="logo" style={{ backgroundImage: "url(/icon.svg)" }} />
        <span className="text-2xl font-brand leading-none font-bold">
          <p>News</p>
          <p className="mt--1">
            <span className="text-theme-400">N</span>
            <span>ext</span>
          </p>
        </span>
      </Link>
    </header>
  )
}
