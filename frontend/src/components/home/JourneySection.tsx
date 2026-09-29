import { ColourBlock, DemoBadge, EditorialSectionHead } from "../public/Editorial";
import { Reveal } from "../ui/Reveal";

const STAGES = [
  {
    code: "01",
    title: "Milking at the farm",
    text: "Milk is collected at a verified partner farm and recorded as a new milk batch.",
  },
  {
    code: "02",
    title: "Quality and temperature",
    text: "Quality checks and temperature readings are attached to the batch as it enters the cold chain.",
    badge: "Simulated IoT reading",
  },
  {
    code: "03",
    title: "AI freshness check",
    text: "The batch data is assessed for freshness, remaining shelf life and spoilage risk.",
    badge: "Demonstration prediction",
  },
  {
    code: "04",
    title: "Cold-chain delivery",
    text: "The milk stays chilled while it moves from the farm to its destination.",
  },
] as const;

/** A single, factual farm-to-doorstep story using the supplied production video. */
export function JourneySection() {
  return (
    <ColourBlock tone="sky" rounded id="journey" className="overflow-hidden">
      <section aria-label="Farm-to-doorstep journey">
        <EditorialSectionHead
          eyebrow="Farm to doorstep"
          title="See the real journey."
          lede="Watch how milk moves from milking and quality checks through the monitored cold chain to delivery."
        />

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start lg:gap-10">
          <Reveal>
            <figure className="overflow-hidden rounded-3xl border border-line bg-brand-forest shadow-lift">
              <video
                controls
                playsInline
                preload="metadata"
                poster="/media/farmer-hero.png"
                className="aspect-video w-full bg-brand-forest object-cover"
                aria-label="ApnaDairy farm-to-doorstep video"
              >
                <source src="/media/apnadairy-farm-to-doorstep.mp4" type="video/mp4" />
                Your browser does not support HTML5 video.
              </video>
              <figcaption className="bg-brand-forest px-5 py-4 text-sm leading-relaxed text-ivory/75">
                From milking at a partner farm to monitored handling and doorstep delivery.
              </figcaption>
            </figure>
          </Reveal>

          <div className="grid gap-3">
            {STAGES.map((stage, index) => (
              <Reveal key={stage.code} delay={Math.min(index * 0.06, 0.2)}>
                <article className="rounded-2xl border border-line bg-white/90 p-5 shadow-card">
                  <div className="flex items-start gap-4">
                    <span className="font-tech text-xs font-semibold tracking-[0.2em] text-brand-moss">
                      {stage.code}
                    </span>
                    <div>
                      <h3 className="display text-xl uppercase text-ink">{stage.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{stage.text}</p>
                      {"badge" in stage && stage.badge ? (
                        <div className="mt-3"><DemoBadge label={stage.badge} /></div>
                      ) : null}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </ColourBlock>
  );
}
