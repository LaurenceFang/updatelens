import useReviewController from "./client/useReviewController";
import ScopeLine from "./components/ScopeLine";
import ReadingDocument from "./components/ReadingDocument";
import ReviewIndex from "./components/ReviewIndex";
import ReviewDialogs from "./components/ReviewDialogs";
import Icon from "./components/Icon";
import { useLayoutEffect, useRef } from "react";
export default function App() {
  const review = useReviewController();
  const main = useRef<HTMLDivElement>(null),
    document = useRef<HTMLDivElement>(null),
    previousSelection = useRef<string | null>(null);
  const selectionKey = `${review.finding?.id ?? "empty"}-${review.viewProject}-${review.category}`;
  useLayoutEffect(() => {
    if (!review.boot) return;
    if (previousSelection.current === null) {
      previousSelection.current = selectionKey;
      return;
    }
    if (previousSelection.current === selectionKey) return;
    previousSelection.current = selectionKey;
    if (
      !document.current ||
      !main.current ||
      document.current.getBoundingClientRect().top >= 16
    )
      return;
    window.scrollTo({
      top: Math.max(
        0,
        window.scrollY + main.current.getBoundingClientRect().top - 16,
      ),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [selectionKey, review.boot !== null]);
  if (!review.boot)
    return (
      <main className="loading">
        <h1>UpdateLens</h1>
        <p>Loading the official snapshot and saved workflow…</p>
      </main>
    );
  return (
    <>
      <img
        className="page-background"
        src="/assets/literary-paper-background.png"
        alt=""
        aria-hidden="true"
      />
      <div className="app-shell">
        <header className="app-header">
          <a className="brand" href="/" aria-label="UpdateLens home">
            <img src="/assets/literary-lens-mark.png" alt="" />
            UpdateLens
          </a>
          <nav aria-label="Main navigation">
            <button
              className="nav-link active"
              onClick={() => review.setDialog(null)}
            >
              Review
            </button>
            <button
              className="nav-link"
              onClick={() => review.setDialog("sources")}
            >
              Sources
            </button>
            <button
              className="nav-link"
              onClick={() => review.setDialog("method")}
            >
              Method
            </button>
          </nav>
          <button
            className="header-export"
            onClick={() => review.setDialog("export")}
            disabled={!review.report}
          >
            <Icon name="download" size={22} />
            Export
          </button>
        </header>
        <main className="reading-workbench">
          <div ref={main} className="reading-main">
            <ScopeLine review={review} />
            {review.error ? (
              <div className="message error" role="alert">
                <Icon name="info" />
                <span>{review.error}</span>
              </div>
            ) : null}
            {review.notice ? (
              <div className="message notice" role="status">
                <span>{review.notice}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss notice"
                  onClick={review.dismissNotice}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ) : null}
            <div
              ref={document}
              className="document-transition"
              key={`${review.finding?.id ?? "empty"}-${review.viewProject}-${review.category}`}
            >
              <ReadingDocument review={review} />
            </div>
          </div>
          <ReviewIndex review={review} />
        </main>
        <footer className="app-footer">
          <span>
            {review.projectMode === "demo"
              ? "Synthetic samples"
              : "Registered local declarations"}{" "}
            · Official snapshot
          </span>
          <span>
            UpdateLens ·{" "}
            {review.boot.mode === "local" ? "Local service" : "Offline sample"}
          </span>
        </footer>
      </div>
      <ReviewDialogs review={review} />
    </>
  );
}
