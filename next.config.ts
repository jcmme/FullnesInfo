import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Volver a una pestaña que viste hace menos de 30 s es instantáneo.
    // Las acciones que cambian datos (revalidatePath) invalidan este caché.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
