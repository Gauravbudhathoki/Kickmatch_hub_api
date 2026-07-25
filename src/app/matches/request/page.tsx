"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getMe, listTeams, createMatchRequest, FullProfile, Team, ApiError } from "@/lib/api";

function RequestMatchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestingTeamId = searchParams.get("teamId") ?? "";

  const [user, setUser] = useState<FullProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [opponentTeamId, setOpponentTeamId] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 401) router.push("/login");
      });

    listTeams()
      .then(setTeams)
      .catch(() => setError("Failed to load teams."));
  }, [router]);

  const requestingTeam = teams.find((t) => t.id === requestingTeamId);
  const opponentOptions = teams.filter((t) => t.id !== requestingTeamId);

  async function submit() {
    setError(null);

    if (!opponentTeamId) {
      setError("Please choose an opponent.");
      return;
    }
    if (!date) {
      setError("Please choose a date and time.");
      return;
    }

    setLoading(true);
    try {
      await createMatchRequest({
        requestingTeamId,
        opponentTeamId,
        proposedDate: new Date(date).toISOString(),
        venue,
      });
      router.push("/matches");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-chalk">
      <AppNavbar user={user} />

      <div className="mx-auto max-w-lg px-6 py-12 sm:px-10">
        <h1 className="font-display text-3xl font-bold text-soil">Request a match</h1>
        <p className="mt-2 text-moss">
          {requestingTeam ? `On behalf of ${requestingTeam.name}.` : "Choose a team you captain first."}
        </p>

        <Card className="mt-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-soil">Opponent</label>
              <select
                value={opponentTeamId}
                onChange={(e) => setOpponentTeamId(e.target.value)}
                className="rounded-xl border-2 border-moss/25 bg-white px-4 py-2.5 text-soil focus:border-turf"
              >
                <option value="">Select a team…</option>
                {opponentOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Date & time"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <Input
              label="Venue"
              type="text"
              required
              maxLength={100}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Central Park Pitch 3"
            />

            {error && (
              <p role="alert" className="rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">
                {error}
              </p>
            )}

            <Button type="button" variant="primary" disabled={loading} className="mt-2 w-full" onClick={submit}>
              {loading ? "Sending…" : "Send match request"}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function RequestMatchPage() {
  return (
    <Suspense fallback={null}>
      <RequestMatchForm />
    </Suspense>
  );
}
