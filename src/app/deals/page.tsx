import { DealsList } from "@/components/deals-list";
import { CreateDealDialog } from "@/components/create-deal-dialog";

export default function DealsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-muted-foreground mt-1">
            All deals and their current status.
          </p>
        </div>
        <CreateDealDialog />
      </div>
      <DealsList />
    </div>
  );
}
