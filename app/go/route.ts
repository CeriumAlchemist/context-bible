import { NextRequest, NextResponse } from "next/server";
import { parseReference, referencePath } from "@/lib/reference";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const result = parseReference(q);
  const url = req.nextUrl.clone();
  url.search = "";
  if (result.ok) {
    url.pathname = referencePath(result.ref);
  } else {
    url.pathname = "/";
    url.searchParams.set("q", q);
    url.searchParams.set("error", result.error);
  }
  return NextResponse.redirect(url);
}
