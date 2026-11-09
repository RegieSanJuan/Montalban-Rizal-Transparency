# Montalban Transparency

**Pondo ng bayan. Malinaw sa lahat.**

Montalban Transparency is an independent citizen portal for exploring national budget allocations and DPWH project records associated with **Rodriguez (Montalban), Rizal**. It brings project details, maps, contractor records and source documents into one readable website, with a detailed overview and a **“Sa simpleng salita”** guide.

Run by Montalban citizens, on [BetterGov.ph data](https://budget.bettergov.ph/docs). This is **not an official government website**.

<p align="center">
  <img src="docs/images/montalban-transparency-poster.png" alt="Montalban Transparency: Pondo ng bayan. Malinaw sa lahat. Promotional poster showing the portal on desktop and mobile, with separately labelled DPWH and GAA snapshot counts." width="800">
</p>

[Download the poster](docs/images/montalban-transparency-poster.png). The poster is AI-generated promotional artwork; its device screens and phone map are illustrative, not evidence of a project’s location or status. Figures describe the November 8, 2026 snapshot and may change in future releases.

## What you can explore

| Page | What you will find |
| --- | --- |
| **Detailed overview** (`/`) | Separate summaries of DPWH records, enacted budgets and FY2027 proposals, with links to full details, officials and engineering offices. |
| **Sa simpleng salita** (`/para-sa-bayan`) | A citizen guide to the budget process, common terms, one worked record example and ways to check the sources. |
| **Project records** (`/contracts`) | Searchable DPWH records with reported status, budget fields, contractor names, dates and source links. Filters and open records can be shared through the URL. |
| **Project map** (`/mapa`) | Source-coordinate pins, filters and a matching list. Records without coordinates remain accessible separately. |
| **Contractors** (`/kontratista`) | Source-name profiles, associated records and yearly breakdowns. These groupings do not independently establish legal identity or wrongdoing. |
| **Enacted budgets** (`/gaa`) | GAA program/project families from 2020–2026, year and department filters, source references and exports. |
| **FY2027 proposals** (`/panukala-2027`) | NEP and House bill comparisons, uncertainty labels and links to document pages. |
| **About the data** (`/about`) | Scope, methodology, source notes, known gaps and the recorded update status. |

### Snapshot coverage

As retrieved on **November 8, 2026**:

- **242 included DPWH project/contract records**, spanning 2016–2026.
- **189 records with source coordinates** and **53 without coordinates**.
- **89 contractor source-name groups**; records without a contractor name are identified separately.
- **128 GAA program/project families**, spanning 2020–2026.
- **3 explicitly town-named FY2027 NEP records** in the current proposal view.

These are different units, sources and fiscal years. **Do not add their counts or amounts together.** The 189 mapped records are a subset of the 242 DPWH records. A GAA family is not necessarily one physical project.

## Understanding the numbers

- **NEP** is the Executive’s proposal; **GAA** is the enacted appropriation. Neither proves payment or completion.
- NEP and House bill amounts are compared, **never added**. A line present in only one version is a lead for checking, not proof of an insertion, deletion or irregularity.
- The DPWH **budget field**, bidding ceiling (**ABC**), award amount and actual expenditure are distinct. Missing values are shown as unknown, not zero.
- Shared engineering-office totals stay whole. They are **not presented as Montalban’s municipal allocation**.
- Coordinates and reported progress come from the source; they are not independent site verification.
- Officials are listed to explain their roles, not to imply that they requested or controlled a project.

### Coverage and freshness limits

This is a verified source subset, **not a complete inventory of every municipal project or every peso spent in Montalban**. Municipal LGU budgets, AIP/APP documents, provincial projects, other agencies and project-level disbursements are not comprehensively covered. Uncertain location matches remain separate from included totals.

The website uses saved GAA and DPWH snapshots alongside live Budget API requests. It shows retrieval dates and the latest recorded refresh attempt separately. A failed refresh keeps the last valid financial data; it does not mean that the data was successfully updated. **Automatic publication of fresh snapshots is not enabled by this repository’s Vercel configuration.** New API schemas, years or datasets require validation before release.

## Run locally

Requires **Node.js 22.12+** (or another version allowed by `package.json`).

```bash
git clone https://github.com/RegieSanJuan/Montalban-Rizal-Transparency.git
cd Montalban-Rizal-Transparency
npm ci
npm run dev
```

The configured development URL is **http://localhost:5132**. To use a different port:

```bash
npm run dev -- --port 5179
```

```bash
npm run build   # Type-check and build the static site into dist/
npm run lint    # Check the source
npm run check   # Reconcile configured Budget API queries; requires upstream access
```

`portal.config.ts` defines the municipality aliases and discovery scope. Location matching is conservative: a common name such as “Rodriguez” alone does not establish that a record belongs to Rodriguez, Rizal.

## Deploy to Vercel

1. Import this GitHub repository into Vercel.
2. Use the **Vite** framework preset, **`npm run build`** build command and **`dist`** output directory.
3. Deploy from **`main`**. The included `vercel.json` handles client-side routes.

No application database or API key is required for the public BetterGov API. Set `siteUrl` in `portal.config.ts` after choosing a public domain. Use `VITE_API_BASE` only when intentionally selecting another compatible Budget API host. See [deployment notes](docs/deploy.md).

## Technology and sources

React 19 · TypeScript · Vite · React Router · Leaflet / OpenStreetMap. Self-hosted typography: Bricolage Grotesque, DM Serif Display and Inter.

- [BetterGov Budget API documentation](https://budget.bettergov.ph/docs): enacted budgets, proposals and source-document references.
- [BetterGov DPWH mirror](https://github.com/bettergovph/api.dpwh): project/contract records originating from the DPWH transparency service.
- [OpenStreetMap](https://www.openstreetmap.org/copyright): map tiles and attribution. Choose an appropriate tile service before scaling beyond the public service’s usage policy.
- [Image sources and licences](public/images/ATTRIBUTION.md) and [font licence files](public/fonts).

Built on the open-source [BetterGov transparency portal](https://github.com/bettergovph/transparency-portal), adapted for Montalban. Local QA evidence, browser artifacts and internal planning notes are intentionally excluded from this repository.

## Licence

Application code: [MIT](LICENSE). Images, fonts and source datasets retain their respective licences, attribution requirements and upstream notices.
