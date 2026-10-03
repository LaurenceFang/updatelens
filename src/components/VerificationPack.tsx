import { useMemo, useRef, useState } from "react";
import type { Report } from "../shared/contracts";
import { createVerificationPack } from "../client/verification-pack";
import Icon from "./Icon";

export default function VerificationPack({
  report,
  findingId,
}: {
  report: Report;
  findingId: string;
}) {
  const pack = useMemo(
    () => createVerificationPack(report, findingId),
    [report, findingId],
  );
  const prompt = useRef<HTMLTextAreaElement>(null);
  const [notice, setNotice] = useState("");
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(pack.content);
      setNotice(
        "Verification prompt copied. No provider request or check was executed.",
      );
    } catch {
      prompt.current?.focus();
      prompt.current?.select();
      setNotice(
        "Clipboard unavailable. Prompt text selected; use Ctrl+C or Cmd+C to copy manually.",
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([pack.content], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = pack.filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Markdown download requested. This pack has not run any verification.",
    );
  }
  return (
    <details className="document-disclosure verification-pack">
      <summary>Verification pack · copy a read-only prompt</summary>
      <p className="metadata">
        For the current finding only. Generates locally; separate from Go
        payload preview.
      </p>
      <textarea
        ref={prompt}
        className="verification-pack-content"
        aria-label="Generated verification prompt"
        readOnly
        rows={10}
        value={pack.content}
      />
      <div className="verification-pack-actions">
        <button className="secondary" onClick={() => void copy()}>
          <Icon name="file" size={17} />
          Copy verification prompt
        </button>
        <button className="secondary" onClick={download}>
          <Icon name="download" size={17} />
          Download .md
        </button>
      </div>
      {notice ? (
        <p className="metadata" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
    </details>
  );
}
