import { headers } from "next/headers";
import { signOut } from "@/app/actions/auth";
import { PageHeader, Section } from "@/components/page-header";
import { RulesForm, TokenPanel } from "@/components/settings-forms";
import { getSession } from "@/lib/session";

export const metadata = { title: "Ajustes" };

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 footnote text-ink-2 marker:font-semibold marker:text-ink">
      {items.map((item, i) => (
        <li key={i} className="pl-1 text-pretty">
          {item}
        </li>
      ))}
    </ol>
  );
}

const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>;

export default async function SettingsPage() {
  const { profile, supabase } = await getSession();
  const { data: auth } = await supabase.auth.getClaims();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <>
      <PageHeader title="Ajustes" subtitle={typeof auth?.claims?.email === "string" ? auth.claims.email : undefined} />

      <Section title="Reglas del juego">
        <div className="card p-5">
          <RulesForm minWords={profile.min_words} freezes={profile.freezes_per_month} timezone={profile.timezone} />
          <p className="caption mt-4 text-ink-2">
            El día cierra a la {profile.cutoff_hour}:00 AM. Lo que registres antes de esa hora cuenta para el día anterior.
          </p>
        </div>
      </Section>

      <Section title="Atajos de iPhone">
        <div className="card space-y-6 p-5">
          <TokenPanel token={profile.api_token} origin={origin} />

          <div className="border-t hairline pt-5">
            <h3 className="headline">Guardar desde Instagram en dos toques</h3>
            <p className="footnote mb-3 mt-1 text-ink-2">
              En un reel: Compartir, luego “Guardar en Fullnes”. Escribes el nombre y la app busca el original en YouTube.
            </p>
            <Steps
              items={[
                <>Abre la app <B>Atajos</B>, toca <B>+</B> y nómbralo “Guardar en Fullnes”.</>,
                <>Toca el ícono de información <B>(i)</B> y activa <B>Mostrar en la hoja de compartir</B>. En tipos, deja solo <B>URL</B> y <B>Texto</B>.</>,
                <>Agrega <B>Solicitar entrada</B> (texto) con la pregunta “¿Cómo se llama o de qué trata?”.</>,
                <>Agrega <B>Obtener contenido de URL</B> con la URL para guardar. Método <B>POST</B>. Encabezado <B>Authorization</B> con valor “Bearer ” más tu token. Cuerpo <B>JSON</B>: clave <B>title</B> = Entrada proporcionada; clave <B>url</B> = Entrada del atajo.</>,
                <>Agrega <B>Obtener valor del diccionario</B> con la clave <B>message</B> y luego <B>Mostrar notificación</B> con ese valor.</>,
              ]}
            />
          </div>

          <div className="border-t hairline pt-5">
            <h3 className="headline">Recordatorio de las 8:15 AM</h3>
            <p className="footnote mb-3 mt-1 text-ink-2">Te dice si tienes ruletas, castigos o guardados pendientes, y cuánta racha está en juego.</p>
            <Steps
              items={[
                <>En Atajos ve a <B>Automatización</B>, toca <B>+</B> y elige <B>Hora del día</B>: 8:15, diariamente, <B>Ejecutar de inmediato</B>.</>,
                <>Agrega <B>Obtener contenido de URL</B> con la URL de estado (método GET) y el mismo encabezado <B>Authorization</B>.</>,
                <>Agrega <B>Obtener valor del diccionario</B> con la clave <B>message</B> y <B>Mostrar notificación</B>.</>,
                <>Repite a las 10:30 PM agregando <B>Si</B> la clave <B>done</B> es falsa: solo te avisa cuando falta tu registro.</>,
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Instalar en tus dispositivos">
        <div className="card p-5">
          <Steps
            items={[
              <><B>iPhone y iPad:</B> abre esta página en Safari, toca Compartir y luego <B>Agregar a pantalla de inicio</B>.</>,
              <><B>Mac:</B> en Safari, menú Archivo, <B>Agregar al Dock</B>.</>,
              <>Inicia sesión una vez en cada dispositivo; tus datos viven en la nube y se sincronizan solos.</>,
            ]}
          />
        </div>
      </Section>

      <Section title="Cuenta">
        <form action={signOut} className="card p-5">
          <button type="submit" className="btn btn-secondary">
            Cerrar sesión
          </button>
        </form>
      </Section>
    </>
  );
}
