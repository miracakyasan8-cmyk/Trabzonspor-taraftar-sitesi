import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function SectionHeading({
  index,
  kicker,
  title,
  accent,
  description,
  aside,
}: {
  index: string;
  kicker: string;
  title: string;
  accent?: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <Reveal>
      <div className="mb-8 flex flex-col gap-4 sm:mb-12">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm tracking-[0.25em] text-mavi">{index}</span>
          <span className="h-px w-12 bg-gradient-to-r from-mavi to-transparent" />
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-muted">{kicker}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl uppercase leading-[0.95] tracking-tight sm:text-6xl">
            {title} {accent ? <span className="gradient-text">{accent}</span> : null}
          </h2>
          {aside}
        </div>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{description}</p>
        ) : null}
      </div>
    </Reveal>
  );
}
