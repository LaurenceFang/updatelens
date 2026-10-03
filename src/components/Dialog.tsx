import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";
export default function Dialog({
  title,
  onClose,
  children,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode | ((close: () => void) => ReactNode);
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      dialog?.close();
    };
  }, []);
  function close() {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ref.current?.close();
      onClose();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => {
      ref.current?.close();
      onClose();
    }, 180);
  }
  return (
    <dialog
      ref={ref}
      className={`review-dialog ${className} ${closing ? "closing" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      aria-label={title}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {typeof children === "function" ? children(close) : children}
    </dialog>
  );
}
