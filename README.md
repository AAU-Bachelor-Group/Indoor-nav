# Indoor Navigation

A bachelor's project for the Computer Science program at Aalborg University. The system is a fullstack PWA that lets users navigate indoors across the Copenhagen Campus. Navigation is powered by a graph-based A\* implementation, with 3D floor plan rendering handled through Three.js.

## Tech stack

| Area                 | Technology                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Framework            | [TanStack Start](https://tanstack.com/start) (React 19, SSR)                                  |
| Routing & data       | [TanStack Router](https://tanstack.com/router) + [TanStack Query](https://tanstack.com/query) |
| 3D rendering         | [Three.js](https://threejs.org/)                                                              |
| Database             | PostgreSQL with [PostGIS](https://postgis.net/) for spatial data                              |
| ORM                  | [Prisma](https://www.prisma.io/)                                                              |
| Auth                 | [Better Auth](https://www.better-auth.com/)                                                   |
| UI                   | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/)             |
| Validation           | [Zod](https://zod.dev/)                                                                       |
| Testing              | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)               |
| Linting & formatting | ESLint + Prettier                                                                             |

## Requirements

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)
- [Docker](https://www.docker.com/) with Compose

## Getting started

Install pnpm if you don't have it:

```bash
corepack enable && corepack prepare pnpm@latest --activate
```

Then install dependencies and copy the example env file:

```bash
pnpm install
cp .env.dist .env
```

The defaults in `.env.dist` work out of the box for local development. Before starting, make sure to set:

- `BETTER_AUTH_SECRET` — generate one with `openssl rand -base64 32`
- `ADMIN_PASSWORD` — the password used to log in to the admin panel

The ADMIN user is forcibly recreated on each startup, so you can change the password here as needed. Just make sure to restart the server after changing it.

Start the database, run migrations, and start the dev server:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

The app runs at `http://localhost:3000`.

## Working with Prisma

Run `pnpm db:generate` after pulling schema changes or editing `schema.prisma` — this regenerates the Prisma client we use to interact with the database.

Run `pnpm db:migrate` when you've made schema changes that need to be applied to the database, or when setting up locally for the first time.

> [!IMPORTANT]  
> Remember that pulling other branches might include schema changes. Always check the migration status after pulling and run pending migrations before starting the server.

Other useful commands:

| Command          | Description                             |
| ---------------- | --------------------------------------- |
| `pnpm db:studio` | Open Prisma Studio                      |
| `pnpm db:push`   | Push schema changes without a migration |
| `pnpm db:seed`   | Seed the database                       |

## Other scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `pnpm build`   | Production build         |
| `pnpm preview` | Preview production build |
| `pnpm test`    | Run tests                |
| `pnpm check`   | Format and lint          |
