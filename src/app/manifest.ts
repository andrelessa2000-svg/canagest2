import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CanaGest — Gestão de cana-de-açúcar",
    short_name: "CanaGest",
    description:
      "Cadastro de fazendas, talhões e registro de colheitas de cana-de-açúcar.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe3",
    theme_color: "#2f6b45",
    orientation: "portrait",
    categories: ["business", "productivity", "agriculture"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}