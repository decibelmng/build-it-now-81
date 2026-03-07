import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const categories = [
  "general", "plumbing", "electrical", "hvac", "roofing",
  "landscaping", "appliance", "interior", "exterior",
];

const QuickLogCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("general");

  const { data: properties = [] } = useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!properties[0]) throw new Error("No property");
      const dateStr = format(date, "yyyy-MM-dd");
      const { error } = await supabase.from("maintenance_logs").insert({
        title,
        category,
        status: "completed",
        scheduled_date: dateStr,
        completed_date: dateStr,
        cost: cost ? parseFloat(cost) : null,
        property_id: properties[0].id,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Logged!", description: `"${title}" has been added to your maintenance log.` });
      setTitle("");
      setCost("");
      setCategory("general");
      setDate(new Date());
      queryClient.invalidateQueries({ queryKey: ["maintenance_logs_overview"] });
      queryClient.invalidateQueries({ queryKey: ["checklist_logs"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save the entry.", variant: "destructive" });
    },
  });

  if (properties.length === 0) return null;

  return (
    <Card className="mb-8 border-border/50">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-accent" />
          <h3 className="font-display text-base font-semibold">Quick Log</h3>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <Input
              placeholder="What did you do?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-body"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal font-body", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Input
            type="number"
            placeholder="$ Cost"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-[100px] font-body"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[130px] font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="font-body capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
          >
            Log It
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickLogCard;
