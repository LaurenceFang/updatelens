import type { ReviewController } from "../client/useReviewController";
import Icon from "./Icon";
export default function ScopeLine({ review: r }: { review: ReviewController }) {
  if (!r.boot) return null;
  const options = [
      ...new Set(
        r.boot.releases
          .filter((item) => item.channel === r.channel)
          .map((item) => item.version ?? item.date),
      ),
    ],
    dated = r.channel === "codex-desktop";
  return (
    <section className="scope-line" aria-label="Review scope">
      <span className="scope-label">Scope</span>
      <label className="scope-product">
        <span className="sr-only">Product</span>
        <select
          value={r.channel}
          disabled={r.busy}
          onChange={(event) =>
            r.chooseChannel(event.target.value as typeof r.channel)
          }
        >
          {r.boot.channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.label}
            </option>
          ))}
        </select>
      </label>
      <div className={`scope-boundaries ${dated ? "dated" : ""}`}>
        <label>
          <span className="sr-only">
            {dated ? "Current date" : "Current version"}
          </span>
          <select
            value={r.from}
            disabled={r.busy}
            onChange={(event) => r.chooseFrom(event.target.value)}
          >
            {options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <Icon name="arrow" size={17} />
        <label>
          <span className="sr-only">
            {dated ? "Target date" : "Target version"}
          </span>
          <select
            value={r.to}
            disabled={r.busy}
            onChange={(event) => r.chooseTo(event.target.value)}
          >
            {options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="scope-os">
        <span className="sr-only">Development OS</span>
        {r.operatingSystem === "windows" ? (
          <Icon name="windows" size={20} />
        ) : null}
        <select
          value={r.operatingSystem}
          aria-describedby="scope-os-description"
          disabled={r.busy}
          onChange={(event) =>
            r.chooseOS(event.target.value as typeof r.operatingSystem)
          }
        >
          <option value="windows">Windows</option>
          <option value="macos">macOS</option>
          <option value="linux">Linux</option>
          <option value="unspecified">Unspecified</option>
        </select>
      </label>
      <span className="sr-only" id="scope-os-description">
        User-selected development OS; remote CI runners may differ.
      </span>
      <button
        className="secondary edit-scope"
        onClick={() => r.setDialog("scope")}
        disabled={r.busy}
      >
        <Icon name="edit" size={19} />
        Edit scope
      </button>
    </section>
  );
}
