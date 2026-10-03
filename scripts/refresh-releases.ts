import { mkdir, writeFile } from "node:fs/promises";
import { fetchOfficialSnapshots } from "../server/releases.js";
const releases = await fetchOfficialSnapshots();
await mkdir(new URL("../server/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../server/data/releases.json", import.meta.url),
  JSON.stringify(releases, null, 2) + "\n",
);
console.log(
  `Saved ${releases.length} official release snapshots, retrieved ${releases[0].fetchedAt}.`,
);
