import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useEffect, useRef } from "react";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { listPublicSkillsWithDetails } from "~/lib/db/queries";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Skeleton } from "~/components/ui/skeleton";
import { SkillCard } from "~/components/skill-card";

type SearchParams = {
  q?: string;
  sort?: string;
  page?: number;
};

const fetchSkills = createServerFn({ method: "GET" })
  .inputValidator((data: SearchParams) => data)
  .handler(async ({ data }) => {
    const db = drizzle(env.DB);
    return listPublicSkillsWithDetails(db, {
      q: data.q,
      sort: data.sort,
      page: data.page,
      limit: 12,
    });
  });

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: (search.q as string) || undefined,
    sort: (search.sort as string) || undefined,
    page: Number(search.page) || undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => fetchSkills({ data: deps }),
  pendingComponent: ExploreSkeleton,
  component: ExplorePage,
});

function ExploreSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-10 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ExplorePage() {
  const { q, sort, page } = Route.useSearch();
  const data = Route.useLoaderData();
  const navigate = useNavigate({ from: "/explore" });
  const [search, setSearch] = useState(q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setSearch(q ?? "");
  }, [q]);

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigate({
        search: (prev: SearchParams) => ({
          ...prev,
          q: value || undefined,
          page: undefined,
        }),
      });
    }, 300);
  }

  function handleSort(value: string) {
    navigate({
      search: (prev: SearchParams) => ({
        ...prev,
        sort: value === "newest" ? undefined : value,
        page: undefined,
      }),
    });
  }

  function handlePage(newPage: number) {
    navigate({
      search: (prev: SearchParams) => ({
        ...prev,
        page: newPage > 1 ? newPage : undefined,
      }),
    });
  }

  const currentPage = page ?? 1;
  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div className="relative">
      <div className="dot-grid absolute inset-0" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
            Registry
          </p>
          <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
            Explore Skills
          </h1>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative max-w-md flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                placeholder="Search skills..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-10 rounded-lg border-border/50 bg-card/50 pl-9 font-mono text-sm placeholder:text-muted-foreground/40 focus:border-primary/30 focus:ring-primary/20"
              />
            </div>

            {/* Sort */}
            <Tabs value={sort ?? "newest"} onValueChange={handleSort}>
              <TabsList className="h-9 rounded-lg bg-card/80">
                <TabsTrigger value="newest" className="rounded-md text-xs">Newest</TabsTrigger>
                <TabsTrigger value="downloads" className="rounded-md text-xs">Popular</TabsTrigger>
                <TabsTrigger value="name" className="rounded-md text-xs">A-Z</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Results */}
        {data.items.length === 0 ? (
          <div className="py-24 text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-border/50 bg-card/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold">No skills found</h2>
            <p className="text-sm text-muted-foreground">
              {q ? `No results for "${q}". Try a different search.` : "No skills have been published yet. Be the first!"}
            </p>
          </div>
        ) : (
          <>
            {/* Count */}
            <p className="mb-5 font-mono text-xs text-muted-foreground/50">
              {data.total} skill{data.total !== 1 ? "s" : ""} found
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((item) => (
                <SkillCard
                  key={item.skill.id}
                  ownerUsername={item.ownerUsername}
                  name={item.skill.name}
                  description={item.skill.description}
                  downloadCount={item.skill.downloadCount}
                  latestVersion={item.latestVersion?.version ?? null}
                  scanStatus={item.scan?.overallStatus}
                  updatedAt={item.skill.updatedAt}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePage(currentPage - 1)}
                  className="h-8 rounded-lg border-border/50 text-xs"
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-muted-foreground/50">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePage(currentPage + 1)}
                  className="h-8 rounded-lg border-border/50 text-xs"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
