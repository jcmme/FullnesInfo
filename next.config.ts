import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Volver a una pestaña que viste hace menos de 30 s es instantáneo.
    // Las acciones que cambian datos (revalidatePath) invalidan este caché.
    staleTimes: { dynamic: 30 },
  },
  // La caja vive dentro de Descubrir: el acceso directo viejo del iPhone sigue sirviendo.
  async redirects() {
    return [{ source: "/caja", destination: "/descubrir", permanent: false }];
  },
};

export default nextConfig;
