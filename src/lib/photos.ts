/**
 * Context photographs of Rodriguez (Montalban), Rizal, self-hosted under
 * public/images (sources and licences: public/images/ATTRIBUTION.md).
 * They show places, not projects: every caption says so.
 */
export interface Photo {
  /** Base path without width and extension: `${base}-720.webp`, `${base}-1280.webp`. */
  base: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

export const PHOTOS = {
  highway: {
    base: '/images/rodriguez-highway',
    width: 1280,
    height: 960,
    alt: 'Ang E. Rodriguez Highway sa Rodriguez, Rizal: malapad na kalsadang semento, may tricycle at mga tao sa gilid, at mga bundok sa likod.',
    caption: 'E. Rodriguez Highway, Rodriguez (Montalban), Marso 2018. Larawan ng lugar lamang; hindi ito larawan ng alinmang proyekto sa listahan.',
    credit: 'Judgefloro, Wikimedia Commons',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:1002Rodriguez,_Rizal_Barangays_Roads_Landmarks_01.jpg',
  },
  river: {
    base: '/images/marikina-river-san-rafael',
    width: 1280,
    height: 960,
    alt: 'Kuha mula sa itaas ng Ilog Marikina sa San Rafael, Rodriguez: ilog na dumadaan sa lambak sa pagitan ng mga bundok na may gubat.',
    caption: 'Ilog Marikina sa San Rafael, Rodriguez (Montalban), Hulyo 2026. Larawan ng lugar lamang; hindi ito larawan ng alinmang proyekto sa listahan.',
    credit: 'Patrickroque01, Wikimedia Commons',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Marikina_River,_San_Rafael_drone_(Rodriguez,_Rizal;_07-20-2026).jpg',
  },
} satisfies Record<string, Photo>;
