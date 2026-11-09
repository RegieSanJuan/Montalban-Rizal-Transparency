import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * A page that fails to load (for example a lazily loaded page while offline)
 * shows a plain Filipino message with a way back, instead of an empty screen.
 * Reset by changing `resetKey` (the route), so the next page loads normally.
 */
export default class RouteBoundary extends Component<{ resetKey: string; children: ReactNode }, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { error: Error | null; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Hindi na-load ang pahina', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="page main">
        <h1 className="project-h">Hindi ma-load ang pahinang ito</h1>
        <div className="state state-error" role="alert">
          <p>
            Maaaring offline ka o mahina ang koneksyon. Subukang i-load muli ang pahina kapag may koneksyon na. Hindi nabago
            ang anumang datos.
          </p>
          <p className="state-detail">Teknikal na detalye: <span lang="en">{this.state.error.message}</span></p>
          <button type="button" className="button" onClick={() => window.location.reload()}>I-load muli ang pahina</button>
        </div>
      </main>
    );
  }
}
