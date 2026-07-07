import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
} from "pdf-lib";

/* react-pdf's two-column templates occasionally spill an empty continuation
 * page when content ends right at the A4 boundary. Rather than fight the
 * layout engine, we strip trailing pages that carry no text after the fact —
 * this runs on both the live preview and the downloaded file, so an empty
 * last page never reaches the user. */

const latin1 = new TextDecoder("latin1");

/** Decode a page's /Contents (a stream, a ref to one, or an array of them)
 *  into its raw PDF operator text. */
function contentsToText(context: PDFDocument["context"], obj: unknown): string {
  let resolved = obj;
  if (resolved instanceof PDFRef) resolved = context.lookup(resolved);
  if (!resolved) return "";
  if (resolved instanceof PDFArray) {
    return resolved
      .asArray()
      .map((el) => contentsToText(context, el))
      .join("\n");
  }
  if (resolved instanceof PDFRawStream) {
    try {
      return latin1.decode(decodePDFRawStream(resolved).decode());
    } catch {
      return "";
    }
  }
  return "";
}

/** A page counts as blank if its content stream shows no text (no Tj/TJ). A
 *  real resume page always shows text, so this only ever catches the spurious
 *  empty continuation pages. */
function pageHasText(doc: PDFDocument, pageIndex: number): boolean {
  try {
    const page = doc.getPage(pageIndex);
    const contents = page.node.get(PDFName.of("Contents"));
    const text = contentsToText(doc.context, contents);
    return /(?:^|[^A-Za-z])(?:Tj|TJ)(?:[^A-Za-z]|$)/.test(text);
  } catch {
    // if we can't inspect it, keep it — never drop a page we're unsure about
    return true;
  }
}

/** Remove empty pages from the END of the document. Never removes the only
 *  page. Returns the original bytes untouched when nothing was blank. */
export async function stripBlankTrailingPages(
  bytes: Uint8Array
): Promise<Uint8Array> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes);
  } catch {
    return bytes; // unreadable → hand back the original
  }

  let count = doc.getPageCount();
  let removed = false;
  while (count > 1 && !pageHasText(doc, count - 1)) {
    doc.removePage(count - 1);
    count -= 1;
    removed = true;
  }

  if (!removed) return bytes;
  // keep objects uncompressed so downstream `/Type /Page` counting still works
  return doc.save({ useObjectStreams: false });
}

/** Blob-in, Blob-out convenience wrapper used by the preview + download UI. */
export async function stripBlankTrailingPagesFromBlob(blob: Blob): Promise<Blob> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const out = await stripBlankTrailingPages(bytes);
    if (out === bytes) return blob;
    return new Blob([out as BlobPart], { type: "application/pdf" });
  } catch {
    return blob; // on any failure, fall back to the untouched PDF
  }
}
