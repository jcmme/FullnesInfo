import assert from "node:assert/strict";
import { test } from "node:test";
import packs from "../data/topic-packs.json" with { type: "json" };
import catalogo from "../data/mystery-topics.json" with { type: "json" };
import type { MysteryTopic, TopicPack } from "./types";
import { pickChallenge } from "./picks.ts";

const PACKS = packs as TopicPack[];
const TOPICS = catalogo as MysteryTopic[];

test("cada ficha corresponde a un tema del catálogo", () => {
  const ids = new Set(TOPICS.map((t) => t.id));
  for (const p of PACKS) assert.ok(ids.has(p.id), `la ficha ${p.id} no existe en el catálogo`);
});

test("no hay ids repetidos", () => {
  for (const lista of [PACKS.map((p) => p.id), TOPICS.map((t) => t.id)]) {
    assert.equal(new Set(lista).size, lista.length);
  }
});

test("cada dato curioso trae fuente con enlace", () => {
  for (const p of PACKS) {
    assert.ok(p.facts.length >= 3, `${p.id} tiene muy pocos datos`);
    for (const f of p.facts) {
      assert.ok(f.text.length > 40, `dato muy corto en ${p.id}`);
      assert.ok(f.source.title && /^https:\/\//.test(f.source.url), `fuente incompleta en ${p.id}`);
      // Wikipedia es el primer resultado de cualquier búsqueda: aquí se pide algo más fuerte.
      assert.ok(!/wikipedia\.org/.test(f.source.url), `${p.id}: Wikipedia no cuenta como fuente de un dato`);
    }
  }
});

test("las áreas del catálogo no quedan vacías", () => {
  const vacias = ["espacio", "naturaleza", "comida", "trabajo", "deporte", "misterios"].filter(
    (a) => !TOPICS.some((t) => t.area === a),
  );
  assert.deepEqual(vacias, []);
});

test("ninguna ficha queda a medias", () => {
  for (const p of PACKS) {
    assert.ok(p.summary.length > 80 && p.why.length > 60, `${p.id}: resumen o motivo muy cortos`);
    assert.ok(p.timeline.length >= 3, `${p.id}: línea de tiempo muy corta`);
    assert.ok(p.terms.length >= 3, `${p.id}: faltan términos`);
    assert.ok(p.questions.length >= 3, `${p.id}: faltan preguntas`);
    const r = p.recommendations;
    assert.ok(r.videos.length >= 1, `${p.id}: sin nada que ver`);
    for (const link of [...r.videos, ...r.books, ...r.articles]) {
      assert.ok(link.title && link.why && /^https:\/\//.test(link.url), `${p.id}: recomendación incompleta`);
    }
  }
});

test("el reto del día es estable y siempre tiene respuesta", () => {
  const dia = "2026-09-30";
  const keys = PACKS.slice(0, 5).map((p) => p.id);
  const reto = pickChallenge(PACKS, keys, ["historia"], dia);
  assert.equal(reto.length, 3);
  assert.deepEqual(reto, pickChallenge(PACKS, keys, ["historia"], dia), "el mismo día debe dar el mismo reto");
  assert.notDeepEqual(reto, pickChallenge(PACKS, keys, ["historia"], "2026-10-01"), "otro día, otro reto");

  const vistos = new Set<string>();
  for (const r of reto) {
    assert.equal(r.options.length, 3);
    assert.equal(new Set(r.options.map((o) => o.key)).size, 3, "las tres opciones son distintas");
    assert.ok(r.options.some((o) => o.key === r.answer), "la respuesta correcta está entre las opciones");
    assert.ok(r.fact.text.length > 40 && r.fact.source.url.startsWith("https://"));
    assert.ok(!vistos.has(r.answer), "no se repite el tema entre rondas");
    vistos.add(r.answer);
  }
});

test("el reto prefiere tus temas cuando tienes suficientes", () => {
  const keys = PACKS.slice(0, 4).map((p) => p.id);
  for (const r of pickChallenge(PACKS, keys, [], "2026-09-30")) {
    assert.ok(keys.includes(r.answer), "la respuesta sale de tus temas");
  }
});
