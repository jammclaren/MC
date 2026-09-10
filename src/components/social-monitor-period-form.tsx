import { Button } from "@/components/ui/button";

/** Plain GET form — same pattern as the Incidents/Audit Log filters — so
 * the selected/compared date ranges live in the URL and a full server
 * re-render just re-fetches with the new range, no client state needed. */
export function SocialMonitorPeriodForm({
  spStart,
  spEnd,
  cpStart,
  cpEnd,
}: {
  spStart: string;
  spEnd: string;
  cpStart: string;
  cpEnd: string;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground uppercase">Period</span>
        <div className="flex items-center gap-1">
          <input
            type="date"
            name="spStart"
            defaultValue={spStart}
            className="rounded border bg-background px-2 py-1.5"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            name="spEnd"
            defaultValue={spEnd}
            className="rounded border bg-background px-2 py-1.5"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground uppercase">Compared Period</span>
        <div className="flex items-center gap-1">
          <input
            type="date"
            name="cpStart"
            defaultValue={cpStart}
            className="rounded border bg-background px-2 py-1.5"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            name="cpEnd"
            defaultValue={cpEnd}
            className="rounded border bg-background px-2 py-1.5"
          />
        </div>
      </div>
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}
