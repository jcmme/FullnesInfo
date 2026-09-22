"use client";

import { useEffect } from "react";

/**
 * En iPhone, si la página se encoge estando hasta abajo (por ejemplo, una lista de
 * resultados que se vacía) o al cerrar el teclado, Safari puede dejar la barra de
 * pestañas flotando a media pantalla. Un desplazamiento programático la reacomoda.
 */
export function ViewportGuard() {
  useEffect(() => {
    const viewport = window.visualViewport;
    let lastHeight = document.documentElement.scrollHeight;
    let lastViewport = viewport?.height ?? 0;
    let frame = 0;

    const resync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Hacia arriba y de regreso: hasta abajo, bajar 1 px no movería nada.
        const { scrollX, scrollY } = window;
        window.scrollTo(scrollX, Math.max(0, scrollY - 1));
        window.scrollTo(scrollX, scrollY);
      });
    };

    const observer = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight;
      if (height < lastHeight) resync();
      lastHeight = height;
    });
    observer.observe(document.body);

    // Solo cuando el área visible crece (el teclado se cierra); al abrirse, iOS acomoda el campo solo.
    const onViewport = () => {
      const height = viewport?.height ?? 0;
      if (height > lastViewport) resync();
      lastViewport = height;
    };
    viewport?.addEventListener("resize", onViewport);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport?.removeEventListener("resize", onViewport);
    };
  }, []);

  return null;
}
