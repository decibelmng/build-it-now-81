import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  type DocumentFilters as Filters,
  CATEGORY_GROUPS,
  CATEGORY_LABELS,
  SOURCE_FILTERS,
  FILE_TYPE_FILTERS,
} from "./constants";

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClear: () => void;
  activeCount: number;
  contacts: { id: string; name: string; company: string | null }[];
}

const FilterControls = ({ filters, onChange, onClear, contacts }: Omit<Props, "activeCount">) => {
  const groupCategories =
    filters.categoryGroup !== "all"
      ? CATEGORY_GROUPS[filters.categoryGroup]?.categories || []
      : Object.values(CATEGORY_GROUPS).flatMap((g) => g.categories);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 font-body"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {/* Category Group */}
        <Select
          value={filters.categoryGroup}
          onValueChange={(v) => onChange({ ...filters, categoryGroup: v, category: "all" })}
        >
          <SelectTrigger className="font-body text-xs h-9">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body text-xs">All Groups</SelectItem>
            {Object.entries(CATEGORY_GROUPS).map(([key, group]) => (
              <SelectItem key={key} value={key} className="font-body text-xs">
                {group.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Specific Category */}
        <Select
          value={filters.category}
          onValueChange={(v) => onChange({ ...filters, category: v })}
        >
          <SelectTrigger className="font-body text-xs h-9">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body text-xs">All Categories</SelectItem>
            {groupCategories.map((cat) => (
              <SelectItem key={cat} value={cat} className="font-body text-xs">
                {CATEGORY_LABELS[cat] || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source */}
        <Select
          value={filters.source}
          onValueChange={(v) => onChange({ ...filters, source: v })}
        >
          <SelectTrigger className="font-body text-xs h-9">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="font-body text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* File Type */}
        <Select
          value={filters.fileType}
          onValueChange={(v) => onChange({ ...filters, fileType: v })}
        >
          <SelectTrigger className="font-body text-xs h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPE_FILTERS.map((t) => (
              <SelectItem key={t.value} value={t.value} className="font-body text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Input
          type="date"
          placeholder="From"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          className="font-body text-xs h-9"
        />

        {/* Date To */}
        <Input
          type="date"
          placeholder="To"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          className="font-body text-xs h-9"
        />
      </div>

      {/* Contractor filter */}
      {contacts.length > 0 && (
        <Select
          value={filters.contactId}
          onValueChange={(v) => onChange({ ...filters, contactId: v })}
        >
          <SelectTrigger className="font-body text-xs h-9 max-w-xs">
            <SelectValue placeholder="All Contractors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body text-xs">All Contractors</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id} className="font-body text-xs">
                {c.name}{c.company ? ` · ${c.company}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClear} className="font-body text-xs h-7">
          <X className="mr-1 h-3 w-3" /> Clear All
        </Button>
      </div>
    </div>
  );
};

const DocumentFilters = ({ filters, onChange, onClear, activeCount, contacts }: Props) => {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <FilterControls filters={filters} onChange={onChange} onClear={onClear} contacts={contacts} />
      </div>

      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9 font-body h-9"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="relative h-9 font-body">
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filters
              {activeCount > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display">Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FilterControls filters={filters} onChange={onChange} onClear={onClear} contacts={contacts} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default DocumentFilters;
