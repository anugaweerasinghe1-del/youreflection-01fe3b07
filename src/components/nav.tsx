import { Link } from "@tanstack/react-router";

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 mix-blend-difference">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <Link
          to="/"
          className="text-[10px] uppercase tracking-[0.4em] text-foreground/70 transition hover:text-foreground"
        >
          Beyond
        </Link>
        <nav className="flex items-center gap-6 text-[10px] uppercase tracking-[0.35em] text-foreground/60 md:gap-8">
          <Link to="/reflect" className="transition hover:text-foreground [&.active]:text-foreground">
            Reflect
          </Link>
          <Link to="/results" className="transition hover:text-foreground [&.active]:text-foreground">
            Results
          </Link>
          <Link to="/wall" className="transition hover:text-foreground [&.active]:text-foreground">
            Wall
          </Link>
        </nav>
      </div>
    </header>
  );
}
