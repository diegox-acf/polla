import Image from "next/image";
import mascotas from "@/public/mascotas.jpeg";

// Maple (Canadá), Zayu (México) y Clutch (USA) — mascotas oficiales del
// Mundial 2026. Asset local (el JPEG trae fondo blanco, de ahí el rounded).
export function Mascotas({ className = "h-28 w-auto" }: { className?: string }) {
  return (
    <Image
      src={mascotas}
      alt="Maple, Zayu y Clutch — mascotas del Mundial 2026"
      className={`${className} rounded-2xl shadow-sm`}
    />
  );
}
