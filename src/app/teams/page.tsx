"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Card } from "@/components/ui/Card";
import { getMe, listTeams, FullProfile, Team, ApiError } from "@/lib/api";

export default function TeamsPage() {
  const router = useRouter();
  const [user, setUser] = useState<FullProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 401) router.push("/login");
      });

    listTeams()
      .then(setTeams)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load teams."))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-chalk">
      <AppNavbar user={user} />

      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-bold text-soil sm:text-4xl">Teams</h1>
          <Link
            href="/teams/create"
            className="rounded-full bg-clay px-6 py-2.5 text-sm font-semibold text-chalk hover:bg-clay-light"
          >
            Create a team
          </Link>
        </div>

        {loading && <p className="mt-8 text-moss">Loading teams…</p>}
        {error && <p className="mt-8 text-clay">{error}</p>}

        {!loading && !error && teams.length === 0 && (
          <p className="mt-8 text-moss">No teams yet — be the first to create one.</p>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <h3 className="font-display text-xl font-bold text-soil">{team.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-soil/70">
                  {team.description || "No description yet."}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
