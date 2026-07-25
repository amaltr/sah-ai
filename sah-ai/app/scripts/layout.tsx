import { ErrorBoundary } from "../components/error-boundary";

export default function ScriptsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary flowName="Script Generator">{children}</ErrorBoundary>;
}
