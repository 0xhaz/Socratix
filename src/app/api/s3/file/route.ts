import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";
import { s3Client } from "@/lib/s3-client";

// The Tigris bucket is private, so we stream objects through this same-origin
// route using the server's credentials. Streaming (not redirecting) means the
// image optimizer receives a direct 200 with a real image content-type, and
// Range headers are passed through so <video> seeking still works.
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const range = request.headers.get("range") ?? undefined;

  try {
    const obj = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
        Key: key,
        Range: range,
      })
    );

    if (!obj.Body) {
      return NextResponse.json({ error: "Empty object" }, { status: 404 });
    }

    // AWS SDK v3 Node body -> web ReadableStream for the Response.
    const body = (obj.Body as Readable & {
      transformToWebStream: () => ReadableStream;
    }).transformToWebStream();

    const headers = new Headers();
    if (obj.ContentType) headers.set("Content-Type", obj.ContentType);
    if (obj.ContentLength != null)
      headers.set("Content-Length", String(obj.ContentLength));
    if (obj.ETag) headers.set("ETag", obj.ETag);
    if (obj.ContentRange) headers.set("Content-Range", obj.ContentRange);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=3600");

    return new NextResponse(body, {
      status: obj.ContentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Error streaming object:", error);
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}
