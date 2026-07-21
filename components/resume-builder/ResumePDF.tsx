import React from "react";
import type { ResumeData } from "@/lib/resume";

import NaukriTemplate from "./templates/NaukriTemplate";
import AtsClassicTemplate from "./templates/AtsClassicTemplate";
import CorporateSidebarTemplate from "./templates/CorporateSidebarTemplate";
import ModernBandTemplate from "./templates/ModernBandTemplate";

/**
 * Router for the PDF templates. Each template owns its own file under
 * `./templates/` so their layouts can diverge freely; only small shared
 * primitives (icons, bullets, section heading, list blocks) live in
 * `./templates/shared.tsx`.
 */
export function ResumeDocumentRouter({ data }: { data: ResumeData }) {
  switch ((data as any).layout) {
    case "corporateSidebar":
      return <CorporateSidebarTemplate data={data} />;
    case "atsClassic":
      return <AtsClassicTemplate data={data} />;
    case "modernBand":
      return <ModernBandTemplate data={data} />;
    case "naukriStyle":
    default:
      return <NaukriTemplate data={data} />;
  }
}

export default ResumeDocumentRouter;
