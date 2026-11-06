import { hash } from "bcryptjs";
import { PrismaClient, RolUsuario } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.LOCAMAD_DEMO_PASSWORD ??
    (process.env.NODE_ENV === "production" ? "" : "LocamadDemo2026!");
  if (password.length < 12) {
    throw new Error("LOCAMAD_DEMO_PASSWORD debe tener al menos 12 caracteres.");
  }

  const passwordHash = await hash(password, 12);
  await prisma.usuario.upsert({
    where: { email: "produccion@locamad.es" },
    update: {
      nombre: "Producción LocaMad",
      password: passwordHash,
      rol: RolUsuario.PRODUCCION,
    },
    create: {
      email: "produccion@locamad.es",
      nombre: "Producción LocaMad",
      password: passwordHash,
      rol: RolUsuario.PRODUCCION,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());