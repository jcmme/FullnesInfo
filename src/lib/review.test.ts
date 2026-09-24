import assert from "node:assert/strict";
import { test } from "node:test";
import { materialOf, reviewNote, type Verdict } from "./review.ts";

/**
 * Estas reglas deciden si un día cuenta, y un día que no cuenta termina en castigo.
 * Por eso la prueba que importa no es que cache tramposos: es que NUNCA marque como
 * basura una nota escrita de verdad. Si algún caso legítimo falla, se suaviza la regla.
 */

// Video en inglés con capítulos: el caso más común de la app.
const huberman = materialOf({
  title: "Sleep Toolkit: Tools for Optimizing Sleep & Sleep-Wake Timing",
  author: "Andrew Huberman",
  chapters: [{ title: "Light exposure" }, { title: "Caffeine timing" }, { title: "Temperature and sleep" }],
});

// Tema de la caja misteriosa: material en español.
const galeon = materialOf({
  topic: {
    title: "El galeón de Manila",
    hook: "Durante 250 años una sola ruta unió Asia con América y casi nadie la recuerda.",
    why: "Fue la primera globalización real y explica la influencia asiática en la costa mexicana.",
    questions: ["¿Qué se transportaba y en qué dirección?", "¿Por qué terminó la ruta?"],
    terms: ["nao", "plata", "Acapulco"],
  },
});

const verdict = (note: string, material: string[], sameDayNotes: string[] = []): Verdict =>
  reviewNote({ note, material, sameDayNotes }).verdict;

test("una nota escrita de verdad siempre cuenta", () => {
  const legitimas: [string, string[]][] = [
    [
      `Lo más importante que me llevo es que la luz de la mañana es la señal que ordena todo lo demás.
       Si salgo a la calle los primeros minutos del día, el cuerpo entiende a qué hora empieza y a qué
       hora le toca tener sueño. También entendí que el café no me quita el cansancio, nada más lo
       esconde unas horas y después me lo cobra.`,
      huberman,
    ],
    [
      `Nunca había pensado en que hubo una ruta fija entre Asia y América durante siglos. Lo que más me
       sorprendió es cuánto de lo que damos por mexicano en realidad llegó cruzando el Pacífico, y que
       el comercio se sostenía con el metal que salía de las minas.`,
      galeon,
    ],
    [
      `La ruta arrancó en 1565 y aguantó hasta 1815, o sea 250 años seguidos. Cada viaje se llevaba
       entre 4 y 6 meses de ida y regresar podía tomar 8. Se movían como 50 toneladas por nao.`,
      galeon,
    ],
    [
      `Regla 1: luz en la mañana, los primeros 10 minutos afuera. Regla 2: café antes de las 2 de la
       tarde. Regla 3: cuarto frío en la noche. Regla 4: misma hora de dormir todos los días. Regla 5:
       si no me duermo en 20 minutos, me levanto.`,
      huberman,
    ],
    [`Me quedó claro que la luz de la mañana importa más de lo que creía y que el café tarda en irse.`, huberman],
  ];
  for (const [note, material] of legitimas) {
    assert.notEqual(verdict(note, material), "basura", `marcó como basura: ${note.slice(0, 50)}…`);
  }
});

test("el relleno evidente no cuenta", () => {
  const mash =
    "asdkjh qwlekj zxcvbn asdkjh qwerty zxcvb lkjhg mnbvc asdfgh qwerty zxcvbn lkjhgf mnbvcx asdfghj zxcvbnm lkjhgfd";
  assert.equal(verdict(`${mash} ${mash} ${mash}`, huberman), "basura");
  assert.equal(verdict("bien ".repeat(60), huberman), "basura");
  assert.equal(
    verdict("El video estuvo muy interesante y aprendí mucho de esto. ".repeat(8), huberman),
    "basura",
  );
});

test("copiar y pegar otra nota del mismo día no cuenta", () => {
  const nota = `Lo más importante que me llevo es que la luz de la mañana es la señal que ordena todo lo
    demás, y que el café no quita el cansancio sino que lo esconde unas horas para cobrártelo después.`;
  assert.equal(verdict(nota, huberman, [nota]), "basura");
});

test("copiar el material o escribir de otra cosa avisa, pero cuenta", () => {
  const copiada = `El galeón de Manila. Durante 250 años una sola ruta unió Asia con América y casi nadie
    la recuerda. Fue la primera globalización real y explica la influencia asiática en la costa mexicana.
    Qué se transportaba y en qué dirección. Por qué terminó la ruta.`;
  assert.equal(verdict(copiada, galeon), "aviso");

  const gimnasio = `Hoy fui al gimnasio y me tocó pierna. Hice sentadilla, prensa y desplantes, y terminé
    con bicicleta veinte minutos. Me sentí bien aunque mañana seguro no voy a poder caminar. Quiero ser
    constante esta vez y no dejarlo a las dos semanas.`;
  assert.equal(verdict(gimnasio, galeon), "aviso");
});

test("con material en inglés no se juzga el tema: escribir en español no es sospechoso", () => {
  const gimnasio = `Hoy fui al gimnasio y me tocó pierna. Hice sentadilla, prensa y desplantes, y terminé
    con bicicleta veinte minutos. Me sentí bien aunque mañana seguro no voy a poder caminar. Quiero ser
    constante esta vez y no dejarlo a las dos semanas.`;
  assert.equal(verdict(gimnasio, huberman), "ok");
});

test("sin material no hay nada contra qué comparar", () => {
  const suelta = `Estuve pensando en por qué dejo las cosas a medias y creo que es porque empiezo con
    demasiadas al mismo tiempo. Voy a probar con una sola cosa a la vez durante este mes.`;
  assert.equal(verdict(suelta, []), "ok");
});
