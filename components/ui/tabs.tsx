"use client";
import { useState } from "react";

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultValue);

  return (
    <div>
      {children &&
        Array.isArray(children) &&
        children.map((child: any) =>
          child.type.displayName === "TabsList"
            ? { ...child, props: { ...child.props, active, setActive } }
            : { ...child, props: { ...child.props, active } }
        )}
    </div>
  );
}

export function TabsList({ children, active, setActive }: any) {
  return (
    <div className="flex gap-2 mb-4">
      {children.map((child: any) =>
        <button
          key={child.props.value}
          onClick={() => setActive(child.props.value)}
          className={`px-4 py-2 rounded-md ${
            active === child.props.value ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          {child.props.children}
        </button>
      )}
    </div>
  );
}
TabsList.displayName = "TabsList";

export function TabsTrigger({ value, children }: any) {
  return <>{children}</>;
}
TabsTrigger.displayName = "TabsTrigger";

export function TabsContent({ value, active, children }: any) {
  if (active !== value) return null;
  return <div>{children}</div>;
}
TabsContent.displayName = "TabsContent";
