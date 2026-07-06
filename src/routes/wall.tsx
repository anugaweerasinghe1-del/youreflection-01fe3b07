import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWallEntries } from "@/lib/reflection.functions";
import { Nav } from "@/components/nav";

export const Route = createFileRoute("/wall")({
  head: () => ({
    meta: [
      { title: "The Wall — Beyond What You See" },
      {
        name: "description",
        content:
          "Anonymous sentences left by strangers, for strangers. Humanity, quietly.",
      },
      { property: "og:title", content: "The Wall — Beyond What You See" },
      {
        property: "og:description",
        content: "Anonymous sentences left by strangers, for strangers.",
      },
      { property: "og:url", content: "https://ai.youreflections.workers.dev/wall" },
    ],
    links: [{ rel: "canonical", href: "https://ai.youreflections.workers.dev/wall" }],
  }),
  component: WallPage,
});

function WallPage() {
  const list = useServerFn(listWallEntries);
  const { data, isLoading } = useQuery({
    queryKey: ["wall"],
    queryFn: () => list(),
  });

  const entries = data?.entries ?? [];

  return (
    <div className="grain min-h-screen bg-background text-foreground">
      <Nav />
      <section className="mx-auto max-w-5xl px-6 pt-40 md:px-10 md:pt-56">
        <p
          className="animate-fade-up text-[10px] uppercase tracking-[0.5em] text-accent/70"
        >
          The Wall
        </p>
        <h1
          className="font-display animate-fade-up mt-10 max-w-4xl text-balance text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.05]"
          style={{ animationDelay: "200ms" }}
        >
          Sentences left by strangers,<br />
          <span className="italic text-foreground/80">for strangers.</span>
        </h1>
        <p className="mt-8 max-w-xl text-base text-muted-foreground">
          No names. No profiles. No likes. Just humanity, quietly.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-32 md:px-10 md:py-40">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Listening for voices…</p>
        ) : entries.length === 0 ? (
          <p className="font-display text-2xl italic text-muted-foreground">
            The wall is quiet, for now. Be the first to speak into it.
          </p>
        ) : (
          <div className="space-y-24 md:space-y-32">
            {entries.map((e, i) => (
              <blockquote
                key={e.id}
                className="font-display animate-fade-up max-w-3xl text-balance text-[clamp(1.5rem,3vw,2.5rem)] italic leading-snug text-foreground/90"
                style={{ animationDelay: `${(i % 5) * 50}ms` }}
              >
                &ldquo;{e.message}&rdquo;
              </blockquote>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
