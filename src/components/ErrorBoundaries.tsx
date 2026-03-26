import { Component, type ReactNode } from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

interface BoundaryBaseProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}

class BoundaryBase extends Component<BoundaryBaseProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error(error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }

    return this.props.children;
  }
}

function reloadPage(): void {
  window.location.reload();
}

function ErrorFallbackFrame({
  title,
  summary,
  onOpenSettings,
}: {
  title: string;
  summary: string;
  onOpenSettings?: () => void;
}): ReactNode {
  return (
    <div className="ff-boundary">
      <div className="ff-boundary__card">
        <p className="ff-boundary__eyebrow">Flapify recovery mode</p>
        <h2>{title}</h2>
        <p>{summary}</p>
        <div className="ff-boundary__actions">
          <button type="button" className="ff-button ff-button--primary" onClick={reloadPage}>
            Reload
          </button>
          {onOpenSettings && (
            <button type="button" className="ff-button" onClick={onOpenSettings}>
              Open Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: ReactNode }): ReactNode {
  return (
    <BoundaryBase
      fallback={(error) => (
        <ErrorFallbackFrame
          title="The app hit an unexpected error"
          summary={error.message || "A runtime error interrupted Flapify."}
        />
      )}
    >
      {children}
    </BoundaryBase>
  );
}

export function DisplayErrorBoundary({
  children,
  onOpenSettings,
}: {
  children: ReactNode;
  onOpenSettings: () => void;
}): ReactNode {
  return (
    <BoundaryBase
      fallback={(error) => (
        <ErrorFallbackFrame
          title="The display view failed to render"
          summary={error.message || "The active scene could not render safely."}
          onOpenSettings={onOpenSettings}
        />
      )}
    >
      {children}
    </BoundaryBase>
  );
}
