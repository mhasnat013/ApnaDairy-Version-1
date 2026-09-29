import {
  EditorialHero,
  ColourBlock,
  EditorialSectionHead,
} from "../../components/public/Editorial";
import { Reveal } from "../../components/ui/Reveal";

const SECTIONS = [
  {
    title: "Information we collect",
    text: "We collect the information you give us when you register and use ApnaDairy: your name, email, phone number, role and, where relevant, identity documents and farm location. We also collect operational data created in the platform: batches, sensor readings, delivery events and support messages.",
  },
  {
    title: "How we use it",
    text: "Your information supports identity and farm verification, batch records, delivery workflows, freshness estimates and account notifications. We do not sell your personal data to third parties.",
  },
  {
    title: "Sensor and AI data",
    text: "IoT sensor readings and AI predictions relate to milk batches, not to you personally. They are stored with batch records to support traceability and freshness transparency.",
  },
  {
    title: "Sharing",
    text: "We share only the operational information needed for the platform: verified farm information may be public, riders receive assigned pickup and drop-off details, and administrators access records for verification and support.",
  },
  {
    title: "Security",
    text: "Passwords are stored hashed, sessions use short-lived tokens, and all traffic is encrypted in transit. Access to personal data is restricted by role.",
  },
  {
    title: "Your rights",
    text: "You can view and update your profile at any time in your portal, and you can request a copy or deletion of your personal data by contacting support. Anonymised operational records may be retained for safety, audit and legal compliance.",
  },
  {
    title: "Changes to this policy",
    text: "We will update this page when the policy changes, and notify account holders of material changes.",
  },
];

export function Privacy() {
  return (
    <div>
      <EditorialHero
        eyebrow="Legal"
        title={"Privacy policy"}
        lede="How ApnaDairy collects, uses and protects your information."
      />
      <ColourBlock tone="ivory">
        <EditorialSectionHead eyebrow="The policy" title="Plain language, full detail" />
        <div className="mx-auto max-w-3xl">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i * 0.03, 0.2)}>
              <section
                aria-labelledby={`privacy-${i}`}
                className="border-b border-line py-8 first:pt-0 last:border-0"
              >
                <h2
                  id={`privacy-${i}`}
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
