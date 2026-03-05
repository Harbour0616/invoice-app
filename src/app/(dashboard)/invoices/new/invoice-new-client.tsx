"use client";

import { useState, useCallback, useRef } from "react";
import { PdfViewer, type PdfViewerHandle } from "@/components/pdf-viewer";
import { InvoiceForm } from "./invoice-form";
import { ResizableSplit } from "@/components/resizable-split";

type Vendor = { id: string; code: string; name: string; furigana: string | null };
type Site = { id: string; code: string; name: string };
type Account = { id: string; code: string; name: string };

type Props = {
  vendors: Vendor[];
  sites: Site[];
  accounts: Account[];
  organizationId: string;
};

export function InvoiceNewClient({ vendors, sites, accounts, organizationId }: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfViewerRef = useRef<PdfViewerHandle>(null);

  const handleFileChange = useCallback((file: File | null) => {
    setPdfFile(file);
  }, []);

  const getMarkerImage = useCallback(
    () => pdfViewerRef.current?.getMarkerImage() ?? Promise.resolve(null),
    []
  );

  return (
    <ResizableSplit
      initialRatio={0.45}
      left={<PdfViewer ref={pdfViewerRef} onFileChange={handleFileChange} />}
      right={
        <div className="pl-8 py-6 pr-4 h-full overflow-auto">
          <InvoiceForm
            vendors={vendors}
            sites={sites}
            accounts={accounts}
            pdfFile={pdfFile}
            organizationId={organizationId}
            getMarkerImage={getMarkerImage}
          />
        </div>
      }
    />
  );
}
