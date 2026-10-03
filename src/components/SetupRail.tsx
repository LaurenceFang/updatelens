import { useLayoutEffect, useRef, type ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  open: boolean;
  onOpen: (open: boolean) => void;
  layoutKey: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Keep the primary action visible while longer setup controls scroll independently. */
export default function SetupRail({
  open,
  onOpen,
  layoutKey,
  children,
  footer,
}: Props) {
  const rail = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!rail.current) return;
      const top = Math.max(18, rail.current.getBoundingClientRect().top);
      const height = Math.max(260, window.innerHeight - top - 18);
      rail.current.style.setProperty("--rail-available-height", `${height}px`);
    };
    const schedule = (event: Event) => {
      if (event.type === "scroll" && window.innerWidth <= 760) return;
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [layoutKey]);

  return (
    <aside ref={rail} className="setup-rail" aria-label="Review setup">
      <h2 className="rail-title">
        <button
          type="button"
          className="rail-heading"
          aria-expanded={open}
          aria-controls="review-setup-controls"
          onClick={() => onOpen(!open)}
        >
          Review setup
          <Icon name="down" size={17} />
        </button>
      </h2>
      <div
        id="review-setup-controls"
        className="rail-controls"
        hidden={!open}
        role="region"
        aria-label="Review setup configuration"
        tabIndex={0}
      >
        {children}
      </div>
      <div className="rail-footer" role="group" aria-label="Review actions">
        {footer}
      </div>
    </aside>
  );
}
