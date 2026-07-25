"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getMe, createTeam, FullProfile, ApiError } from "@/lib/api";

export default function CreateTeamPage() {
  const router = useRouter();
  const [user, setUser] = useState<FullProfile | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 401) router.push("/login");
      });
  }, [router]);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const team = await createTeam({ name, description: description || undefined });
      router.push(`/teams/${team.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-chalk">
      <AppNavbar user={user} />

      <div className="mx-auto max-w-lg px-6 py-12 sm:px-10">
        <h1 className="font-display text-3xl font-bold text-soil">Create a team</h1>
        <p className="mt-2 text-moss">
          You&apos;ll automatically become its captain, with tools to approve join and match requests.
        </p>

        <Card className="mt-8">
          <div className="flex flex-col gap-5">
            <Input
              label="Team name"
              type="text"
              required
              minLength={3}
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Description (optional)"
              type="text"
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {error && (
              <p role="alert" className="rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">
                {error}
              </p>
            )}

            <Button type="button" variant="primary" disabled={loading} className="mt-2 w-full" onClick={submit}>
              {loading ? "Creating…" : "Create team"}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
