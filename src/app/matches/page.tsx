"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getMe,
  listTeams,
  listMatchesForTeam,
  listIncomingMatchRequests,
  decideMatchRequest,
  FullProfile,
  Team,
  MatchRequestRecord,
  ApiError,
} from "@/lib/api";

export default function MatchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<FullProfile | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRequestRecord[]>([]);
  const [incoming, setIncoming] = useState<MatchRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const myTeams = allTeams.filter((t) => user && t.captainId === user.id);
  const teamName = (id: string) => allTeams.find((t) => t.id === id)?.name ?? "Unknown team";

  const loadMatchData = useCallback(async (teamId: string) => {
    try {
      const [matchList, incomingList] = await Promise.all([
        listMatchesForTeam(teamId),
        listIncomingMatchRequests(teamId),
      ]);
      setMatches(matchList);
      setIncoming(incomingList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load matches.");
    }
  }, []);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 401) router.push("/login");
      });

    listTeams()
      .then(setAllTeams)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load teams."))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (myTeams.length > 0 && !selectedTeamId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTeamId(myTeams[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTeams.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedTeamId) loadMatchData(selectedTeamId);
  }, [selectedTeamId, loadMatchData]);

  async function handleDecision(matchId: string, decision: "accept" | "reject") {
    setError(null);
    try {
      await decideMatchRequest(matchId, decision);
      if (selectedTeamId) await loadMatchData(selectedTeamId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-chalk">
      <AppNavbar user={user} />

      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
        <h1 className="font-display text-3xl font-bold text-soil sm:text-4xl">Matches</h1>

        {loading && <p className="mt-8 text-moss">Loading…</p>}

        {!loading && myTeams.length === 0 && (
          <Card className="mt-8">
            <p className="text-soil/80">
              You need to captain a team to manage match requests.{" "}
              <Link href="/teams/create" className="font-bold text-clay underline underline-offset-2">
                Create one
              </Link>{" "}
              or ask your captain to arrange fixtures.
            </p>
          </Card>
        )}

        {!loading && myTeams.length > 0 && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-soil">Managing fixtures for:</span>
              {myTeams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    selectedTeamId === t.id
                      ? "bg-turf text-chalk"
                      : "border-2 border-moss/25 text-soil hover:bg-soil/5"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {selectedTeamId && (
              <div className="mt-4">
                <Link
                  href={`/matches/request?teamId=${selectedTeamId}`}
                  className="inline-flex items-center justify-center rounded-full bg-clay px-6 py-2.5 text-sm font-semibold text-chalk hover:bg-clay-light"
                >
                  Request a match
                </Link>
              </div>
            )}

            {error && <p className="mt-4 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>}

            {incoming.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl font-bold text-soil">Incoming requests</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {incoming.map((m) => (
                    <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="font-semibold text-soil">vs {teamName(m.requestingTeamId)}</p>
                        <p className="text-sm text-moss">
                          {new Date(m.proposedDate).toLocaleString()} · {m.venue}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          className="px-4 py-1.5 text-xs"
                          onClick={() => handleDecision(m.id, "accept")}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          className="px-4 py-1.5 text-xs"
                          onClick={() => handleDecision(m.id, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10">
              <h2 className="font-display text-xl font-bold text-soil">Fixtures</h2>
              {matches.length === 0 ? (
                <p className="mt-4 text-moss">No fixtures yet.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {matches.map((m) => {
                    const isHome = m.requestingTeamId === selectedTeamId;
                    const opponentId = isHome ? m.opponentTeamId : m.requestingTeamId;
                    return (
                      <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div>
                          <p className="font-semibold text-soil">vs {teamName(opponentId)}</p>
                          <p className="text-sm text-moss">
                            {new Date(m.proposedDate).toLocaleString()} · {m.venue}
                          </p>
                        </div>
                        <StatusBadge status={m.status} />
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: MatchRequestRecord["status"] }) {
  const styles: Record<string, string> = {
    pending: "bg-clay/10 text-clay",
    accepted: "bg-turf/10 text-turf-dark",
    rejected: "bg-moss/10 text-moss",
    cancelled: "bg-moss/10 text-moss",
    completed: "bg-turf/10 text-turf-dark",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${styles[status]}`}>{status}</span>
  );
}
