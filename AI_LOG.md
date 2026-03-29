# AI Development Log — Message Board

## Projekt áttekintés

Egy egyszerű, publikus üzenőfal alkalmazás fejlesztése Next.js 14+ és Supabase stackkel. A cél 4 funkció (üzenet írás, mentés, listázás, törlés) produkcióra kész megvalósítása, ahol a hangsúly az architekturális gondolkodáson, a minőségi AI instrukciók készítésén és a tudatos döntéshozatalon van. A projekt egy álláspályázathoz tartozó technikai próbafeladatként készült.

---

## Induló prompt

Az alábbi promptot használtam a teljes projekt generálásához (szó szerinti idézet):

> **Kontextus:**
> Ez egy álláspályázathoz tartozó technikai próbafeladat. A cég azt értékeli, hogyan használom az AI-t egy működő rendszer összerakására. Nem a manuális kódolás a lényeg, hanem a problémamegoldás, az AI instrukciók minősége, és az architekturális gondolkodás. A promptjaimat és döntéseimet egy AI_LOG.md fájlban dokumentálnom kell — ez az egyik legfontosabb deliverable.
>
> **Szerepköröd:** Senior Web Architect. Kérlek, az egész projektet egyben rakd össze, produkcióra kész minőségben.
>
> **Technológiai Stack:** Next.js 14+ (App Router, TypeScript), Tailwind CSS, shadcn/ui (button, input, card, toast/sonner), lucide-react (Trash2, MessageSquare), Supabase (ingyenes tier), Vercel deploy.
>
> **Funkcionális követelmények (KIZÁRÓLAG ezek):**
> 1. Üzenet írása — szöveges beviteli mező
> 2. Mentés — Supabase adatbázisba mentés
> 3. Listázás — fordított időrendben (legújabb felül)
> 4. Törlés — egy kattintással, megerősítő dialógus nélkül
>
> **Architekturális elvárások:** Server Components adatlekéréshez, Server Actions mutációkhoz (`revalidatePath('/')`), RLS bekapcsolva anonim policy-kkal, input validáció (disabled gomb üres inputnál, trimmelés), loading state-ek, toast értesítések (Sonner), empty state (MessageSquare ikon), relatív időbélyeg (helper függvény, külső lib nélkül), accessibility (`aria-label`), `.env.local` gitignore-ban.
>
> **Projekt struktúra:** Részletes fájl-struktúra megadva: `app/page.tsx` (Server Component), `app/actions.ts` (Server Actions), `components/message-form.tsx` (Client), `components/message-list.tsx`, `components/message-card.tsx` (Client), `lib/supabase.ts`, `lib/utils.ts`, `supabase-schema.sql`, `.env.example`, `AI_LOG.md`, `README.md`.

A prompt tudatosan volt ennyire részletes: egyetlen, átfogó instrukciót adtam, ami lefedi az összes technológiai, architekturális és UX döntést. Ez lehetővé tette, hogy az AI egyetlen iterációban, konzisztens minőségben hozza létre a teljes projektet.

---

## Architekturális döntések és indoklásuk

### Miért Server Actions API route-ok helyett?

A Next.js 14+ App Routerben a Server Actions a modern megközelítés mutációkhoz. Az API route-okkal összehasonlítva:

| Szempont | Server Actions | API Routes |
|----------|---------------|------------|
| Boilerplate | Minimális — `'use server'` direktíva, direkt hívás | Fájl létrehozás, fetch, JSON parse, error handling |
| Type safety | Natív — TypeScript típusok átjönnek kliens-szerver határon | Manuális — request/response type-ok külön definiálandók |
| Revalidáció | `revalidatePath('/')` — egy sor | Manuális cache invalidáció vagy `router.refresh()` |
| Adatfolyam | Egyirányú, átlátható: kliens → action → DB → revalidate | Kliens → fetch → route handler → DB → response → kliens frissítés |

**Konkrét előny ebben a projektben:** A `createMessage` és `deleteMessage` action-ök 10-12 sorosak, és tartalmazzák a validációt, DB műveletet és cache invalidációt. API route-okkal ez ~3x annyi kód lenne, plusz kliens-oldali fetch wrapper-ek.

### Miért shadcn/ui?

- **Copy-paste alapú**: a komponensek a projekt részévé válnak (`components/ui/`), nem egy node_modules-beli fekete doboz — teljes kontroll a testreszabás felett.
- **Tailwind-natív**: nem hoz be saját CSS rendszert, konzisztens marad a projekt stílusával.
- **Sonner integráció**: beépített toast komponens, ami a feladat UX követelményeit (sikeres mentés/törlés, hibaüzenetek) egy lépésben megoldja.
- **Minimalista**: csak a használt komponensek kerülnek be (button, input, card, sonner) — nincs felesleges kód a bundle-ben.
- **Inter font konzisztencia**: a shadcn/ui alapértelmezett tipográfiája Inter, amit a projektben is alkalmazunk a vizuális egységesség érdekében.

### Miért RLS policy auth nélküli rendszerben?

Ez tudatos, biztonságtudatos döntés volt. Bár a rendszerben nincs autentikáció, az RLS bekapcsolása és az explicit anon policy-k definiálása több szempontot szolgál:

1. **Defense in depth**: az adatbázis szinten is szabályozva van, ki mit tehet — nem csak az alkalmazás réteg felelős a hozzáférés-szabályozásért. Ha valaki közvetlenül a Supabase API-t hívná az anon key-jel, akkor is csak a policy-k által engedélyezett műveleteket végezhetné.
2. **Felkészülés skálázásra**: ha később auth kerül a rendszerbe, az RLS infrastruktúra már a helyén van — csak a policy-kat kell szigorítani (pl. `USING (auth.uid() = user_id)`), nem kell az egész biztonsági réteget nulláról felépíteni.
3. **Supabase best practice**: Supabase dokumentáció kifejezetten javasolja az RLS bekapcsolását minden production táblán. RLS nélkül bármely kliens bármit tehet az adatokkal, amit az anon key nem korlátoz — ez nem elfogadható biztonsági szint.
4. **Explicit szándék**: a három policy (`SELECT`, `INSERT`, `DELETE` for `anon`) egyértelművé teszi, hogy a nyílt hozzáférés tudatos döntés, nem konfigurációs hiba. Nincs `UPDATE` policy — ez szándékos, mert szerkesztés funkció nincs a specifikációban.

### Miért NEM használtunk megerősítő dialógust a törlésnél?

Tudatos döntés a feladat specifikáció alapján. A feladatleírás egyértelműen "egy gombnyomásra" törölhető üzeneteket kér. A döntés mögötti trade-off mérlegelés:

- **Éles, autentikált rendszerben** AlertDialog megerősítést alkalmaznék destruktív műveleteknél (shadcn/ui `AlertDialog` komponenssel), mert a felhasználó saját tartalmát védi, és a véletlen törlés visszafordíthatatlan.
- **Jelen kontextusban** az anonim, publikus jelleg miatt ez indokolatlan komplexitás lenne — bárki írhat és törölhet, nincs "saját" tartalom koncepció, az üzenetek nem személyesek.
- Az UX-et **loading state-ek** (spinner, opacity csökkentés) és **toast értesítések** ("Üzenet törölve.") teszik informatívvá a megerősítő dialógus hiányában is — a felhasználó egyértelmű visszajelzést kap a művelet eredményéről.

### Server vs. Client Component boundary

| Komponens | Típus | Indoklás |
|-----------|-------|----------|
| `page.tsx` | Server | Async data fetching — a Supabase lekérdezés a szerveren fut, gyorsabb és SEO-barát |
| `message-list.tsx` | Server | Nincs interaktivitás, csak mapping és empty state — nem kell kliens JS |
| `message-form.tsx` | Client | `useState` (controlled input), `useTransition` (loading state), `toast` |
| `message-card.tsx` | Client | `useTransition` (per-card delete loading), `toast`, event handler |

A `useTransition` választása a `useFormStatus` helyett: a `useFormStatus` egy `<form action>` child komponenst igényel, ami azt jelentené, hogy a submit gombot külön komponensbe kellene kiszervezni. A `useTransition` egyszerűbb — közvetlenül a komponensben adja az `isPending` state-et, nincs szükség extra wrapper-re. A delete gombnál ez különösen fontos, mert minden kártya saját, független loading state-et kap.

### Relatív időformázás külső könyvtár nélkül

Saját `formatRelativeTime` helper — a `date-fns` (~72kB) vagy `dayjs` (~12kB) behúzása egy egyszerű relatív idő kijelzéshez aránytalanul növelné a bundle méretet. A helper ~20 sor, magyar nyelvű kimenettel ("éppen most", "2 perce", "1 órája", "3 napja"), és pontosan lefedi a feladat követelményeit.

### Inter font választás

A shadcn/ui ökoszisztéma az Inter fontot használja alapértelmezettként. A Next.js scaffolding Geist fontot hozott létre, amit Interre cseréltem a vizuális konzisztencia érdekében. Az Inter a `next/font/google`-ön keresztül van betöltve, ami automatikus self-hostingot és optimalizálást biztosít (nincs külső font request, nincs layout shift).

---

## Fejlesztési lépések

### 1. Tervezés és architektúra meghatározása

**Használt prompt:** Az induló prompt (lásd fent) egy átfogó instrukció volt, ami a teljes projektet specifikálta.

**Folyamat:** A Claude Code plan módban dolgozott:
1. Feltérképezte a projekt könyvtárat (üres volt)
2. Egy **Explore agent**-et indított a kontextus megértéséhez
3. Egy **Plan agent**-et indított, ami részletes implementációs tervet készített
4. A terv tartalmazta: scaffolding lépések, komponens határok (server/client), `useTransition` vs `useFormStatus` döntés, fájlok létrehozási sorrendje

**Eredmény:** Jóváhagyott implementációs terv, ami alapján a fejlesztés elkezdődhetett.

### 2. Projekt inicializálás

**Végrehajtott lépések:**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
npx shadcn@latest init -d
npx shadcn@latest add button input card sonner -y
npm install @supabase/supabase-js lucide-react
```

**Eredmény:** Működő Next.js projekt shadcn/ui komponensekkel, Supabase klienssel és Lucide ikonokkal. A React Compiler és AGENTS.md opciókra "No"-t választottam — nem szükségesek ehhez a projekthez.

### 3. Adatbázis séma és konfiguráció

**Létrehozott fájlok:**
- `supabase-schema.sql` — teljes SQL séma RLS policy-kkal és DESC indexszel
- `.env.example` — változónevek értékek nélkül (commitolva a repóba)
- `.env.local` — valós értékekkel (gitignore-ban, NEM commitolva)

**Döntés:** A `created_at` oszlophoz DESC index, mert a fő lekérdezés mindig `ORDER BY created_at DESC` — ez a leggyakoribb query pattern optimalizálása.

### 4. Library réteg

**`lib/supabase.ts`:** Egyszerű `createClient` export. Nincs szükség komplex pattern-re (singleton factory, stb.) — a Supabase kliens könnyűsúlyú és stateless.

**`lib/utils.ts`:** A shadcn által generált `cn()` utility mellé hozzáadva a `formatRelativeTime()` helper. Magyar nyelvű output: "éppen most", "X perce", "X órája", "X napja", "X hete", "X hónapja", "X éve".

### 5. Server Actions

**`app/actions.ts`:** Két action: `createMessage` és `deleteMessage`.
- `createMessage`: trim + üres validáció, Supabase insert, `revalidatePath('/')`
- `deleteMessage`: Supabase delete by UUID, `revalidatePath('/')`
- Egységes return type: `{ success: true }` vagy `{ error: string }`

### 6. UI komponensek

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
- Hover state: a törlés ikon piros (destructive) színre vált

**`message-list.tsx` (Server):**
- Empty state: `MessageSquare` ikon + "Még nincsenek üzenetek. Légy te az első, aki ír valamit!"
- Messages mapping: `MessageCard` komponensekre bontva

**`app/page.tsx` (Server):**
- Async Supabase query: `select('*').order('created_at', { ascending: false })`
- `force-dynamic` export a friss adatokért
- Responsive layout: `max-w-2xl mx-auto`

### 7. Layout és font módosítások

**`app/layout.tsx`:**
- `<Toaster richColors position="bottom-right" />` hozzáadva
- `lang="hu"` a magyar nyelvű tartalomhoz
- Metadata frissítve: "Üzenőfal" cím és magyar leírás
- Font csere: Geist → **Inter** (shadcn/ui konzisztencia)

---

## Hibák és javítások

### Build hiba: Invalid supabaseUrl

**Probléma:** Az első `npm run build` hibát dobott: `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.` A `.env.local` fájlban lévő placeholder érték (`your-supabase-url-here`) nem volt érvényes URL, és a Supabase kliens a module-level inicializáláskor (build time) azonnal validálja az URL formátumot.

**Megoldás:** A `.env.local` placeholder értékét érvényes URL formátumra cseréltem: `https://your-project-id.supabase.co`. Ez lehetővé teszi a build sikeres futását anélkül, hogy valódi Supabase credentials kellene. A tényleges értékeket a fejlesztő a saját Supabase projektjéből tölti ki.

**Tanulság:** A Supabase kliens eager validation-t végez — nem elég, ha az URL "valamilyen string", érvényes HTTP(S) URL kell build time-ban is. Éles projektben ezt environment-specifikus build konfigurációval kezelnénk.

### .gitignore javítás: .env.example kizárva volt

**Probléma:** A `create-next-app` által generált `.gitignore` fájlban `.env*` pattern szerepelt, ami az `.env.example` fájlt is kizárta a verziókezelésből — pedig annak a repóban kellene lennie, hogy más fejlesztők tudják, milyen env változókra van szükség.

**Megoldás:** A pattern-t `.env*.local`-ra módosítottam, ami csak a `.env.local` és `.env.*.local` fájlokat zárja ki, de az `.env.example` tracked marad.

---

## Ellenőrzés és tesztelés

A fejlesztés befejezése után szisztematikus ellenőrzést végeztünk — az AI és a fejlesztő együtt tesztelte az alkalmazást.

### Funkcionális tesztek (AI-asszisztált, böngészőben)

| Teszt | Eredmény | Módszer |
|-------|----------|--------|
| Üzenet beírása | OK | Input mező kitöltése, szöveg megjelenik |
| Mentés gomb disabled üres inputnál | OK | `opacity: 0.5`, `pointer-events: none` ellenőrzés |
| Mentés gomb engedélyezett szövegnél | OK | `opacity: 1`, `pointer-events: auto` |
| Üzenet mentése | OK | Kattintás → üzenet megjelenik a listában, toast: "Üzenet elmentve!" |
| Listázás fordított időrendben | OK | Legújabb üzenet felül, régebbiek alul |
| Törlés egy kattintással | OK | Trash2 ikon kattintás → üzenet eltűnik, toast: "Üzenet törölve." |
| Nincs megerősítő dialógus | OK | Törlés azonnal megtörténik |
| Empty state megjelenítés | OK | Összes üzenet törlése → MessageSquare ikon + szöveg |
| Relatív időbélyeg | OK | "éppen most", "X perce" megfelelően jelenik meg |
| Input kiürül mentés után | OK | Sikeres mentés után az input mező üres |

### Mobil reszponzivitás teszt

A viewport-ot 375x812-re (mobile preset) átméretezve tesztelve:
- Szövegtördelés hosszú üzeneteknél: OK (`break-words`)
- Input + Mentés gomb elrendezés: OK (egymás mellett maradnak)
- Kártya szélességek: OK (teljes szélesség)

### Biztonsági ellenőrzés (kód átnézés)

| Ellenőrzés | Eredmény |
|-----------|----------|
| RLS bekapcsolva | OK — `ALTER TABLE messages ENABLE ROW LEVEL SECURITY` |
| SELECT/INSERT/DELETE policy-k | OK — explicit anon hozzáférés |
| Nincs UPDATE policy | OK — szerkesztés szándékosan nincs engedélyezve |
| `.env.local` gitignore-ban | OK — `.env*.local` pattern |
| `.env.example` repóban | OK — változónevek értékek nélkül |
| Server-side validáció | OK — `createMessage` trim + üres check |

### Fejlesztő általi kézi teszt

A fejlesztő személyesen is áttesztelte az alkalmazás összes funkcióját és rendben találta. A Supabase kapcsolat, az üzenet mentés/listázás/törlés, a toast értesítések és a loading state-ek mind megfelelően működtek.

---

## Összegzés

### Mi ment jól
- A részletes, strukturált prompt egyetlen iterációban produkálta a teljes, működő alkalmazást — nem volt szükség több körös iterációra az alapfunkciókhoz.
- A server/client component boundary tudatos megtervezése (plan mód) elkerülte a tipikus "use client everywhere" anti-pattern-t — csak 2 komponens kliens oldali (ahol interaktivitás van), a többi server component.
- A Server Actions használata API route-ok helyett egyszerűbb és karbantarthatóbb kódot eredményezett — a teljes backend logika ~30 sor.
- Az AI-asszisztált böngésző-tesztelés (screenshot + inspect + click) hatékonyan fedte le a funkcionális, reszponzivitási és UX ellenőrzéseket.

### Mit csinálnék másképp
- **Supabase típusok generálása**: Éles projektben a `supabase gen types` parancsot használnám type-safe database query-khez — jelenleg a Supabase response `any` típusú.
- **Optimistic updates**: A jelenlegi megoldás megvárja a szerver választ — optimistic update-tel az UX gyorsabb lenne (a `useOptimistic` hookkal).
- **Error boundary**: Éles rendszerben React Error Boundary-t tennék a page köré a graceful error handling-hez.
- **Rate limiting**: Publikus, anonim rendszerben server-side rate limiting védelmet adna spam ellen.
- **E2E tesztek**: Playwright vagy Cypress tesztekkel automatizálnám az itt kézzel végzett ellenőrzéseket.
