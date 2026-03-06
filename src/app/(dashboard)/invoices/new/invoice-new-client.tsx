"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PdfViewer, type PdfViewerHandle } from "@/components/pdf-viewer";
import { InvoiceForm } from "./invoice-form";

type Vendor = { id: string; code: string; name: string; furigana: string | null };
type Site = { id: string; code: string; name: string };
type Account = { id: string; code: string; name: string };

type Props = {
  vendors: Vendor[];
  sites: Site[];
  accounts: Account[];
  organizationId: string;
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

function MobileFilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;

  const isPdf = file.type === "application/pdf";

  return isPdf ? (
    <iframe src={url} className="w-full h-full border-0" title="PDF preview" />
  ) : (
    <img src={url} alt="添付ファイル" className="max-w-full h-auto object-contain" />
  );
}

export function InvoiceNewClient({ vendors, sites, accounts, organizationId }: Props) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfViewerRef = useRef<PdfViewerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleFileChange = useCallback((file: File | null) => {
    setPdfFile(file);
  }, []);

  const getMarkerImage = useCallback(
    () => pdfViewerRef.current?.getMarkerImage() ?? Promise.resolve(null),
    []
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        {/* ファイル選択 */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setPdfFile(file);
            }}
          />
          <button
            type="button"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => fileInputRef.current?.click()}
          >
            {pdfFile ? "ファイルを変更" : "ファイルを選択"}
          </button>
          {pdfFile && (
            <span className="ml-2 text-sm text-gray-600 truncate">{pdfFile.name}</span>
          )}
        </div>

        {/* 添付プレビュー: 固定300px, iframe/imgのみ, canvas無し */}
        {pdfFile && (
          <div className="h-[300px] border rounded bg-gray-50 overflow-hidden">
            <MobileFilePreview file={pdfFile} />
          </div>
        )}

        {/* 請求書フォーム */}
        <InvoiceForm
          vendors={vendors}
          sites={sites}
          accounts={accounts}
          pdfFile={pdfFile}
          organizationId={organizationId}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-7 h-full py-5">
      {/* 左54%: 請求書ビューア */}
      <div className="w-[54%] shrink-0">
        <div className="sticky top-5 h-[calc(100vh-4rem-2.5rem)] bg-card rounded-[20px] border border-border shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">請求書ファイル</span>
            {pdfFile && (
              <button
                type="button"
                onClick={() => {
                  const url = URL.createObjectURL(pdfFile);
                  window.open(url, "_blank");
                }}
                className="text-xs text-primary hover:text-primary-hover cursor-pointer"
              >
                新規ウィンドウで開く
              </button>
            )}
          </div>
          {pdfFile && (
            <div className="px-5 py-2 bg-muted border-b border-border">
              <span className="text-xs text-sub-text truncate block">{pdfFile.name}</span>
            </div>
          )}
          <div className="flex-1 min-h-0">
            <PdfViewer ref={pdfViewerRef} onFileChange={handleFileChange} />
          </div>
        </div>
      </div>

      {/* 右46%: フォーム */}
      <div className="flex-1 min-w-0 overflow-y-auto py-1">
        <InvoiceForm
          vendors={vendors}
          sites={sites}
          accounts={accounts}
          pdfFile={pdfFile}
          organizationId={organizationId}
          getMarkerImage={getMarkerImage}
        />
      </div>
    </div>
  );
}
