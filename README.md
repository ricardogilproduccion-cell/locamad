This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Acceso y roles

LocaMad usa NextAuth con credenciales y contraseñas almacenadas como hash bcrypt. Los roles `PRODUCCION` y `LOCALIZACIONES` pueden crear localizaciones y gestionar fotografías; `INVITADO` puede buscar, ver fichas e imprimir dossiers.

Para crear o actualizar la cuenta de prueba sin borrar el catálogo, ejecuta `npm run seed:auth`. En desarrollo usa `produccion@locamad.es` con la contraseña `LocamadDemo2026!`; puedes sobrescribirla con `LOCAMAD_DEMO_PASSWORD` antes de ejecutar el seed. En producción, configura esa variable explícitamente y define `NEXTAUTH_SECRET` y `NEXTAUTH_URL` en el entorno de despliegue.

## Búsqueda global

El buscador principal permite consultar el catálogo y los lugares de OpenStreetMap. La búsqueda externa se realiza al enviar el formulario (no hay autocompletado) mediante Nominatim, con Madrid como zona predeterminada, una consulta por segundo como máximo por proceso y atribución visible a OpenStreetMap. El catálogo actual representa título, categoría y descripción mediante los campos Prisma `nombre`, `tipoEspacio` y `estilo`, respectivamente; la búsqueda también incluye dirección, municipio y barrio.

`GET /api/localizaciones?q=...` busca en el catálogo. `GET /api/scouting/search?q=...&zona=Madrid` busca negocios y lugares cercanos. Añadir un resultado externo usa `POST /api/localizaciones` y requiere una sesión con rol `PRODUCCION` o `LOCALIZACIONES`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
