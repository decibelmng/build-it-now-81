import PropertyTabs from "@/components/property/PropertyTabs";

const HOME_TABS = [
  { to: "home/details", label: "Details" },
  { to: "home/systems", label: "Systems" },
  { to: "home/inventory", label: "Inventory" },
  { to: "home/contacts", label: "Contacts" },
];

const ACTIVITY_TABS = [
  { to: "activity/log", label: "Log" },
  { to: "activity/timeline", label: "Timeline" },
  { to: "activity/contractors", label: "Contractors" },
];

const MONEY_TABS = [
  { to: "money/forecast", label: "Forecast" },
  { to: "money/equity", label: "Equity" },
  { to: "money/basis", label: "Cost Basis" },
  { to: "money/tax", label: "Tax" },
  { to: "money/bills", label: "Bills" },
];

export const HomeTabs = () => <PropertyTabs items={HOME_TABS} />;
export const ActivityTabs = () => <PropertyTabs items={ACTIVITY_TABS} />;
export const MoneyTabs = () => <PropertyTabs items={MONEY_TABS} />;
