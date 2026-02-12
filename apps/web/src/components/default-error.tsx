import { AlertTriangle } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

export function DefaultError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-md rounded-xl border border-destructive/20 bg-destructive/[0.03] p-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
        <p className="mb-6 text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => router.invalidate()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
