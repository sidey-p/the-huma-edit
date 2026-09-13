"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Authenticated } from "convex/react";

/**
 * §4.2 Settings — reader account + theme preference.
 * Readers see their profile when signed in; otherwise a quiet sign-in prompt.
 */
export function SettingsInner() {
  return (
    <Authenticated>
      <ProfilePanel />
    </Authenticated>
  );
}

function ProfilePanel() {
  const profile = useQuery(api.profiles.getMyProfile);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-xl">Account</h2>
        <p className="meta-line mt-2">
          {profile ? (profile.fullName ?? profile.username ?? "Reader account") : "Reader account"}
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl">Appearance</h2>
        <p className="meta-line mt-2">
          The site follows your system theme. Use the sun/moon control in the
          masthead to choose light or dark — your choice is remembered.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl">Privacy</h2>
        <p className="meta-line mt-2">
          Your library, highlights, and reading history are private to you.
        </p>
      </section>
    </div>
  );
}
