import { ErrorBoundary } from "../components/error-boundary";

export default function TriageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary flowName="Emergency Triage">{children}</ErrorBoundary>;
}
