import React from "react";
import TopNav from "./TopNav";

interface AppFrameProps {
  children: React.ReactNode;
}

export default function AppFrame({ children }: AppFrameProps) {
  return (
    <div className="br-frame">
      <TopNav />
      {children}
    </div>
  );
}
