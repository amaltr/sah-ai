import { ErrorBoundary } from "../components/error-boundary";

export default function CompanionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary flowName="Voice Companion">{children}</ErrorBoundary>;
}
