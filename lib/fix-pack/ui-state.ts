export type FixPackUiStatus = "not_generated" | "generating" | "completed" | "failed";

export interface FixPackActionInput {
  eligible: boolean;
  status: FixPackUiStatus;
}

export interface FixPackActionState {
  label: string;
  disabled: boolean;
  tone: "accent" | "muted" | "outline";
}

export function getFixPackActionState(input: FixPackActionInput): FixPackActionState {
  if (!input.eligible) {
    return { label: "Join the waitlist", disabled: false, tone: "outline" };
  }

  switch (input.status) {
    case "not_generated":
    case "failed":
      return { label: "Generate Fix Pack", disabled: false, tone: "accent" };
    case "generating":
      return { label: "Generating...", disabled: true, tone: "muted" };
    case "completed":
      return { label: "Download agent.md", disabled: false, tone: "accent" };
  }
}

export function getFixPackDownloadHref(scanId: string): string {
  return `/api/v1/scans/${scanId}/fix-pack/agent.md`;
}
