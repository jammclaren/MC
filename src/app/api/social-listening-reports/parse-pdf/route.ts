import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { requireSessionUser } from "@/lib/session";
import { assertCanAccessSocialMonitor } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-error";
import { parseSocialListeningPdfText } from "@/lib/social-listening-pdf-parser";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Read-only text extraction + deterministic pattern matching to speed up
 * logging a report — never writes anything, so no audit entry, and the
 * caller always shows the result to staff for review before saving.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSessionUser();
    assertCanAccessSocialMonitor(user);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF is too large (max 15MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    let text: string;
    try {
      const result = await parser.getText();
      // pdf-parse inserts a "-- N of M --" marker between pages, which
      // would otherwise leak into whatever field's text happens to run
      // up against a page break.
      text = result.text.replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gim, "");
    } finally {
      await parser.destroy();
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No selectable text found in this PDF — it may be image-only, so this report can't be auto-extracted. Please fill it in manually." },
        { status: 422 }
      );
    }

    const parsed = parseSocialListeningPdfText(text);
    return NextResponse.json(parsed);
  } catch (error) {
    return handleApiError(error);
  }
}
