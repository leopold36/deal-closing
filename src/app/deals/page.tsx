import { DealsList } from "@/components/deals-list";
import { CreateDealDialog } from "@/components/create-deal-dialog";

export default function DealsPage() {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-base font-semibold">Deals</h1>
          <p className="text-xs text-muted-foreground">
            All deals and their current status
          </p>
        </div>
        <CreateDealDialog />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <DealsList />
      </div>
    </div>
  );
}
