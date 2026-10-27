import { askLive } from "@/lib/live-reply";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const result = await askLive(
    String(form.get("post") ?? ""),
    String(form.get("comment") ?? ""),
    String(form.get("place") ?? ""),
  );
  return Response.json(result);
}
