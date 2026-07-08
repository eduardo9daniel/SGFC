/**
 * components/certificados/CertificateCFDR.jsx
 *
 * Certificado A4 landscape do Centro de Formação Darcy Ribeiro.
 * Inclui QR Code de autenticidade no canto inferior direito.
 *
 * Props:
 *  participantName  — Nome completo do participante
 *  eventType        — Tipo do evento (ex.: "Curso", "Oficina", "Palestra")
 *  eventTitle       — Título do evento
 *  day              — Dia (ex.: "15")
 *  month            — Mês por extenso (ex.: "março")
 *  year             — Ano (ex.: "2025")
 *  workloadHours    — Carga horária (ex.: "40")
 *  qrCodeDataUrl    — data:image/png;base64,... do QR Code (opcional)
 *  hashUnico        — hash_unico do certificado para exibir abaixo do QR
 *  logoSrc          — override da logo (opcional)
 *  signatures       — Array de { name, role } para assinaturas (opcional)
 */

import { useEffect, useRef } from 'react';
import styles from './CertificateCFDR.module.css';

// ─── Assinantes padrão ────────────────────────────────────────────────────
const DEFAULT_SIGNATURES = [
  { name: 'Ana Schilke',  role: 'Diretora do Centro de Formação Darcy Ribeiro' },
  { name: 'Bira Marques', role: 'Secretário Municipal de Educação de Niterói' },
];

// ─── Remove fundo preto da logo (canvas trick) ────────────────────────────
function removeBlackBackground(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 60) data[i + 3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
    img.src = canvas.toDataURL('image/png');
  } catch {
    // CORS taint – mantém logo original
  }
}

// ─── Componente ───────────────────────────────────────────────────────────
export default function CertificateCFDR({
  participantName,
  eventType    = 'Curso',
  eventTitle,
  day,
  month,
  year,
  workloadHours,
  qrCodeDataUrl = null,
  hashUnico     = null,
  logoSrc       = null,
  signatures    = DEFAULT_SIGNATURES,
}) {
  const logoRef = useRef(null);

  // Remove fundo preto da logo quando ela carregar
  useEffect(() => {
    if (!logoSrc) return;
    const img = logoRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      removeBlackBackground(img);
    } else {
      const onLoad = () => removeBlackBackground(img);
      img.addEventListener('load', onLoad);
      return () => img.removeEventListener('load', onLoad);
    }
  }, [logoSrc]);

  return (
    <div className={styles.certificateWrapper}>
      <div className={styles.certificate}>

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div className={styles.certHeader}>
          <div className={`${styles.circle} ${styles.c1}`} />
          <div className={`${styles.circle} ${styles.c2}`} />
          <div className={`${styles.circle} ${styles.c3}`} />

          {logoSrc && (
            <img
              ref={logoRef}
              className={styles.certHeaderLogo}
              src={logoSrc}
              alt="Prefeitura de Niterói — Educação"
              crossOrigin="anonymous"
            />
          )}

          <div className={styles.certLogo}>
            <div className={styles.line1}>CENTRO DE<br />FORMAÇÃO</div>
            <div className={styles.line2}>DARCY<br />RIBEIRO</div>
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────────────────── */}
        <div className={styles.certBody}>

          {/* Título */}
          <div className={styles.certTitle}>CERTIFICADO</div>

          {/* Texto */}
          <p className={styles.certText}>
            Certificamos que{' '}
            <span className={styles.highlight}>{participantName || '[NOME]'}</span>{' '}
            participou do(a){' '}
            <span className={styles.highlight}>{eventType}</span>{' '}
            <span className={styles.highlight}>{eventTitle || '[TÍTULO]'}</span>,
            realizado(a) no{' '}
            <strong>Centro de Formação Darcy Ribeiro</strong>,
            promovido(a) pela{' '}
            <strong>Secretaria Municipal de Educação</strong>{' '}
            e pela{' '}
            <strong>Fundação Municipal de Educação</strong>,
            no dia {day || '[DIA]'} de {month || '[MÊS]'} de {year || '[ANO]'},
            com carga horária de{' '}
            <strong>{workloadHours || '[CARGA]'} horas</strong>.
          </p>

          {/* Assinaturas + QR Code */}
          <div className={styles.certBottom}>

            {/* Assinaturas */}
            <div className={styles.certSignatures}>
              {signatures.map((sig) => (
                <div key={sig.name} className={styles.signature}>
                  <div className={styles.sigName}>{sig.name}</div>
                  <div className={styles.sigRole}>{sig.role}</div>
                </div>
              ))}
            </div>

            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className={styles.certQr}>
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code de autenticidade"
                  className={styles.certQrImage}
                />
                <span className={styles.certQrLabel}>Verificar autenticidade</span>
                {hashUnico && (
                  <span className={styles.certQrHash}>
                    {hashUnico.slice(0, 18)}…
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER BAR ──────────────────────────────────────────── */}
        <div className={styles.certFooterBar} />

      </div>
    </div>
  );
}