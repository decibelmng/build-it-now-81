import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Notifications = () => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-accent" />
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
      </div>
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground font-body">
        You're all caught up. Alerts about your homes will appear here.
      </div>
      <div className="mt-6">
        <Button variant="outline" asChild><Link to="/portfolio">Back to portfolio</Link></Button>
      </div>
    </div>
  </div>
);

export default Notifications;
