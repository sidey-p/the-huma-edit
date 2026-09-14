import Link from "next/link";
import { ThemeProvider } from "@/components/site/ThemeProvider";

export function ContinueBanner() {
  return (
    <>
      <ThemeProvider />
      <div className="continue-banner">
        <p>Keep reading. More stories waiting for you.</p>
      </div>
    </>
  );
}
