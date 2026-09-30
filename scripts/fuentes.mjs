import { readFileSync } from "node:fs";
const packs = JSON.parse(readFileSync(new URL("../src/data/topic-packs.json", import.meta.url), "utf8"));
const urls = [...new Set(packs.flatMap((p) => p.facts.map((f) => f.source.url)))];
let malas = 0;
for (const url of urls) {
  if (url.startsWith("https://doi.org/")) {
    const doi = decodeURIComponent(url.slice("https://doi.org/".length));
    const r = await fetch("https://api.crossref.org/works/" + encodeURIComponent(doi));
    if (!r.ok) { console.log("DOI NO REGISTRADO: " + url); malas++; continue; }
    const m = (await r.json()).message;
    console.log("ok  " + (m.title || [""])[0].slice(0, 70) + "  [" + ((m["container-title"] || [""])[0] || "libro") + " " + m.issued["date-parts"][0][0] + "]");
  } else {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" }, redirect: "follow" });
    console.log((r.ok ? "ok  " : "FALLA " + r.status + "  ") + url);
    if (!r.ok) malas++;
  }
}
console.log(`\n${urls.length} fuentes distintas, ${malas} con problema`);
