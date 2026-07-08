/**
 * pages/participante/CertificadoViewer.jsx
 *
 * Exibe o certificado do participante com QR Code de autenticidade.
 * Busca o QR Code via GET /api/certificados/:id/qrcode.
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PainelLayout from '../../components/PainelLayout';
import { Spinner } from '../../components/ui';
import api from '../../api';
import CertificateCFDR from '../../components/certificados/CertificateCFDR';
import styles from '../../components/certificados/CertificateCFDR.module.css';

// ─── Helpers de data ─────────────────────────────────────────────────────────
const MESES = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function mesExtenso(dataIso) {
  if (!dataIso) return '—';
  const m = parseInt(String(dataIso).slice(5, 7), 10);
  return MESES[m] || '—';
}
function diaStr(dataIso)  { return dataIso ? String(dataIso).slice(8, 10) : '—'; }
function anoStr(dataIso)  { return dataIso ? String(dataIso).slice(0, 4)  : '—'; }

// ─── Componente ──────────────────────────────────────────────────────────────
export default function CertificadoViewer() {
  const { id } = useParams();

  const [cert,         setCert]         = useState(null);
  const [qrDataUrl,    setQrDataUrl]    = useState(null);   // ← QR Code
  const [loading,      setLoading]      = useState(true);
  const [baixando,     setBaixando]     = useState(false);
  const [erro,         setErro]         = useState('');

  // ── Busca certificado + QR Code ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // 1. Lista certificados do participante
        const { data } = await api.get('/certificados/meus');
        const found = data.data.find((item) => String(item.id) === String(id));

        if (!found) { setErro('Certificado não encontrado.'); return; }

        setCert(found);

        // 2. Busca o QR Code para este certificado
        try {
          const qrRes = await api.get(`/certificados/${found.id}/qrcode`);
          if (qrRes.data?.qr_code_data_url) {
            setQrDataUrl(qrRes.data.qr_code_data_url);
          }
        } catch (qrErr) {
          console.warn('Não foi possível carregar o QR Code:', qrErr.message);
          // Não bloqueia — certificado exibe sem QR
        }

      } catch (error) {
        console.error('Erro ao carregar certificado:', error);
        setErro('Erro ao carregar certificado.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Download PDF (via backend com Puppeteer) ─────────────────────────────
  async function baixarPDF() {
    if (!cert) return;
    setBaixando(true);
    try {
      // Tenta pelo hash_unico primeiro (mais estável), depois pelo id
      const tentativas = [
        cert.hash_unico && `/certificados/${cert.hash_unico}/pdf`,
        `/certificados/${cert.id}/pdf`,
        cert.codigo_validacao && `/certificados/${cert.codigo_validacao}/pdf`,
      ].filter(Boolean);

      let response = null;
      for (const endpoint of tentativas) {
        try {
          const r = await api.get(endpoint, { responseType: 'blob', timeout: 30000 });
          if (r.data?.size > 0) { response = r; break; }
        } catch { /* tenta próximo */ }
      }

      if (!response) throw new Error('Nenhum endpoint de PDF respondeu.');

      const url  = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `Certificado_${(cert.nome_completo || 'certificado').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert(`Erro ao gerar o PDF: ${error.message}`);
    } finally {
      setBaixando(false);
    }
  }

  // ── Estados de carregamento / erro ───────────────────────────────────────
  if (loading) {
    return (
      <PainelLayout titulo="Certificado">
        <Spinner />
      </PainelLayout>
    );
  }

  if (erro) {
    return (
      <PainelLayout titulo="Certificado">
        <div className="vazio">
          <div className="vazio-icone">❌</div>
          <p>{erro}</p>
          <Link to="/participante/certificados" className="btn btn-primario" style={{ marginTop: 16 }}>
            Voltar para meus certificados
          </Link>
        </div>
      </PainelLayout>
    );
  }

  const horas = cert.carga_horaria_cursada || cert.carga_horaria;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <PainelLayout titulo="Meu Certificado">
      <div className={styles.page}>

        {/* Barra de ações */}
        <div className={styles.actions}>
          <button className="btn btn-primario" onClick={() => window.print()}>
            🖨 Imprimir
          </button>

          <button
            className="btn btn-secundario"
            onClick={baixarPDF}
            disabled={baixando}
          >
            {baixando ? '⏳ Gerando PDF…' : '⬇ Baixar PDF oficial'}
          </button>

          <a
            href={`/validar/${cert.hash_unico}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secundario"
          >
            🔗 Página de validação
          </a>

          <Link to="/participante/certificados" className="btn btn-secundario">
            ← Voltar
          </Link>
        </div>

        {/* Info do certificado */}
        <div className={styles.infoBox}>
          <strong>Dados do certificado:</strong><br />
          ID: {cert.id} &nbsp;|&nbsp;
          Código: {cert.codigo_validacao || 'N/A'} &nbsp;|&nbsp;
          Status: {cert.status}<br />
          Hash: {cert.hash_unico}<br />
          Formação: {cert.titulo}
          {!qrDataUrl && (
            <span style={{ color: '#c0392b', marginLeft: 12 }}>
              ⚠ QR Code não disponível — verifique se o certificado foi emitido pelo admin.
            </span>
          )}
        </div>

        {/* Preview do certificado (horizontal scroll em telas pequenas) */}
        <div className={styles.scrollArea}>
          <div className={styles.certificateShell}>
            <CertificateCFDR
              participantName={cert.nome_completo}
              eventType="Curso"
              eventTitle={cert.titulo}
              day={diaStr(cert.data_fim)}
              month={mesExtenso(cert.data_fim)}
              year={anoStr(cert.data_fim)}
              workloadHours={String(horas)}
              qrCodeDataUrl={qrDataUrl}          /* ← QR Code */
              hashUnico={cert.hash_unico}        /* ← hash curto abaixo do QR */
            />
          </div>
        </div>

        <p className={styles.footerNote}>
          Preview em A4 horizontal — use "Imprimir" ou "Baixar PDF oficial" para salvar.
        </p>

      </div>
    </PainelLayout>
  );
}