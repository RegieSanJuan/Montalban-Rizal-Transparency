export interface CoverageStage {
  key: 'nep' | 'house' | 'gaa' | 'award' | 'spending';
  status: 'available' | 'partial' | 'unavailable';
  note: string;
  source?: string;
}
export const COVERAGE: {
  checkedAt: string;
  aliases: string[];
  stages: CoverageStage[];
  gaps: { label: string; detail: string; url?: string }[];
} = {
  checkedAt: '2026-11-08',
  aliases: ['Rodriguez, Rizal', 'Montalban, Rizal'],
  stages: [
    { key: 'nep', status: 'partial', note: 'Mga panukalang pambansang proyekto para sa FY2027 mula sa apat na dataset ng BetterGov. Itinutugma ang lokasyon batay sa pamagat; hindi ito ang buong pambansang budget na napupunta sa bayan.', source: 'https://budget.bettergov.ph/docs' },
    { key: 'house', status: 'partial', note: 'Paghahambing ng mga proyekto sa House bill para sa FY2027. Ang walang katapat na linya ay hindi awtomatikong kumpirmadong pagtanggal.', source: 'https://budget.bettergov.ph/docs' },
    { key: 'gaa', status: 'partial', note: 'Mga naisabatas na pambansang programa at proyekto, FY2020–2026, mula sa lahat ng 38 departamento. Hindi ito tala ng bayad o ng konstruksiyon.', source: 'https://budget.bettergov.ph/docs' },
    { key: 'award', status: 'partial', note: 'Mga project at contract record ng DPWH sa hiwalay na snapshot. Magkakaibang halaga ang budget field ng record, ang ABC at ang halaga ng award; walang kumpletong talaan ng award para sa bayan.', source: 'https://transparency.dpwh.gov.ph/' },
    { key: 'spending', status: 'unavailable', note: 'Walang na-verify na talaan ng aktuwal na paglabas ng pondo bawat proyekto sa portal. Hindi aktuwal na gastos ang budget o ang presyo ng kontrata.' },
  ],
  gaps: [
    { label: 'Budget at AIP ng pamahalaang bayan', detail: 'Nahanap ang opisyal na website ng bayan, pero hindi ito ma-access sa audit. Hindi pa nakuha ang budget, AIP, APP at mga ulat ng paggamit ng pondo na inilabas ng bayan; hindi ibig sabihing wala ang mga ito.', url: 'https://www.montalbanrodriguez.gov.ph/' },
    { label: 'Mga dokumento ng Full Disclosure Policy', detail: 'Nahanap ang portal ng mga dokumento ng DILG FDP v2, pero tinanggihan o naubusan ng oras ang koneksyon. Walang dokumento ng bayan na hinulaan.', url: 'https://fdppv2.dilg.gov.ph/documents' },
    { label: 'Mga proyekto ng probinsya at iba pang pinagmulan', detail: 'May mga abiso ng procurement ng probinsya para sa Montalban. Hindi pa buong nakalista ang mga proyekto ng probinsya at ng lahat ng iba pang ahensya; hiwalay ang mga ito sa registry ng DPWH.', url: 'https://www.rizalprovince.ph/pages/disclosure%20report.html' },
    { label: 'Na-audit na pananalapi', detail: 'May opisyal na index ng mga ulat ng COA, pero hindi makuha ang PDF sa audit na ito. Walang numerong pampinansyal na hinulaan.', url: 'https://www.coa.gov.ph/wpfd_file/rodriguez-annual-audit-report-2025/' },
    { label: 'Aktuwal na gastos at status ng proyekto', detail: 'Ang mga halaga sa panukala at sa naisabatas na GAA ay pahintulot na gumastos; hindi ito patunay ng bayad o ng pagkakatapos.' },
    { label: 'Shared at hindi tiyak na lokasyon', detail: 'Ipinapakita nang hiwalay ang mga proyektong sakop ang ilang bayan at ang mga pangalan ng ruta lamang. Hindi kasama ang buong halaga nila sa mga kabuuan ng bayan.' },
    { label: 'Snapshot ng mga record ng DPWH', detail: 'Itinutugma ayon sa pamagat at kung nasa loob ng hangganan ng bayan ang punto. Ang coordinates at iniulat na progreso ng pinagmulan ay hindi pagsusuri sa lugar. Ang petsa ng pagsuri ay oras ng pagkuha, hindi petsa ng huling update ng pinagmulan.', url: '/data/dpwh-contracts.json' },
    { label: 'Mga pangalan na wala sa title', detail: 'May mga paghahanap gamit ang mga lokal na pangalan, ngunit hindi nito mapapatunayang kumpleto ang lahat ng proyekto at ahensya.' },
  ],
};
