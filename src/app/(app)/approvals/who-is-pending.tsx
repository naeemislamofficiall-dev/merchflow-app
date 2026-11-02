import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approvalService } from "@/services/approval.service";

export async function WhoIsPending({ id }: { id: string }) {
  const d = await approvalService.requestDetail(id);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <ol className="space-y-1">
          {d.steps.map((s) => {
            const act = d.req.actions.find((a) => a.stepOrder === s.stepOrder);
            return (
              <li key={s.id}>
                {s.stepOrder}. {s.name} ({s.approverRole.name}):{" "}
                {act
                  ? `${act.decision.toLowerCase()} by ${act.approver.name}${act.delegatedFromId ? " (as delegate)" : ""}`
                  : s.stepOrder === d.req.currentStep && d.req.status === "PENDING"
                    ? "waiting"
                    : "not reached"}
              </li>
            );
          })}
        </ol>
        {d.req.status === "PENDING" && (
          <div>
            <p className="font-medium">Waiting on ({d.pendingDays} day(s) at this step)</p>
            {d.waitingOn.length === 0 && <p className="text-muted-foreground">No active user holds this role</p>}
            {d.waitingOn.map((u) => (
              <p key={`${u.id}-${u.via ?? ""}`}>{u.name} ({u.email}){u.via ? ` - ${u.via}` : ""}</p>
            ))}
          </div>
        )}
        {d.req.escalations.length > 0 && <p className="text-muted-foreground">Escalated {d.req.escalations.length} time(s)</p>}
      </CardContent>
    </Card>
  );
}