import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Star } from "lucide-react";
import { PageHeader } from "../../components/ui/Section";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { QueryState } from "../../features/portal/components";
import { useFarms } from "../../features/portal/apiCore";

const KEY = "apnadairy-saved-farms";

/** Saved farms — stored on this device, labelled honestly. */
export function SavedFarms() {
  const farms = useFarms({ verificationStatus: "verified" });
  const [saved, setSaved] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (id: number) => {
    setSaved((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const savedFarms = useMemo(
    () => (farms.data ?? []).filter((f) => saved.includes(f.id)),
    [farms.data, saved],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Farms"
        title="Saved farms"
        description="Farms you follow for quick access. Saved on this device."
      />
      <QueryState
        isLoading={farms.isLoading}
        isError={farms.isError}
        error={farms.error}
        isEmpty={savedFarms.length === 0}
        emptyTitle="No saved farms yet"
        emptyHint="Browse verified farms and tap the heart to save them here."
        emptyIcon={<Heart className="h-7 w-7" aria-hidden="true" />}
        emptyAction={<Link to="/farms"><Button>Browse farms</Button></Link>}
        onRetry={() => farms.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {savedFarms.map((f) => (
            <Card key={f.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/farms/${f.id}`} className="font-display text-base font-semibold text-ink hover:text-brand">
                    {f.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {f.location}
                  </p>
                  {f.ratingAvg !== null && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink">
                      <Star className="h-3.5 w-3.5 text-amber" aria-hidden="true" /> {f.ratingAvg.toFixed(1)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(f.id)}
                  aria-label={`Remove ${f.name} from saved farms`}
                  aria-pressed="true"
                  className="rounded-full p-2 text-danger transition-colors hover:bg-danger/10"
                >
                  <Heart className="h-5 w-5 fill-current" aria-hidden="true" />
                </button>
              </div>
              {f.description && <p className="mt-3 text-sm leading-relaxed text-muted">{f.description}</p>}
            </Card>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
