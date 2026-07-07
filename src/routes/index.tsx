import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/nav";
import { listWallEntries } from "@/lib/reflection.functions";
import heroPortrait from "@/assets/hero-portrait.jpg";
import sectionReflection from "@/assets/section-reflection.jpg";
import sectionHands from "@/assets/section-hands.jpg";
import sectionWindow from "@/assets/section-window.jpg";

const SITE_URL = "https://ai.youreflections.workers.dev";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beyond What You See — An AI-Powered Self Reflection Experience" },
      {
        name: "description",
        content:
          "A quiet, cinematic reflection experience. Understand yourself — beyond appearance, comparison, and judgement.",
      },
      { property: "og:title", content: "Beyond What You See" },
      {
        property: "og:description",
        content:
          "An AI-powered reflection experience designed to help you understand yourself — not judge yourself.",
      },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="grain min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Beneath />
      <Statistics />
      <Journey />
      <HowItWorks />
      <CommunityPreview />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200),
      setTimeout(() => setPhase(2), 3600),
      setTimeout(() => setPhase(3), 6200),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      {/* Portrait fade-in with slow cinematic drift */}
      <div
        className="absolute inset-0 transition-[opacity,transform] duration-[4000ms] ease-out"
        style={{ opacity: phase >= 2 ? 1 : 0, transform: `scale(${phase >= 2 ? 1 : 1.08})` }}
      >
        <img
          src={heroPortrait}
          alt=""
          width={1600}
          height={1920}
          className="h-full w-full object-cover object-[65%_center] animate-hero-drift"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background" />
        {/* Cinematic vignette — lifts type contrast without dulling the image */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 60% 40%, transparent 40%, oklch(0.04 0.002 60 / 0.55) 100%)",
          }}
        />
      </div>


      {/* Opening lines */}
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-start px-6 md:px-10">
        {phase < 2 && (
          <div className="min-h-[60vh] flex flex-col justify-center gap-6">
            <p className="font-display animate-fade-up text-3xl italic text-foreground/90 md:text-5xl">
              The longest conversation you'll ever have…
            </p>
            <p
              className="font-display text-3xl italic text-foreground/80 transition-all duration-[1600ms] ease-out md:text-5xl"
              style={{ opacity: phase >= 1 ? 1 : 0, transform: `translateY(${phase >= 1 ? 0 : 8}px)` }}
            >
              is the one you have with yourself.
            </p>
          </div>
        )}

        {phase >= 2 && (
          <div className="flex flex-col items-start gap-8 py-24 md:py-32">
            <p
              className="animate-fade-up text-[10px] uppercase tracking-[0.5em] text-accent/80"
              style={{ animationDelay: "200ms" }}
            >
              A Reflection Experience
            </p>
            <h1
              className="font-display animate-fade-up max-w-4xl text-balance text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] text-foreground"
              style={{ animationDelay: "400ms" }}
            >
              Beyond<br />
              <span className="italic text-foreground/85">what you see.</span>
            </h1>
            <p
              className="animate-fade-up max-w-xl text-balance text-base leading-relaxed text-muted-foreground md:text-lg"
              style={{ animationDelay: "1200ms" }}
            >
              An AI-powered reflection experience designed to help you understand
              yourself — not judge yourself.
            </p>
            <div
              className="mt-6 transition-opacity duration-[1400ms]"
              style={{ opacity: phase >= 3 ? 1 : 0 }}
            >
              <Link
                to="/reflect"
                className="group inline-flex items-center gap-4 rounded-full border border-foreground/25 px-7 py-3.5 text-sm uppercase tracking-[0.25em] text-foreground/95 backdrop-blur-[2px] transition hover:border-accent hover:text-accent hover:shadow-[0_0_40px_-8px_oklch(0.78_0.08_80/0.4)]"
              >
                Begin Reflection
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>

            </div>
          </div>
        )}
      </div>

      {phase >= 3 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground opacity-60 transition-opacity duration-[2000ms]">
          scroll ↓
        </div>
      )}
    </section>
  );
}

/* ---------- Section 2: What lies beneath ---------- */

function Beneath() {
  return (
    <section className="relative overflow-hidden bg-background py-40 md:py-56">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.5em] text-accent/70">01 — Beneath</p>
            <h2 className="font-display mt-8 text-[clamp(2.5rem,5vw,4.5rem)] leading-[1] text-balance">
              What lies<br />beneath?
            </h2>
          </Reveal>
        </div>
        <div className="md:col-span-6 md:col-start-7 md:pt-8">
          <Reveal delay={0.15}>
            <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
              <p>
                Beyond What You See is a private reflection experience.
                It doesn't tell you who you are. It helps you understand how you think.
              </p>
              <p className="text-muted-foreground">
                It doesn't diagnose. It doesn't judge. It doesn't ask you to become
                anyone else. It simply reflects.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 3: Statistics ---------- */

function Statistics() {
  const stats = [
    { n: 68, suffix: "%", label: "of people say they've compared themselves to someone else this week." },
    { n: 5, suffix: "x", label: "more likely to remember a criticism than a compliment." },
    { n: 1, suffix: " in 3", label: "quietly hide a struggle no one around them ever sees." },
  ];

  return (
    <section className="relative overflow-hidden bg-surface py-40 md:py-56">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.5em] text-accent/70">02 — Society's Mirror</p>
          <h2 className="font-display mt-8 max-w-2xl text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-balance">
            We rarely see what we're really looking at.
          </h2>
        </Reveal>

        <div className="mt-24 grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-0">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div
                className={`border-t border-border pt-8 md:px-10 ${
                  i > 0 ? "md:border-l md:border-t-0 md:pt-0" : ""
                }`}
              >
                <AnimatedNumber value={s.n} suffix={s.suffix} />
                <p className="mt-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {s.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const start = performance.now();
            const duration = 1800;

            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setDisplay(Math.round(value * eased));
              if (p < 1) requestAnimationFrame(tick);
            };

            requestAnimationFrame(tick);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span
      ref={ref}
      className="font-display block text-[clamp(4rem,8vw,7rem)] leading-none text-foreground tabular-nums"
    >
      {display}
      <span className="font-light text-accent">{suffix}</span>
    </span>
  );

}

/* ---------- Section 4: Journey (horizontal-feeling storytelling) ---------- */

function Journey() {
  const steps = [
    {
      k: "You answer thoughtful questions.",
      d: "Not a form. Not a quiz. A quiet series of prompts written the way a friend might ask them.",
      img: sectionReflection,
    },
    {
      k: "The reflection listens for patterns.",
      d: "Not for what's wrong with you. For what you might not yet see about how you think, feel, and speak to yourself.",
      img: sectionWindow,
    },
    {
      k: "A letter is written for you.",
      d: "Personal. Elegant. Warm. Something you can return to, quietly, whenever you need it.",
      img: sectionHands,
    },
  ];

  return (
    <section className="relative overflow-hidden bg-background py-40 md:py-56">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.5em] text-accent/70">03 — The Journey</p>
          <h2 className="font-display mt-8 max-w-3xl text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-balance">
            A conversation with the part of you that no one else meets.
          </h2>
        </Reveal>

        <div className="mt-24 space-y-10 md:mt-32 md:space-y-16">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <ParallaxImage src={s.img} index={i} title={s.k} body={s.d} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ParallaxImage({
  src,
  index,
  title,
  body,
}: {
  src: string;
  index: number;
  title: string;
  body: string;
}) {
  return (
    <div className="relative min-h-[68vh] w-full overflow-hidden bg-surface md:min-h-[76vh]">
      <img
        src={src}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full scale-[1.04] object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-transparent to-background/55" />
      <div className="absolute inset-x-0 bottom-0 p-8 md:p-14">
        <p className="text-[10px] uppercase tracking-[0.4em] text-accent/75">
          {String(index + 1).padStart(2, "0")}
        </p>
        <h3 className="font-display mt-6 max-w-2xl text-balance text-[clamp(2rem,4vw,4rem)] leading-[1.04]">
          {title}
        </h3>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-foreground/75">{body}</p>
      </div>
    </div>
  );
}

/* ---------- Section 5: How it works ---------- */

function HowItWorks() {
  const steps = ["Reflect", "Discover", "Understand", "Grow"];

  return (
    <section className="relative overflow-hidden bg-surface py-40 md:py-56">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.5em] text-accent/70">04 — How it works</p>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-16 md:grid-cols-4 md:gap-6">
          {steps.map((s, i) => (
            <Reveal key={s} delay={i * 0.08}>
              <div className="border-t border-border pt-8">
                <p className="font-display text-sm text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-display mt-8 text-4xl md:text-5xl">{s}</h3>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 6: Living wall ---------- */

const FALLBACK_LINES = [
  "I wish I believed compliments as easily as criticism.",
  "I've spent years trying to become someone else.",
  "I forgot that I was enough.",
  "The kindest voice I've ever heard is the one I rarely use on myself.",
  "I'm learning that quiet isn't the same as empty.",
  "Some days, being gentle with myself is the whole task.",
];

function CommunityPreview() {
  const list = useServerFn(listWallEntries);
  const { data } = useQuery({
    queryKey: ["wall", "home"],
    queryFn: () => list(),
    staleTime: 60_000,
  });

  const remote = (data?.entries ?? []).map((e) => e.message).filter(Boolean);
  const lines = remote.length >= 4 ? remote.slice(0, 24) : FALLBACK_LINES;

  const mid = Math.ceil(lines.length / 2);
  const rowA = lines.slice(0, mid);
  const rowB = lines.slice(mid).length >= 2 ? lines.slice(mid) : lines.slice(0, mid);

  return (
    <section className="relative overflow-hidden bg-background py-40 md:py-56">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.5em] text-accent/70">05 — Others, quietly</p>
          <h2 className="font-display mt-8 max-w-3xl text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-balance">
            A wall of anonymous sentences,<br />
            left by strangers, for strangers.
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="group relative mt-20 h-[520px] overflow-hidden md:h-[600px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-background to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-background to-transparent" />

            <div className="grid h-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
              <MarqueeColumn lines={rowA} direction="up" />
              <div className="hidden md:block">
                <MarqueeColumn lines={rowB} direction="down" />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.25}>
          <div className="mt-20">
            <Link
              to="/wall"
              className="inline-flex items-center gap-4 border-b border-foreground/30 pb-2 text-sm uppercase tracking-[0.25em] text-muted-foreground transition hover:border-foreground hover:text-foreground"
            >
              Visit the wall
              <span>→</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MarqueeColumn({
  lines,
  direction,
}: {
  lines: string[];
  direction: "up" | "down";
}) {
  const doubled = [...lines, ...lines];

  return (
    <div className="relative h-full overflow-hidden">
      <div
        className={`flex flex-col gap-12 will-change-transform ${
          direction === "up" ? "animate-marquee-up" : "animate-marquee-down"
        } group-hover:[animation-play-state:paused]`}
      >
        {doubled.map((l, i) => (
          <blockquote
            key={`${i}-${l.slice(0, 12)}`}
            className="font-display max-w-md text-[clamp(1.2rem,1.8vw,1.75rem)] italic leading-snug text-balance text-foreground/85"
          >
            &ldquo;{l}&rdquo;
          </blockquote>
        ))}
      </div>
    </div>
  );
}

/* ---------- Final CTA ---------- */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-background py-48 md:py-64">
      <div className="mx-auto max-w-5xl px-6 text-center md:px-10">
        <Reveal>
          <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.95] text-balance">
            You are more than<br />
            <span className="italic text-foreground/85">what people see.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-10 text-base text-muted-foreground">
            No accounts. No names. Nothing shared.
          </p>
        </Reveal>
        <Reveal delay={0.35}>
          <div className="mt-16">
            <Link
              to="/reflect"
              className="group inline-flex items-center gap-4 border-b border-foreground/50 pb-2 text-sm uppercase tracking-[0.3em] text-foreground transition hover:border-accent hover:text-accent"
            >
              Begin your reflection
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-12 text-xs text-muted-foreground md:flex-row md:items-center md:px-10">
        <p className="font-display text-sm text-foreground/80">Beyond What You See</p>
        <p className="max-w-md leading-relaxed">
          A private reflection experience. Nothing you share leaves this quiet corner
          of the internet. Anonymous by design.
        </p>
      </div>
    </footer>
  );
}

/* ---------- Shared Reveal ---------- */

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-fade-up ${className ?? ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
