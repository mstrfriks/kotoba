import { cn } from "../../lib/utils";

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="grid grid-cols-3 rounded-md border border-[#dbe1dc] bg-[#eef2ee] p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "h-9 rounded px-2 text-sm font-medium transition",
            value === tab.value
              ? "bg-white text-[#1d2b22] shadow-sm"
              : "text-[#66736a] hover:text-[#1d2b22]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
