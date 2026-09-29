import { Clapperboard, Play } from "lucide-react";
import { Reveal } from "../ui/Reveal";

/**
 * Farm-to-table film placeholder (brief §12).
 *
 * The one-minute film ("apnadairy-farm-to-you-1min (1).mp4") is NOT embedded
 * yet — this is a stable, responsive 16:9 placeholder with a premium poster,
 * a play glyph and "APNADAIRY FILM — COMING SOON".
 *
 * ── FILM INTEGRATION POINT ─────────────────────────────────────────────
 * When the final cut is approved, connect the real video HERE:
 *   1. Put the optimised file at `public/media/apnadairy-film.mp4`
 *      (or a CDN URL) and a poster at `public/media/film-poster.jpg`.
 *   2. Replace the <div data-film-poster> below with:
 *        <video controls preload="none" playsInline poster="/media/film-poster.jpg"
 *               className="aspect-video w-full">
 *          <source src="/media/apnadairy-film.mp4" type="video/mp4" />
 *          <track kind="captions" src="/media/apnadairy-film.en.vtt"
 *                 srcLang="en" label="English" />
 *        </video>
 *   3. Replace the transcript <details> body with the shot-by-shot transcript.
 * The 16:9 frame, rounded container and caption hooks stay exactly as they are,
 * so the page layout does not shift when the real film connects.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function FarmToTableFilmPlaceholder() {
  return (
    <figure>
      <Reveal>
        <div
          data-film-poster
          className="relative aspect-video w-full overflow-hidden rounded-3xl border border-line bg-brand-forest shadow-lift"
          role="img"
          aria-label="ApnaDairy film — coming soon. Poster: a dairy farmer and an ApnaDairy team member at a partner farm."
        >
          {/* Premium poster (compliant still; replaced by the real film later) */}
          <img
            src="/media/farmer-hero.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          {/* Controlled dark emerald grade for legibility */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#05231b]/85 via-[#0B3D33]/35 to-[#0B3D33]/10"
          />
          <div aria-hidden="true" className="grain-overlay absolute inset-0" />

          {/* Play glyph + coming-soon lockup (non-interactive by design) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
            <span
              aria-hidden="true"
              className="flex h-20 w-20 items-center justify-center rounded-full border border-white/40 bg-white/10 backdrop-blur-md sm:h-24 sm:w-24"
            >
              <Play className="h-8 w-8 fill-white text-white sm:h-10 sm:w-10" />
            </span>
            <div>
              <p className="display text-2xl uppercase tracking-wide text-white sm:text-4xl">
                ApnaDairy film — coming soon
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/75">
                From our farms to your table — filmed across the network.
                The final cut connects here.
              </p>
            </div>
          </div>

          <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-ivory/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-pine backdrop-blur">
            <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" />
            The film · 01:00
          </span>
        </div>
      </Reveal>
      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Farm to table — no narration, no shortcuts</p>
        {/* Transcript hook: wire the real transcript + captions track here
            when the final film connects (see integration note above). */}
        <details className="group w-full sm:w-auto">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-brand hover:text-brand-pine">
            About this film
          </summary>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            The film follows milk from ApnaDairy partner farms — milking, batch
            coding, cold-chain transport and doorstep delivery — with no
            dialogue. A shot-by-shot transcript and captions will be published
            here with the final cut.
          </p>
        </details>
      </figcaption>
    </figure>
  );
}
