import { useEffect, useRef, type ReactNode } from "react";
export default function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button
          className="text-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>
      {children}
    </dialog>
  );
}
