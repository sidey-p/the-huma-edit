import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/navigation/PublicShell";

/** Premium plans page : the ad-free reading room membership. */
export default function PremiumPage() {
  const plans = [
    {
      name: "Solo Reader",
      price: "₹99",
      per: "/month",
      line: "Ad-free reading everywhere",
      points: [
        "No interruptions in any piece",
        "Unlimited highlights and notes",
        "Library synced across devices",
        "Reading paths with progress",
      ],
    },
    {
      name: "Reading Room",
      price: "₹799",
      per: "/year",
      line: "Two months on the house",
      points: [
        "Everything in Solo Reader",
        "Personal vocabulary collection",
        "Early access to new corners",
        "Support human writing directly",
      ],
      featured: true,
    },
  ];

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-20 sm:px-6">
        <p className="meta-line" style={{ color: "var(--orange)" }}>
          Membership
        </p>
        <h1 className="display-xl mt-3">
          Read without interruptions.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-muted">
          Every piece on The Human Edit is written and edited by people.
          Membership keeps it that way, and keeps the reading room quiet:
          no ads between paragraphs, no pop-ups, no tracking theater.
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {plans.map((p) => (
            <section
              key={p.name}
              className="corner-card"
              style={p.featured ? { borderColor: "var(--orange)" } : undefined}
            >
              <p className="cnum">{p.featured ? "Best value" : "For one"}</p>
              <h3 className="mt-1">{p.name}</h3>
              <p className="mt-3">
                <span className="font-display text-3xl">{p.price}</span>
                <span className="meta-line ml-1">{p.per}</span>
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--orange)" }}>
                {p.line}
              </p>
              <ul className="mt-5 space-y-2">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2 text-sm text-ink-muted">
                    <span aria-hidden="true" style={{ color: "var(--orange)" }}>
                      ✓
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-in"
                className="btn btn-primary mt-6"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Choose {p.name}
              </Link>
            </section>
          ))}
        </div>

        <p className="meta-line mt-12 text-center">
          Membership is not required to read. Every article stays open,
          always. Plans only remove interruptions and add keeping tools.
        </p>
      </div>
    </PublicShell>
  );
}

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Read The Human Edit without interruptions, keep unlimited highlights, and support human writing.",
};
