import { NextResponse } from "next/server";
import { requireAuthSession } from "@/auth/session";
import {
  createSummaryCsv,
  getSessionReport,
  getSessionReportFilename,
} from "@/lib/session-report";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const session = await requireAuthSession();
  const { sessionId } = await context.params;

  const report = await getSessionReport({
    organizationId: session.user.organizationId,
    sessionId,
  });

  if (!report) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  if (report.session.status !== "finished") {
    return NextResponse.json({ error: "report_not_ready" }, { status: 409 });
  }

  const filename = getSessionReportFilename({
    extension: "csv",
    reportType: "summary",
    session: report.session,
  });

  return new Response(`\uFEFF${createSummaryCsv(report)}`, {
    headers: {
      "content-disposition": `attachment; filename="${filename}"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
