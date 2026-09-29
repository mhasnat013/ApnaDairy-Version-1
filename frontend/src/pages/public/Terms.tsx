import {
  EditorialHero,
  ColourBlock,
  EditorialSectionHead,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";

const SECTIONS = [
  {
    title: "The service",
    text: "ApnaDairy provides farm verification, milk-batch records, IoT cold-chain monitoring, AI freshness estimates and delivery workflow tools.",
  },
  {
    title: "Accounts",
    text: "You must provide accurate information when registering and keep your credentials secure. One person may not operate multiple accounts to evade moderation. Public registration is available to customers, farmers, businesses and delivery riders; admin accounts are provisioned internally only.",
  },
  {
    title: "Farmers",
    text: "Farmers warrant that batch records (time, quantity, temperature) are truthful. Misreported batches, adulterated milk or repeated quality failures may lead to suspension and delisting.",
  },
  {
    title: "Platform participants",
    text: "Use operational records responsibly and report inaccurate farm, batch or delivery information through the support process in your portal.",
  },
  {
    title: "Freshness estimates",
    text: "AI freshness scores and spoilage-risk predictions are demonstration estimates, not laboratory certification. They are decision-support tools and do not guarantee shelf life or safety.",
  },
  {
    title: "Content and conduct",
    text: "Reviews and messages must be honest and lawful. We may remove content that is abusive, fraudulent or misleading, and suspend accounts that repeatedly violate these terms.",
  },
  {
    title: "Liability",
    text: "ApnaDairy provides the platform as-is and is not liable for indirect losses arising from its use, to the extent permitted by law. Nothing in these terms limits liability for fraud or wilful misconduct.",
  },
  {
    title: "Changes",
    text: "We may update these terms; continued use of the platform after changes take effect constitutes acceptance.",
  },
];

export function Terms() {
  return (
    <div>
      <EditorialHero
        eyebrow="Legal"
        title={"Terms of service"}
        lede="The rules of the road for using the ApnaDairy platform."
      />
      <ColourBlock tone="ivory">
        <EditorialSectionHead eyebrow="The terms" title="What you agree to" />
        <div className="mx-auto max-w-3xl">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i * 0.03, 0.2)}>
              <section
                aria-labelledby={`terms-${i}`}
                className="border-b border-line py-8 first:pt-0 last:border-0"
              >
                <h2
                  id={`terms-${i}`}
                  className="font-condensed text-2xl uppercase tracking-wide text-ink"
                >
                  <span className="mr-3 text-brand/40" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </h2>
                <p className="mt-3 leading-relaxed text-muted">{s.text}</p>
              </section>
            </Reveal>
          ))}
        </div>
      </ColourBlock>
    </div>
  );
}
