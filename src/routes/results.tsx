import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Nav } from "@/components/nav";
import { getAggregates, type Aggregates, type QuestionAggregate } from "@/lib/aggregates.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Live Results — Beyond What You See" },
      {
        name: "description",
        content:
          "An anonymous class survey on self-image, body image, and beauty standards. Live results, updated as people share.",
      },
      { property: "og:title", content: "Live Results — Beyond What You See" },
      {
        property: "og:description",
        content:
          "See what everyone's sharing about self-image and beauty standards, updated live.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["aggregates"],
    queryFn: () => getAggregates(),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  // Realtime: invalidate on every INSERT into responses.
  useEffect(() => {
    const channel = supabase
      .channel("responses-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses" },
        () => queryClient.invalidateQueries({ queryKey: ["aggregates"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="grain min-h-screen bg-background text-foreground">
      <Nav />

      <header className="relative overflow-hidden px-6 pt-32 md:px-10 md:pt-40">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.78_0.08_80/0.12),_transparent_55%)]" />
        </div>
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] uppercase tracking-[0.45em] text-accent/70">
            Anonymous class survey · Live
          </p>
          <h1 className="font-display mt-6 text-balance text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1.05]">
            What everyone's sharing.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Anonymous responses from people around the world, exploring how we
            see ourselves — and how society tells us we should. Updated live as
            new reflections come in.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-20 md:px-10">
        {isLoading && !data ? (
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Loading responses…
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">Couldn't load results — please refresh.</p>
        ) : data ? (
          <Dashboard data={data} />
        ) : null}

        <div className="mt-24 text-center">
          <Link
            to="/reflect"
            className="inline-flex items-center gap-3 border-b border-foreground/40 pb-1 text-sm uppercase tracking-[0.3em] transition hover:border-accent hover:text-accent"
          >
            Add your reflection <span>→</span>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/50 px-6 py-10 text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground md:px-10">
        Anonymous · No name, email, or IP collected · Ages 13+
      </footer>
    </div>
  );
}

function Dashboard({ data }: { data: Aggregates }) {
  const ageOrder = ["13-17", "18-24", "25-34", "35-44", "45+"];
  const ageMax = Math.max(1, ...ageOrder.map((k) => data.byAgeGroup[k] ?? 0));

  return (
    <div className="space-y-24">
      {/* Live count */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Total responses
        </p>
        <p className="font-display mt-4 text-[clamp(3rem,10vw,7rem)] leading-none tabular-nums text-foreground">
          {data.total.toLocaleString()}
        </p>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/80">
          {data.conclusion}
        </p>
      </section>

      {/* Age */}
      <section>
        <p className="text-[10px] uppercase tracking-[0.4em] text-accent/70">Age breakdown</p>
        <h2 className="font-display mt-3 text-3xl md:text-4xl">Who's reflecting</h2>
        <div className="mt-8 space-y-4">
          {ageOrder.map((k) => {
            const count = data.byAgeGroup[k] ?? 0;
            const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
            const bar = data.total > 0 ? (count / ageMax) * 100 : 0;
            return (
              <div key={k}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-foreground/80">{k}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-700"
                    style={{ width: `${bar}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-question, grouped by category */}
      <QuestionGroups aggregates={data.byQuestion} />
    </div>
  );
}

function QuestionGroups({ aggregates }: { aggregates: QuestionAggregate[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, QuestionAggregate[]>();
    for (const q of aggregates) {
      const list = m.get(q.category) ?? [];
      list.push(q);
      m.set(q.category, list);
    }
    return Array.from(m.entries());
  }, [aggregates]);

  return (
    <div className="space-y-20">
      {groups.map(([category, qs]) => (
        <section key={category}>
          <p className="text-[10px] uppercase tracking-[0.4em] text-accent/70">{category}</p>
          <h2 className="font-display mt-3 text-3xl md:text-4xl">
            {category === "Society" ? "How we see the world" : "How we see ourselves"}
          </h2>
          <div className="mt-10 space-y-14">
            {qs.map((q) => (
              <QuestionRow key={q.id} q={q} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function QuestionRow({ q }: { q: QuestionAggregate }) {
  const entries = Object.entries(q.counts);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  const sorted = q.type === "choice"
    ? [...entries].sort((a, b) => b[1] - a[1])
    : entries;

  return (
    <div>
      <h3 className="font-display text-xl leading-snug text-foreground md:text-2xl">
        {q.prompt}
      </h3>
      <div className="mt-2 flex items-baseline gap-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span>{q.total} answers</span>
        {q.type === "scale" && q.mean !== undefined && q.total > 0 && (
          <span className="text-accent/80">avg {q.mean.toFixed(1)}</span>
        )}
      </div>
      <div className="mt-5 space-y-3">
        {sorted.map(([label, count]) => {
          const pct = q.total > 0 ? Math.round((count / q.total) * 100) : 0;
          const bar = q.total > 0 ? (count / max) * 100 : 0;
          return (
            <div key={label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-foreground/85">{label}</span>
                <span className="tabular-nums text-muted-foreground">{pct}%</span>
              </div>
              <div className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-foreground/70 transition-[width] duration-700"
                  style={{ width: `${bar}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
