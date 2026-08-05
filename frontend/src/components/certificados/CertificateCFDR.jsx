/**
 * components/certificados/CertificateCFDR.jsx
 *
 * Pré-visualização do certificado A4 horizontal com frente e verso.
 */

import { useEffect, useMemo, useRef } from 'react';
import styles from './CertificateCFDR.module.css';

const DEFAULT_SIGNATURES = [
  {
    name: 'Ana Schilke',
    role: 'Diretora do Centro de Formação Darcy Ribeiro',
    imageSrc: '/assinatura_ana_schilke.png'
  },
  {
    name: 'Bira Marques',
    role: 'Secretário Municipal de Educação de Niterói',
    imageSrc: '/assinatura_bira_marques.png'
  }
];

function removeBlackBackground(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 60) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    img.src = canvas.toDataURL('image/png');
  } catch {
    // Mantém a imagem original quando o navegador bloquear o canvas por CORS.
  }
}

function formatarData(dataIso) {
  if (!dataIso) return '—';

  const texto = String(dataIso).slice(0, 10);
  const [ano, mes, dia] = texto.split('-');
  if (!ano || !mes || !dia) return '—';

  return `${dia}/${mes}/${ano}`;
}

function montarPeriodo(dataInicio, dataFim) {
  const inicio = formatarData(dataInicio);
  const fim = formatarData(dataFim || dataInicio);

  if (inicio === '—') return '—';
  return inicio === fim ? inicio : `${inicio} a ${fim}`;
}

function montarItensConteudo(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return [];

  let itens = texto
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);

  if (itens.length === 1 && itens[0].includes(';')) {
    itens = itens[0]
      .split(';')
      .map(item => item.trim())
      .filter(Boolean);
  }

  return itens.map(item => item.replace(/^[-•▪◦*\d.)\s]+/, '').trim());
}

export default function CertificateCFDR({
  participantName,
  eventType = 'Curso',
  eventTitle,
  day,
  month,
  year,
  workloadHours,
  startDate,
  endDate,
  purpose,
  programContent,
  targetAudience,
  location,
  responsible,
  requestingSector,
  qrCodeDataUrl = null,
  hashUnico = null,
  logoSrc = null,
  signatures = DEFAULT_SIGNATURES
}) {
  const logoFrontRef = useRef(null);
  const logoBackRef = useRef(null);

  useEffect(() => {
    if (!logoSrc) return undefined;

    const imagens = [logoFrontRef.current, logoBackRef.current].filter(Boolean);
    const listeners = [];

    imagens.forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        removeBlackBackground(img);
      } else {
        const onLoad = () => removeBlackBackground(img);
        img.addEventListener('load', onLoad);
        listeners.push([img, onLoad]);
      }
    });

    return () => {
      listeners.forEach(([img, onLoad]) => img.removeEventListener('load', onLoad));
    };
  }, [logoSrc]);

  const participantNameUpper = useMemo(
    () => String(participantName || '[NOME]').trim().toLocaleUpperCase('pt-BR'),
    [participantName]
  );

  const itensConteudo = useMemo(
    () => montarItensConteudo(programContent),
    [programContent]
  );

  const classeLista = itensConteudo.length > 14
    ? `${styles.programList} ${styles.programListCompact}`
    : itensConteudo.length > 9
      ? `${styles.programList} ${styles.programListMedium}`
      : styles.programList;

  return (
    <div className={styles.certificateWrapper}>
      <section className={`${styles.certificate} ${styles.certificatePage}`}>
        <div className={styles.certHeader}>
          <div className={`${styles.circle} ${styles.c1}`} />
          <div className={`${styles.circle} ${styles.c2}`} />
          <div className={`${styles.circle} ${styles.c3}`} />

          {logoSrc && (
            <img
              ref={logoFrontRef}
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

        <div className={styles.certBody}>
          <div className={styles.certTitle}>CERTIFICADO</div>

          <p className={styles.certText}>
            Certificamos que{' '}
            <span className={styles.highlight}>{participantNameUpper}</span>{' '}
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

          <div className={styles.certBottom}>
            <div className={styles.certSignatures}>
              {signatures.map(sig => (
                <div key={sig.name} className={styles.signature}>
                  <div className={styles.sigImageArea}>
                    {sig.imageSrc && (
                      <img
                        src={sig.imageSrc}
                        alt={`Assinatura de ${sig.name}`}
                        className={styles.sigImage}
                      />
                    )}
                  </div>
                  <div className={styles.sigLine} />
                  <div className={styles.sigName}>{sig.name}</div>
                  <div className={styles.sigRole}>{sig.role}</div>
                </div>
              ))}
            </div>

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

        <div className={styles.certFooterBar} />
      </section>

      <section className={`${styles.certificate} ${styles.certificatePage} ${styles.certificateBack}`}>
        <div className={styles.backHeader}>
          <div className={`${styles.circle} ${styles.c1}`} />
          <div className={`${styles.circle} ${styles.c2}`} />
          <div className={`${styles.circle} ${styles.c3}`} />

          <div className={styles.backMiniLogo}>
            CENTRO DE FORMAÇÃO<br />
            <strong>DARCY RIBEIRO</strong>
          </div>

          {logoSrc && (
            <img
              ref={logoBackRef}
              className={styles.certHeaderLogo}
              src={logoSrc}
              alt="Prefeitura de Niterói — Educação"
              crossOrigin="anonymous"
            />
          )}
        </div>

        <div className={styles.backBody}>
          <aside className={styles.trainingData}>
            <h2>Dados da formação</h2>

            <DataItem label="Título" value={eventTitle} />
            <DataItem label="Período de realização" value={montarPeriodo(startDate, endDate)} />
            <DataItem label="Carga horária" value={`${workloadHours || '—'} horas`} />
            <DataItem label="Público-alvo" value={targetAudience} />
            <DataItem label="Local" value={location || 'Centro de Formação Darcy Ribeiro'} />
            <DataItem label="Responsável" value={responsible} />
            <DataItem label="Setor demandante" value={requestingSector} />
            <DataItem label="Objetivo" value={purpose} objective />
          </aside>

          <main className={styles.programContent}>
            <h2>Conteúdo programático</h2>

            {itensConteudo.length ? (
              <ul className={classeLista}>
                {itensConteudo.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.programEmpty}>
                Conteúdo programático não informado.
              </p>
            )}
          </main>
        </div>

        <div className={styles.certFooterBar} />

        {hashUnico && (
          <div className={styles.backValidation}>
            Código de autenticidade: {hashUnico.slice(0, 22)}…
          </div>
        )}
      </section>
    </div>
  );
}

function DataItem({ label, value, objective = false }) {
  return (
    <div className={styles.dataItem}>
      <span className={styles.dataLabel}>{label}</span>
      <div className={`${styles.dataValue} ${objective ? styles.dataObjective : ''}`}>
        {value || 'Não informado'}
      </div>
    </div>
  );
}
