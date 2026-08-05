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

const MESES = [
  '',
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];

function mesExtenso(dataIso) {
  if (!dataIso) return '—';
  const mes = parseInt(String(dataIso).slice(5, 7), 10);
  return MESES[mes] || '—';
}

function diaStr(dataIso) {
  return dataIso ? String(dataIso).slice(8, 10) : '—';
}

function anoStr(dataIso) {
  return dataIso ? String(dataIso).slice(0, 4) : '—';
}

export default function CertificadoViewer() {
  const { id } = useParams();

  const [cert, setCert] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const { data } = await api.get('/certificados/meus');
        const encontrado = (data.data || []).find(
          item => String(item.id) === String(id)
        );

        if (!encontrado) {
          if (ativo) setErro('Certificado não encontrado.');
          return;
        }

        if (ativo) setCert(encontrado);

        try {
          const respostaQr = await api.get(
            `/certificados/${encontrado.id}/qrcode`
          );

          if (ativo && respostaQr.data?.qr_code_data_url) {
            setQrDataUrl(respostaQr.data.qr_code_data_url);
          }
        } catch (erroQr) {
          console.warn(
            'Não foi possível carregar o QR Code:',
            erroQr.message
          );
        }
      } catch (error) {
        console.error('Erro ao carregar certificado:', error);
        if (ativo) setErro('Erro ao carregar certificado.');
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [id]);

  async function baixarPDF() {
    if (!cert) return;

    setBaixando(true);

    try {
      const codigo = cert.hash_unico || cert.codigo_validacao;

      if (!codigo) {
        throw new Error(
          'O certificado não possui código de validação.'
        );
      }

      const response = await api.get(
        `/certificados/${codigo}/pdf`,
        {
          responseType: 'blob',
          timeout: 30000
        }
      );

      if (!response.data?.size) {
        throw new Error('O servidor retornou um PDF vazio.');
      }

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');

      link.href = url;
      link.download = `Certificado_${(
        cert.nome_completo || 'certificado'
      ).replace(/\s+/g, '_')}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);

      const mensagem =
        error.response?.data?.erro ||
        error.message ||
        'Erro desconhecido.';

      window.alert(`Erro ao gerar o PDF: ${mensagem}`);
    } finally {
      setBaixando(false);
    }
  }

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

          <Link
            to="/participante/certificados"
            className="btn btn-primario"
            style={{ marginTop: 16 }}
          >
            Voltar para meus certificados
          </Link>
        </div>
      </PainelLayout>
    );
  }

  const horas =
    cert.carga_horaria_cursada || cert.carga_horaria;

  return (
    <PainelLayout titulo="Meu Certificado">
      <div className={styles.page}>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => window.print()}
          >
            🖨 Imprimir
          </button>

          <button
            type="button"
            className="btn btn-secundario"
            onClick={baixarPDF}
            disabled={baixando}
          >
            {baixando
              ? '⏳ Gerando PDF…'
              : '⬇ Baixar PDF oficial'}
          </button>

          {cert.hash_unico && (
            <a
              href={`/validar/${cert.hash_unico}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secundario"
            >
              🔗 Página de validação
            </a>
          )}

          <Link
            to="/participante/certificados"
            className="btn btn-secundario"
          >
            ← Voltar
          </Link>
        </div>

        <div className={styles.infoBox}>
          <strong>Dados do certificado:</strong>
          <br />
          ID: {cert.id} &nbsp;|&nbsp; Código:{' '}
          {cert.codigo_validacao || 'N/A'} &nbsp;|&nbsp; Status:{' '}
          {cert.status}
          <br />
          Hash: {cert.hash_unico || 'N/A'}
          <br />
          Formação: {cert.titulo}

          {!qrDataUrl && (
            <span
              style={{
                color: '#c0392b',
                marginLeft: 12
              }}
            >
              ⚠ QR Code não disponível.
            </span>
          )}
        </div>

        <div className={styles.scrollArea}>
          <div className={styles.certificateShell}>
            <CertificateCFDR
              participantName={cert.nome_completo}
              eventType="Curso"
              eventTitle={cert.titulo}
              day={diaStr(cert.data_fim)}
              month={mesExtenso(cert.data_fim)}
              year={anoStr(cert.data_fim)}
              workloadHours={String(horas || '')}
              qrCodeDataUrl={qrDataUrl}
              hashUnico={cert.hash_unico}
            />
          </div>
        </div>

        <p className={styles.footerNote}>
          Preview em A4 horizontal — use “Imprimir” ou “Baixar PDF
          oficial” para salvar.
        </p>
      </div>
    </PainelLayout>
  );
}
