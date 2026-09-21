import { renderAppIcon } from "@/lib/app-icon";

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = size === "512" ? 512 : 192;
  return renderAppIcon(px);
}
