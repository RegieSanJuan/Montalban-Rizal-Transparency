import { useState } from 'react';
import { usePortal } from '../lib/portal-context';

/**
 * The two elected officials a Montalban resident is most likely to ask about,
 * and the roles they do and do not have. Identities were checked against
 * official sources on November 9, 2026 (public/images/ATTRIBUTION.md):
 * - Mayor: DTI Region 4-A news, July 29, 2026, and the DTI CMCI profile.
 * - Representative: the BetterGov Budget API district record and the House's
 *   official 20th Congress portrait.
 */
const CHECKED = 'Nobyembre 9, 2026';
const MAYOR_SOURCE = 'https://www.dti.gov.ph/dti-regions/dti-region-4a/dti-region-4a-news/dti-rizal-urges-msmes-embrace-halal-certification-inclusive-tourism-ready-growth';
const MAYOR_CMCI = 'https://cmci.dti.gov.ph/lgu-profile.php?lgu=Rodriguez';
const MAYOR_PHOTO_SOURCE = 'https://www.dti.gov.ph/dti-archives/dti-regional-archived/dti-region-4a-news-regional-archived/dti-dti-rizal-pays-a-courtesy-call-to-montalban-municipal-mayor';
const REP_FALLBACK_URL = 'https://www.congress.gov.ph/house-members/view/L043';
const REP_PHOTO_SOURCE = 'https://commons.wikimedia.org/wiki/File:Rep._Dennis_Hernandez_(20th_Congress).jpg';

/** A portrait that falls back to initials if the file cannot load. */
function Portrait({ src, alt, initials, width, height }: { src: string; alt: string; initials: string; width: number; height: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="official-mark" role="img" aria-label={`${alt} (hindi ma-load ang larawan)`}>{initials}</div>;
  return <img className="official-photo" src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export default function LocalOfficials({ id = 'mga-opisyal' }: { id?: string }) {
  const { districts } = usePortal();
  const representative = districts.status === 'ready'
    ? districts.value.find((d) => d.data.id === 'leg:rizal:4th')?.data.representative
    : null;
  const repName = representative?.name ?? 'Dennis “Tom” L. Hernandez';
  return (
    <section className="section officials" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="section-h">Mga opisyal. <em>Magkakaibang papel.</em></h2>
      <p className="section-intro">
        Para malaman kung sino ang dapat tanungin. Ang pagkakalista rito ay hindi patunay na sila ang humiling, nagpondo o
        may kontrol sa alinmang proyekto. Mga pambansang ahensya, gaya ng DPWH sa pamamagitan ng district engineering office,
        ang nagpapatupad ng mga proyektong nasa portal.
      </p>
      <div className="officials-grid">
        <article className="official">
          <figure className="official-figure">
            <Portrait
              src="/images/ronnie-evangelista-dti-2022.webp"
              alt="Si Mayor Ronnie S. Evangelista sa kanyang tanggapan, sa larawan ng DTI Rizal noong Hulyo 2022"
              initials="RE"
              width={189}
              height={252}
            />
          </figure>
          <div className="official-copy">
            <h3>Ronnie S. Evangelista</h3>
            <p className="official-role">Punong Bayan (Municipal Mayor) · Pamahalaang Bayan ng Rodriguez</p>
            <p>Namumuno sa pamahalaang bayan. Hiwalay ang budget ng LGU sa pambansang budget na ipinapakita rito.</p>
            <p className="official-source">
              Pinagmulan: <a href={MAYOR_SOURCE} target="_blank" rel="noopener">DTI Rizal, Hulyo 29, 2026 <span aria-hidden="true">↗</span></a>
              {' · '}<a href={MAYOR_CMCI} target="_blank" rel="noopener">DTI CMCI <span aria-hidden="true">↗</span></a>
            </p>
            <p className="official-credit">
              Larawan: kuha ng <a href={MAYOR_PHOTO_SOURCE} target="_blank" rel="noopener">DTI Rizal noong Hulyo 19, 2022</a> (courtesy
              call), naka-crop. Hindi ito opisyal na larawan ng kasalukuyang termino.
            </p>
          </div>
        </article>
        <article className="official">
          <figure className="official-figure">
            <Portrait src="/images/dennis-hernandez.jpg" alt={`Opisyal na larawan ni ${repName}, 20th Congress`} initials="DH" width={288} height={387} />
          </figure>
          <div className="official-copy">
            <h3>{repName}</h3>
            <p className="official-role">Kinatawan (Representative), Rizal 4th District · Kapulungan ng mga Kinatawan</p>
            <p>Bumoboto sa pambansang budget sa Kamara. Para sa pagpapatupad ng proyekto, ang ahensya ang dapat tingnan.</p>
            <p className="official-source">
              Pinagmulan: <a href="https://budget.bettergov.ph/api/v1/hgab/2027/districts/leg%3Arizal%3A4th" target="_blank" rel="noopener">BetterGov Budget API <span aria-hidden="true">↗</span></a>
              {' · '}<a href={representative?.profile_url ?? REP_FALLBACK_URL} target="_blank" rel="noopener">Profile sa Kapulungan <span aria-hidden="true">↗</span></a>
            </p>
            <p className="official-credit">
              Larawan: <a href={REP_PHOTO_SOURCE} target="_blank" rel="noopener">Kapulungan ng mga Kinatawan, 20th Congress</a>,{' '}
              <span lang="en">public domain</span>.
            </p>
          </div>
        </article>
      </div>
      <p className="fine">
        Sinuri ang mga pangalan at pinagmulan noong {CHECKED}. Hindi mabuksan ang website ng Kapulungan sa pagsusuring iyon
        (hinarang ng security check nito), kaya ang BetterGov Budget API at ang opisyal na larawan ang batayan ng kinatawan.
        Walang nakalistang pangalan ng opisyal ng DPWH dito: ang opisina, hindi ang tao, ang nakatala sa budget.
      </p>
    </section>
  );
}
