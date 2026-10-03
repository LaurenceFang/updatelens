import type {
  BootstrapResponse,
  ChannelId,
  FeatureId,
  OperatingSystem,
} from "../shared/contracts";
import Icon from "./Icon";
interface Props {
  boot: BootstrapResponse;
  channel: ChannelId;
  from: string;
  to: string;
  features: FeatureId[];
  operatingSystem: OperatingSystem;
  busy: boolean;
  onChannel: (v: ChannelId) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onFeatures: (v: FeatureId[]) => void;
  onOperatingSystem: (v: OperatingSystem) => void;
}
export default function SelectionBar(p: Props) {
  const options = [
      ...new Set(
        p.boot.releases
          .filter((r) => r.channel === p.channel)
          .map((r) => r.version ?? r.date),
      ),
    ],
    dated = p.channel === "codex-desktop";
  return (
    <section className="selection" aria-label="Update selection">
      <label>
        Product
        <select
          value={p.channel}
          onChange={(e) => p.onChannel(e.target.value as ChannelId)}
          disabled={p.busy}
        >
          {p.boot.channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <div className="version-pair">
        <label>
          {dated ? "Current date" : "Current version"}
          <select
            value={p.from}
            onChange={(e) => p.onFrom(e.target.value)}
            disabled={p.busy}
          >
            {options.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          {dated ? "Target date" : "Target version"}
          <select
            value={p.to}
            onChange={(e) => p.onTo(e.target.value)}
            disabled={p.busy}
          >
            {options.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="field">
        <label htmlFor="development-os">Development OS</label>
        <select
          id="development-os"
          value={p.operatingSystem}
          onChange={(e) =>
            p.onOperatingSystem(e.target.value as OperatingSystem)
          }
          disabled={p.busy}
          aria-describedby="development-os-note"
        >
          <option value="windows">Windows</option>
          <option value="macos">macOS</option>
          <option value="linux">Linux</option>
          <option value="unspecified">Unspecified</option>
        </select>
        <p id="development-os-note" className="field-note">
          User-selected · CI runners may differ.
        </p>
      </div>
      <fieldset className="features">
        <legend>Workflow areas</legend>
        <div className="feature-grid">
          {p.boot.workflowFeatures.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`feature-toggle ${p.features.includes(f.id) ? "active" : ""}`}
              aria-pressed={p.features.includes(f.id)}
              disabled={p.busy}
              onClick={() =>
                p.onFeatures(
                  p.features.includes(f.id)
                    ? p.features.filter((x) => x !== f.id)
                    : [...p.features, f.id],
                )
              }
            >
              {p.features.includes(f.id) ? (
                <Icon name="check" size={14} />
              ) : (
                <span className="toggle-circle" />
              )}
              <span className="feature-label">
                {f.id === "config"
                  ? "Config"
                  : f.id === "ci"
                    ? "CI / headless"
                    : f.label}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
