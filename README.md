# Üzenőfal (Message Board)

Egyszerű üzenőfal alkalmazás, ahol bárki üzenetet hagyhat, listázhatja a meglévő üzeneteket, és törölheti azokat. Technikai próbafeladatként készült, AI-asszisztált fejlesztéssel.

## Technológiai stack

- **Next.js 14+** (App Router, TypeScript, Server Components & Server Actions)
- **Tailwind CSS** (utility-first styling)
- **shadcn/ui** (Button, Input, Card, Sonner)
- **lucide-react** (ikonok)
- **Supabase** (PostgreSQL adatbázis, Row Level Security)

## Lokális futtatás

### 1. Klónozás és telepítés

```bash
git clone <repo-url>
cd message-board
npm install
```

### 2. Supabase beállítás

1. Hozz létre egy ingyenes projektet a [Supabase](https://supabase.com) dashboardon.
2. Nyisd meg a **SQL Editor**-t, és másold be a `supabase-schema.sql` fájl tartalmát.
3. Futtasd a szkriptet — ez létrehozza a `messages` táblát az RLS policy-kkal.

### 3. Környezeti változók

Másold le a `.env.example` fájlt `.env.local` néven, és töltsd ki a Supabase projekt adataival:

```bash
cp .env.example .env.local
```

A szükséges értékeket a Supabase dashboard **Settings → API** oldalán találod:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key

### 4. Fejlesztői szerver indítása

```bash
npm run dev
```

Az alkalmazás elérhető a [http://localhost:3000](http://localhost:3000) címen.

## Deploy (Vercel)

A projekt közvetlenül deployolható Vercelre. A környezeti változókat a Vercel dashboard **Settings → Environment Variables** részen kell megadni.

## Funkciók

1. **Üzenet írása** — szöveges beviteli mező
2. **Mentés** — Supabase adatbázisba mentés, input validációval
3. **Listázás** — fordított időrendben, relatív időbélyeggel
4. **Törlés** — egy kattintással, megerősítés nélkül
