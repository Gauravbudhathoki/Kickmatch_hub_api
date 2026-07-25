"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChalkDivider } from "@/components/ui/ChalkDivider";
import {
  getMe,
  getTeam,
  joinTeam,
  listPendingRequests,
  decideJoinRequest,
  FullProfile,
  TeamDetail,
  PendingJoinRequest,
  ApiError,
} from "@/lib/api";

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const teamId = params.id;

  const [user, setUser] = useState<FullProfile | null>(null);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [requests, setRequests] = useState<PendingJoinRequest[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const isCaptain = user && team && user.id === team.captainId;

  const loadRequests = useCallback(async () => {
    try {
      const pending = await listPendingRequests(teamId);
      setRequests(pending);
    } catch {
      setRequests(null);
    }
  }, [teamId]);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 401) router.push("/login");
      });

    getTeam(teamId)
      .then(setTeam)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load team."));
  }, [teamId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isCaptain) loadRequests();
  }, [isCaptain, loadRequests]);

  async function handleJoin() {
    setJoining(true);
    setMessage(null);
    setError(null);
    try {
      await joinTeam(teamId);
      setMessage("Join request sent — the captain will review it.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setJoining(false);
    }
  }

  async function handleDecision(membershipId: string, decision: "approve" | "reject") {
    setError(null);
    try {
      await decideJoinRequest(teamId, membershipId, decision);
      await Promise.all([loadRequests(), getTeam(teamId).then(setTeam)]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  if (!user) return null;
  if (error && !team) {
    return (
      <main className="min-h-screen bg-chalk">
        <AppNavbar user={user} />
        <p className="mx-auto max-w-6xl px-6 py-12 text-clay sm:px-10">{error}</p>
      </main>
    );
  }
  if (!team) {
    return (
      <main className="min-h-screen bg-chalk">
        <AppNavbar user={user} />
        <p className="mx-auto max-w-6xl px-6 py-12 text-moss sm:px-10">Loading team…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-chalk">
      <AppNavbar user={user} />

      <div className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
        <h1 className="font-display text-3xl font-bold text-soil sm:text-4xl">{team.name}</h1>
        <p className="mt-2 text-moss">{team.description || "No description yet."}</p>

        {!isCaptain && (
          <div className="mt-6">
            <Button variant="primary" onClick={handleJoin} disabled={joining}>
              {joining ? "Requesting…" : "Request to join"}
            </Button>
          </div>
        )}

        {message && <p className="mt-4 rounded-lg bg-turf/10 px-4 py-3 text-sm text-turf-dark">{message}</p>}
        {error && <p className="mt-4 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>}

        <ChalkDivider className="my-8 text-moss/30" />

        <h2 className="font-display text-xl font-bold text-soil">Roster</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {team.roster.map((member) => (
            <Card key={member.userId} className="flex items-center justify-between py-4">
              <span className="font-semibold text-soil">{member.displayName || member.username}</span>
              {member.userId === team.captainId && (
                <span className="rounded-full bg-turf/10 px-2.5 py-0.5 text-xs font-bold uppercase text-turf-dark">
                  Captain
                </span>
              )}
            </Card>
          ))}
        </div>

        {isCaptain && requests && (
          <>
            <ChalkDivider flip className="my-8 text-moss/30" />
            <h2 className="font-display text-xl font-bold text-soil">Pending join requests</h2>
            {requests.length === 0 ? (
              <p className="mt-4 text-moss">No pending requests right now.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {requests.map((req) => (
                  <Card key={req.membershipId} className="flex items-center justify-between py-4">
                    <span className="font-semibold text-soil">{req.displayName || req.username}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        className="px-4 py-1.5 text-xs"
                        onClick={() => handleDecision(req.membershipId, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="px-4 py-1.5 text-xs"
                        onClick={() => handleDecision(req.membershipId, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
