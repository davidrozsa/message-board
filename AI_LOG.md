# AI Development Log — Message Board

## Projekt áttekintés

Egy egyszerű, publikus üzenőfal alkalmazás fejlesztése Next.js 14+ és Supabase stackkel. A feladat egy álláspályázathoz tartozó technikai próbafeladat, ahol a cég azt értékeli, hogyan használom az AI-t egy működő rendszer összerakására — nem a manuális kódolás a lényeg, hanem a problémamegoldás, az AI instrukciók minősége és az architekturális gondolkodás.

A projekt pontosan 4 funkciót valósít meg: üzenet írás, mentés, listázás és törlés. Nincs autentikáció, szerkesztés, képfeltöltés vagy bármilyen extra funkció — a cél, hogy ez a 4 funkció hibátlanul, produkcióra kész minőségben működjön.

---

## Architekturális döntések és indoklásuk

### Miért Server Actions API route-ok helyett?

A Next.js 14+ App Routerben a Server Actions a modern, ajánlott megközelítés mutációkhoz.

| Szempont | Server Actions | API Routes |
|----------|---------------|------------|
| Boilerplate | Minimális — `'use server'` direktíva, direkt hívás | Fájl létrehozás, fetch, JSON parse, error handling |
| Type safety | Natív — TypeScript típusok átjönnek kliens-szerver határon | Manuális — request/response type-ok külön definiálandók |
| Revalidáció | `revalidatePath('/')` — egy sor | Manuális cache invalidáció vagy `router.refresh()` |
| Adatfolyam | Egyirányú: kliens → action → DB → revalidate | Kliens → fetch → handler → DB → response → frissítés |

**Konkrét előny ebben a projektben:** A `createMessage` és `deleteMessage` action-ök 10-12 sorosak, és tartalmazzák a validációt, DB műveletet és cache invalidációt. API route-okkal ez ~3x annyi kód lenne, plusz kliens-oldali fetch wrapper-ek.

### Miért RLS policy auth nélküli rendszerben?

Tudatos, biztonságtudatos döntés — négy szempont indokolja:

1. **Defense in depth**: az adatbázis szinten is szabályozva van, ki mit tehet — nem csak az alkalmazás réteg felelős. Ha valaki közvetlenül a Supabase API-t hívná az anon key-jel, akkor is csak a policy-k által engedélyezett műveleteket végezhetné.
2. **Felkészülés skálázásra**: ha később auth kerül a rendszerbe, az RLS infrastruktúra már a helyén van — csak a policy-kat kell szigorítani (pl. `USING (auth.uid() = user_id)`).
3. **Supabase best practice**: a dokumentáció kifejezetten javasolja az RLS bekapcsolását minden production táblán. RLS nélkül bármely kliens bármit tehet az adatokkal.
4. **Explicit szándék**: a három policy (`SELECT`, `INSERT`, `DELETE` for `anon`) egyértelművé teszi, hogy a nyílt hozzáférés tudatos döntés, nem konfigurációs hiba. Nincs `UPDATE` policy — szándékos, mert szerkesztés funkció nincs a specifikációban.

### Miért shadcn/ui?

- **Copy-paste alapú**: a komponensek a projekt részévé válnak (`components/ui/`), nem egy node_modules-beli fekete doboz — teljes kontroll a testreszabás felett.
- **Tailwind-natív**: nem hoz be saját CSS rendszert, konzisztens marad a projekt stílusával.
- **Sonner integráció**: beépített toast komponens, ami a feladat UX követelményeit egy lépésben megoldja.
- **Minimalista**: csak a használt komponensek kerülnek be (button, input, card, sonner) — nincs felesleges kód a bundle-ben.

### Miért relatív időbélyeg külső könyvtár nélkül?

Saját `formatRelativeTime` helper (~20 sor) — a `date-fns` (~72kB) vagy `dayjs` (~12kB) behúzása egy egyszerű relatív idő kijelzéshez aránytalanul növelné a bundle méretet. A helper magyar nyelvű kimenettel dolgozik ("éppen most", "2 perce", "1 órája", "3 napja") és pontosan lefedi a feladat követelményeit.

### Miért NEM használtunk megerősítő dialógust a törlésnél?

**Tudatos UX döntés** a feladat specifikáció alapján. A feladatleírás egyértelműen "egy gombnyomásra" törölhető üzeneteket kér.

- **Éles, autentikált rendszerben** AlertDialog megerősítést alkalmaznék destruktív műveleteknél (shadcn/ui `AlertDialog` komponenssel), mert a felhasználó saját tartalmát védi, és a véletlen törlés visszafordíthatatlan.
- **Jelen kontextusban** az anonim, publikus jelleg miatt ez indokolatlan komplexitás — bárki írhat és törölhet, nincs "saját" tartalom koncepció.
- Az UX-et **loading state-ek** (spinner, opacity csökkentés) és **toast értesítések** ("Üzenet törölve.") teszik informatívvá a megerősítő dialógus hiányában is.

### Miért input validáció és trimmelés?

Ez nem extra funkció — ez a "Mentés" funkció helyes, felelős megvalósítása:

- A **Mentés gomb `disabled`**, amíg az input üres vagy csak whitespace-t tartalmaz — megakadályozza az üres üzenetek küldését.
- A `content.trim()` hívás **kliens és szerver oldalon is** megtörténik — defense in depth elv, mert a szerver action közvetlenül is hívható.
- Az **input `disabled` pending állapotban** — dupla submit védelem.

### Server vs. Client Component boundary

| Komponens | Típus | Indoklás |
|-----------|-------|----------|
| `page.tsx` | Server | Async data fetching — a Supabase lekérdezés szerveren fut |
| `message-list.tsx` | Server | Nincs interaktivitás, csak mapping és empty state |
| `message-form.tsx` | Client | `useState`, `useTransition`, `toast` |
| `message-card.tsx` | Client | Per-card `useTransition` delete, `toast`, event handler |

A `useTransition` választása a `useFormStatus` helyett: a `useFormStatus` egy `<form action>` child komponenst igényel. A `useTransition` egyszerűbb — közvetlenül a komponensben adja az `isPending` state-et. A delete gombnál különösen fontos, mert minden kártya saját, független loading state-et kap.

---

## Fejlesztési lépések

### 1. lépés — Tervezés és architektúra meghatározása

**Prompt (összefoglalva — a teljes prompt ~150 sor volt):**

> Szerepköröd: Senior Web Architect. Az egész projektet egyben rakd össze, produkcióra kész minőségben.
>
> Stack: Next.js 14+ (App Router, TypeScript), Tailwind CSS, shadcn/ui, lucide-react, Supabase.
>
> Funkciók (KIZÁRÓLAG): üzenet írás, mentés, listázás (newest first), törlés (egy kattintás, confirm nélkül).
>
> Architekturális elvárások: Server Components adatlekéréshez, Server Actions mutációkhoz, RLS policies, input validáció, loading states, toast (Sonner), empty state (MessageSquare), relatív idő (helper, nem lib), aria-label, .env.local gitignore-ban.
>
> A fájlstruktúrát pontosan megadtam: app/page.tsx, app/actions.ts, components/message-form.tsx, components/message-list.tsx, components/message-card.tsx, lib/supabase.ts, lib/utils.ts.

**Folyamat:** A Claude Code plan módban dolgozott:
1. Feltérképezte a projekt könyvtárat (üres volt)
2. Egy **Plan agent**-et indított, ami részletes implementációs tervet készített
3. A terv tartalmazta: scaffolding lépések, komponens határok (server/client), `useTransition` vs `useFormStatus` döntés, fájlok sorrendje

**Eredmény:** Jóváhagyott implementációs terv, ami alapján a fejlesztés elkezdődhetett.

### 2. lépés — Projekt inicializálás

**Végrehajtott parancsok:**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
npx shadcn@latest init -d
npx shadcn@latest add button input card sonner -y
npm install @supabase/supabase-js lucide-react
```

**Eredmény:** Működő Next.js projekt shadcn/ui komponensekkel, Supabase klienssel és Lucide ikonokkal. A React Compiler és AGENTS.md opciókra "No"-t választottam — nem szükségesek ehhez a projekthez.

### 3. lépés — Adatbázis séma és konfiguráció

**Létrehozott fájlok:**
- `supabase-schema.sql` — teljes SQL séma RLS policy-kkal és DESC indexszel
- `.env.example` — változónevek értékek nélkül (commitolva)
- `.env.local` — valós értékekkel (gitignore-ban, NEM commitolva)
- `.gitignore` javítva: `.env*` → `.env*.local` (hogy az `.env.example` tracked maradjon)

**Döntés:** A `created_at` oszlophoz DESC index, mert a fő lekérdezés mindig `ORDER BY created_at DESC` — ez a leggyakoribb query pattern optimalizálása.

### 4. lépés — Library réteg

**`lib/supabase.ts`:** Egyszerű `createClient` export. Nincs szükség komplex pattern-re (singleton factory, stb.) — a Supabase kliens könnyűsúlyú és stateless.

**`lib/utils.ts`:** A shadcn által generált `cn()` utility mellé hozzáadva a `formatRelativeTime()` helper. Magyar nyelvű output: "éppen most", "X perce", "X órája", "X napja", "X hete", "X hónapja", "X éve".

### 5. lépés — Server Actions

**`app/actions.ts`:** Két action: `createMessage` és `deleteMessage`.
- `createMessage`: trim + üres validáció → Supabase insert → `revalidatePath('/')` → return `{ success: true }` vagy `{ error: string }`
- `deleteMessage`: Supabase delete by UUID → `revalidatePath('/')` → same return type

### 6. lépés — UI komponensek

**`message-form.tsx` (Client):**
- Controlled input `useState`-tel
- `useTransition` a loading state-hez
- Disabled gomb, ha az input üres/whitespace vagy pending
- Toast értesítés sikerre/hibára
- Input `disabled` pending állapotban (dupla submit védelem)

**`message-card.tsx` (Client):**
- Per-card `useTransition` a delete loading-hoz
- `Trash2` ikon normál állapotban, `Loader2` spinner törlés közben
- `aria-label="Üzenet törlése"` accessibility
- `opacity-50` vizuális feedback törlés közben
- Hover: háttér szín változás + erősebb ring

**`message-list.tsx` (Server):**
- Empty state: `MessageSquare` ikon + "Még nincsenek üzenetek. Légy te az első, aki ír valamit!"
- Messages mapping: `MessageCard` komponensekre bontva

**`app/page.tsx` (Server):**
- Async Supabase query: `select('*').order('created_at', { ascending: false })`
- `force-dynamic` export a friss adatokért
- Responsive layout: `max-w-2xl mx-auto`

### 7. lépés — Layout és tipográfia

**`app/layout.tsx`:**
- `<Toaster richColors position="bottom-right" />` hozzáadva
- `lang="hu"` a magyar nyelvű tartalomhoz
- Metadata: "Üzenőfal" cím és magyar leírás
- Font csere: Geist → **Inter** (shadcn/ui konzisztencia, `next/font/google` self-hosting)

### 8. lépés — Hover állapotok finomítása

**Prompt:**
> Ellenőrizd, hogy a Mentés gomb, a Törlés ikon és az üzenet kártyák rendelkeznek-e hover állapottal. Ha nem, adj hozzá subtilis hover effectet.

**Eredmény:**
- **Kártyák**: `hover:bg-muted/40 hover:ring-foreground/25` — enyhe háttérszín és erősebb border hover-re
- **Input mező**: `hover:border-ring/50` — border erősödik focus előtt is
- **Mentés gomb**: shadcn beépített `hover:bg-primary/80` — már megvolt
- **Törlés ikon**: `hover:text-destructive` — piros szín hover-re — már megvolt

---

## Hibák és javítások

### Build hiba: Invalid supabaseUrl

**Probléma:** Az első `npm run build` hibát dobott: `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.` A `.env.local` placeholder értéke nem volt érvényes URL.

**Megoldás:** A placeholder-t érvényes URL formátumra cseréltem: `https://your-project-id.supabase.co`.

**Tanulság:** A Supabase kliens eager validation-t végez — érvényes HTTP(S) URL kell build time-ban is.

### .gitignore: .env.example kizárva volt

**Probléma:** A `create-next-app` `.env*` pattern-je az `.env.example`-t is kizárta.

**Megoldás:** `.env*` → `.env*.local` — csak a local fájlok kizárva, `.env.example` tracked marad.

---

## Tesztelés

Az AI-t szisztematikus tesztelésre is használtam — a Claude Code beépített böngésző preview funkcióján (MCP-n) keresztül automatizált funkcionális és vizuális ellenőrzéseket végeztem, kiegészítve kézi teszteléssel.

### AI-asszisztált funkcionális tesztek (böngésző preview)

Az AI a következő eszközöket használta a teszteléshez:
- `preview_screenshot` — vizuális ellenőrzés (layout, elemek megjelenése)
- `preview_inspect` — DOM és CSS tulajdonságok ellenőrzése (disabled state, opacity, className-ek)
- `preview_fill` — input mező kitöltése szöveggel
- `preview_click` — gombok kattintása (mentés, törlés)
- `preview_resize` — mobil reszponzivitás teszt (375x812 preset)

| Teszt | Eredmény | Módszer |
|-------|----------|--------|
| Mentés gomb disabled üres inputnál | OK | Inspector: `opacity: 0.5`, `pointer-events: none` |
| Mentés gomb engedélyezett szövegnél | OK | Inspector: `opacity: 1`, `pointer-events: auto` |
| Üzenet mentése | OK | Fill + click → screenshot: üzenet listában, toast megjelent |
| Listázás sorrendje | OK | Legújabb üzenet felül jelent meg |
| Törlés egy kattintással | OK | Click → screenshot: üzenet eltűnt, toast megjelent |
| Nincs confirm dialógus | OK | Törlés azonnal megtörténik |
| Empty state | OK | Összes üzenet törlése → MessageSquare ikon + szöveg |
| Relatív időbélyeg | OK | "éppen most" friss üzenetnél, "X perce" régebbiknél |
| Input kiürül mentés után | OK | Screenshot: üres input sikeres mentés után |
| Toast — sikeres mentés | OK | "Üzenet elmentve!" zöld toast, jobb alsó sarok |
| Toast — sikeres törlés | OK | "Üzenet törölve." zöld toast |
| Mobil reszponzivitás | OK | 375x812 viewport: szövegtördelés, layout rendben |
| Hover — kártyák | OK | Inspector: `hover:bg-muted/40` className jelen van |
| Hover — input | OK | `hover:border-ring/50` a className-ben |

### Kézi tesztelés (fejlesztő)

A fejlesztő személyesen is áttesztelte az alkalmazás összes funkcióját böngészőben:
- Supabase kapcsolat működik
- Üzenet mentés, listázás, törlés hibátlan
- Toast értesítések megjelennek
- Loading state-ek látszanak
- Mobil nézetben is használható

### Biztonsági ellenőrzés (kód review)

| Ellenőrzés | Eredmény |
|-----------|----------|
| RLS bekapcsolva | OK — `ALTER TABLE messages ENABLE ROW LEVEL SECURITY` |
| SELECT/INSERT/DELETE policy | OK — explicit anon hozzáférés |
| Nincs UPDATE policy | OK — szerkesztés szándékosan nincs |
| `.env.local` gitignore-ban | OK — `git check-ignore .env.local` megerősítve |
| `.env.example` repóban | OK — változónevek értékek nélkül |
| Server-side validáció | OK — `createMessage` trim + üres check |
| Nincs credential a commitban | OK — ellenőrizve push előtt |

---

## Összegzés

### Mi ment jól

- **Egyetlen átfogó prompt** — a részletes, strukturált instrukció egyetlen iterációban produkálta a teljes, működő alkalmazást. Nem volt szükség több körös javítgatásra az alapfunkciókhoz.
- **Tudatos komponens határok** — a server/client component boundary megtervezése (plan mód) elkerülte a "use client everywhere" anti-pattern-t. Csak 2 komponens kliens oldali (ahol interaktivitás van), a többi server component.
- **Server Actions** — API route-ok helyett ~30 sor backend logika, type-safe, automatikus revalidáció.
- **AI-asszisztált tesztelés** — a böngésző preview funkció lehetővé tette a szisztematikus, automatizált funkcionális tesztelést közvetlenül a fejlesztési folyamatban.
- **Inkrementális fejlesztés** — az AI minden lépést egyenként hajtott végre, minden fázis után ellenőrizhető volt az eredmény.

### Mit csinálnék másképp éles projektben

- **Supabase típusgenerálás**: `supabase gen types typescript` — type-safe database query-khez, a jelenlegi Supabase response `any` típusú.
- **Optimistic updates**: `useOptimistic` hook — gyorsabb UX, a szerver választ nem kell megvárni.
- **Error boundary**: React Error Boundary a page köré — graceful error handling szerver hibáknál.
- **Rate limiting**: Server-side rate limiting — spam védelem publikus, anonim rendszerben.
- **E2E tesztek**: Playwright — automatizálnám az itt kézzel végzett ellenőrzéseket.
- **Üzenet hossz limit**: `maxLength` az inputon + szerver-oldali validáció — megakadályozná a túl hosszú üzeneteket.
