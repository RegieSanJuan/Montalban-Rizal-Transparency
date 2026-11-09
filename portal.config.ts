/**
 * This portal's configuration: the only file a fork needs to edit.
 * What each field means: src/config.ts. Generate one with `npm run setup`;
 * check it against the live API with `npm run check`.
 *
 * Title matches are a starting scope, not a complete municipal inventory.
 * Shared DPWH office budgets are not attributed entirely to Montalban.
 */
import { defineConfig } from './src/config';

export default defineConfig({
  id: 'montalban-rizal',
  kind: 'municipality',
  name: 'Montalban, Rizal Transparency Portal',
  shortName: 'Montalban',
  operator: { name: 'Regie San Juan' },
  buildYourOwnStrip: false,
  scope: {
    locationPolicy: 'montalban-rizal',
    districts: ['leg:rizal:4th'],
    places: [
      { label: 'Rodriguez, Rizal', q: 'Rodriguez', region: 'IV-A' },
      { label: 'Montalban, Rizal', q: 'Montalban', region: 'IV-A' },
    ],
    // Distinctive names catch titles that omit the municipal name. These remain
    // review candidates unless the title itself confirms the municipality.
    discoveryQueries: [
      { label: 'Kasiglahan', q: 'Kasiglahan', region: 'IV-A' },
      { label: 'Macabud', q: 'Macabud', region: 'IV-A' },
      { label: 'Mascap', q: 'Mascap', region: 'IV-A' },
      { label: 'Puray', q: 'Puray', region: 'IV-A' },
      { label: 'Parawagan', q: 'Parawagan', region: 'IV-A' },
      { label: 'Lukutang', q: 'Lukutang', region: 'IV-A' },
      { label: 'Pakiing', q: 'Pakiing', region: 'IV-A' },
    ],
    exclude: [],
  },
  reporting: { enabled: false },
});
