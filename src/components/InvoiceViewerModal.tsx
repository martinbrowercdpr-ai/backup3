import React from 'react';
import { X, FileText, Download, ExternalLink, Receipt, Eye } from 'lucide-react';
import { InvoiceAttachment } from '../types';

interface InvoiceViewerModalProps {
  attachment: InvoiceAttachment | null;
  invoiceNumber?: string;
  plate?: string;
  revisionType?: string;
  onClose: () => void;
}

export const InvoiceViewerModal: React.FC<InvoiceViewerModalProps> = ({
  attachment,
  invoiceNumber,
  plate,
  revisionType,
  onClose,
}) => {
  if (!attachment) return null;

  const isPdf = attachment.type.includes('pdf') || attachment.name.toLowerCase().endsWith('.pdf');
  const isImage = attachment.type.startsWith('image/');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    const win = window.open();
    if (win) {
      if (isImage) {
        win.document.write(
          `<img src="${attachment.dataUrl}" style="max-width:100%; height:auto; margin:auto; display:block;" alt="${attachment.name}" />`
        );
      } else {
        win.location.href = attachment.dataUrl;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Nota Fiscal / Comprovante Anexo</span>
                {invoiceNumber && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {invoiceNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {plate && <span className="font-mono font-bold text-amber-400 mr-2">{plate}</span>}
                {revisionType && <span>{revisionType} • </span>}
                {attachment.name} ({(attachment.size / 1024).toFixed(0)} KB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownload}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              title="Baixar arquivo original"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Baixar</span>
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
              title="Abrir em aba cheia"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              <span>Abrir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950 flex items-center justify-center min-h-[340px]">
          {isImage ? (
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="max-h-[70vh] w-auto max-w-full rounded-lg shadow-lg border border-slate-800 object-contain"
            />
          ) : isPdf ? (
            <div className="w-full h-[65vh] flex flex-col items-center justify-center text-center p-6 bg-slate-900/50 rounded-xl border border-slate-800">
              <FileText className="w-16 h-16 text-rose-400 mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">{attachment.name}</h3>
              <p className="text-xs text-slate-400 mb-4 max-w-md">
                Documento em formato PDF pronto para visualização ou download fiscal.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF Completo</span>
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Visualizar em Nova Aba</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-6">
              <FileText className="w-12 h-12 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-semibold">{attachment.name}</p>
              <p className="text-[11px] text-slate-500 mb-4">Arquivo anexado</p>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
              >
                Download
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <span>
            Enviado em:{' '}
            {attachment.uploadedAt
              ? new Date(attachment.uploadedAt).toLocaleString('pt-BR')
              : 'Recentemente'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-semibold cursor-pointer"
          >
            Fechar Visualizador
          </button>
        </div>
      </div>
    </div>
  );
};
