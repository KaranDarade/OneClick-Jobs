import { extractText, getDocumentProxy } from "unpdf";

export interface PdfParseResult {
  success: boolean;
  text: string;
  pageCount: number;
  warnings: string[];
  error?: string;
}

const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PAGES_ALLOWED = 10;
const MIN_EXTRACTABLE_TEXT_CHARS = 30;

/**
 * Validates standard PDF header signature (%PDF-)
 */
export function isValidPdfSignature(buffer: Uint8Array): boolean {
  if (buffer.length < 5) return false;
  // %PDF- in ASCII is [0x25, 0x50, 0x44, 0x46, 0x2D]
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

/**
 * Parses and extracts clean plain-text from an uploaded PDF resume buffer safely.
 * Operates purely in-memory with zero disk persistence.
 */
export async function parsePdfResume(buffer: Uint8Array): Promise<PdfParseResult> {
  const warnings: string[] = [];

  // 1. File size check
  if (buffer.length === 0) {
    return {
      success: false,
      text: "",
      pageCount: 0,
      warnings: [],
      error: "The provided file is empty.",
    };
  }

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    return {
      success: false,
      text: "",
      pageCount: 0,
      warnings: [],
      error: `File size exceeds the 5MB upload limit (size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  // 2. Binary signature check (%PDF-)
  if (!isValidPdfSignature(buffer)) {
    return {
      success: false,
      text: "",
      pageCount: 0,
      warnings: [],
      error: "Invalid document structure: missing standard PDF header (%PDF-). Please upload a standard PDF resume.",
    };
  }

  try {
    // 3. Load PDF proxy and inspect metadata/page limits
    const pdfDoc = await getDocumentProxy(buffer);
    const pageCount = pdfDoc.numPages;

    if (pageCount > MAX_PAGES_ALLOWED) {
      return {
        success: false,
        text: "",
        pageCount,
        warnings: [],
        error: `Resume document exceeds the maximum limit of ${MAX_PAGES_ALLOWED} pages (found ${pageCount} pages).`,
      };
    }

    // 4. Extract text content
    const extraction = await extractText(pdfDoc, { mergePages: true });
    const fullText = (typeof extraction === "string" ? extraction : extraction.text || "").trim();

    if (fullText.length === 0) {
      return {
        success: false,
        text: "",
        pageCount,
        warnings: [
          "Zero extractable text found. This may be a scanned or flattened image-only PDF. OCR is not supported in Phase 5.",
        ],
        error: "No extractable text found in this PDF. Please upload a text-based PDF created from Word, Docs, or LaTeX.",
      };
    }

    if (fullText.length < MIN_EXTRACTABLE_TEXT_CHARS) {
      warnings.push(
        "Extracted text is unusually sparse. Some sections might be embedded as graphics or vector shapes."
      );
    }

    // Sanitize non-printable control characters while preserving whitespace and newlines
    const sanitizedText = fullText
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, "")
      .replace(/\r\n/g, "\n");

    return {
      success: true,
      text: sanitizedText,
      pageCount,
      warnings,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("password") || message.toLowerCase().includes("encrypt")) {
      return {
        success: false,
        text: "",
        pageCount: 0,
        warnings: [],
        error: "This PDF is password-protected or encrypted. Please upload an unprotected PDF resume.",
      };
    }

    return {
      success: false,
      text: "",
      pageCount: 0,
      warnings: [],
      error: "Unable to parse this PDF document. The file may be corrupted or malformed.",
    };
  }
}
