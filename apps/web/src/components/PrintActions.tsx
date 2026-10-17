// The Print button of every printed paper, with a menu next to it:
//  - Share on WhatsApp: opens a chat with the patient's number and a short message (no need to save the number).
//  - Share the PDF: the paper itself as a file, through the computer's or phone's share window (WhatsApp, Gmail…),
//    where the browser allows it.
//  - Download PDF: the paper saved as a .pdf file, no print window.
//  - Send by email: a new mail with the message.
// WhatsApp and email open outside HMS and need the internet; HMS itself sends nothing anywhere.
import { useState } from 'react';
import { ChevronDown, Download, Mail, MessageCircle, Printer, Share2 } from 'lucide-react';
import { Menu, MenuContent, MenuItem, MenuTrigger, toast } from '@platform/ui';

export interface ShareInfo {
  /** The patient's mobile (any format; +91 is added to a 10-digit number). None: WhatsApp asks whom to send to. */
  phone?: string | null;
  email?: string | null;
  /** Mail subject and PDF file name, e.g. "Bill BL-261014-002". */
  subject: string;
  /** The text that goes into the message. */
  message: string;
}

/** "+91 98765 00011" / "9876500011" -> "919876500011" (what wa.me wants). */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits.length >= 8 ? digits : null;
}

/** Every A4 sheet on the page (elements with class "sheet") as one PDF, in page order. */
export async function sheetsToPdf(): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const sheets = [...document.querySelectorAll<HTMLElement>('.sheet')];
  let first = true;
  for (const sheet of sheets) {
    const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    // The sheet scaled to the page width; a sheet taller than one page goes on as many pages as it needs.
    const imgH = (canvas.height * pageW) / canvas.width;
    const image = canvas.toDataURL('image/jpeg', 0.92);
    for (let top = 0; top < imgH - 1; top += pageH) {
      if (!first) pdf.addPage();
      first = false;
      pdf.addImage(image, 'JPEG', 0, -top, pageW, imgH);
    }
  }
  return pdf.output('blob');
}

const fileName = (subject: string) => `${subject.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'document'}.pdf`;

export function PrintActions({ share, canPrint = true, size = 'md' }: { share?: ShareInfo; canPrint?: boolean; size?: 'sm' | 'md' }) {
  const [busy, setBusy] = useState(false);
  const pad = size === 'sm' ? 'px-4 py-1.5 text-sm' : 'px-5 py-2 text-base';
  const subject = share?.subject ?? document.title;
  const canShareFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] });

  const makePdf = async () => {
    setBusy(true);
    const id = toast.loading('Making the PDF…');
    try {
      const blob = await sheetsToPdf();
      toast.dismiss(id);
      return blob;
    } catch (e) {
      toast.error('The PDF could not be made. Use Print instead.', { id, description: e instanceof Error ? e.message : undefined });
      return null;
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    const blob = await makePdf();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(subject);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.success(`Saved ${fileName(subject)}`, { description: 'In the Downloads folder.' });
  };
  const sharePdf = async () => {
    const blob = await makePdf();
    if (!blob) return;
    try {
      await navigator.share({ files: [new File([blob], fileName(subject), { type: 'application/pdf' })], title: subject, text: share?.message });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast.error('Sharing did not work here. Use Download PDF, then attach the file.');
    }
  };
  const whatsapp = () => {
    const to = whatsappNumber(share?.phone);
    window.open(`https://wa.me/${to ?? ''}?text=${encodeURIComponent(share?.message ?? '')}`, '_blank', 'noopener');
    if (!to) toast.info('No mobile number on this patient: choose the contact in WhatsApp.');
  };
  const email = () => {
    window.location.href = `mailto:${share?.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(share?.message ?? '')}`;
  };

  return (
    <div className="inline-flex rounded-md shadow-sm">
      <button onClick={() => window.print()} disabled={!canPrint} className={`inline-flex items-center gap-2 rounded-l-md bg-[#1f6b4f] font-semibold text-white disabled:opacity-50 ${pad}`}>
        <Printer className="size-4" /> Print
      </button>
      <Menu>
        <MenuTrigger asChild>
          <button aria-label="More: WhatsApp, download PDF, email" disabled={!canPrint || busy} className="rounded-r-md border-l border-white/30 bg-[#1f6b4f] px-2.5 text-white disabled:opacity-50">
            <ChevronDown className="size-4" />
          </button>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={whatsapp}>
            <MessageCircle /> Share on WhatsApp{share?.phone ? '' : ' (choose contact)'}
          </MenuItem>
          {canShareFiles && (
            <MenuItem onSelect={sharePdf}>
              <Share2 /> Share the PDF (WhatsApp, mail…)
            </MenuItem>
          )}
          <MenuItem onSelect={download}>
            <Download /> Download PDF
          </MenuItem>
          <MenuItem onSelect={email}>
            <Mail /> Send by email
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}
