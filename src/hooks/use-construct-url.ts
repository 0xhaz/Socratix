export function useConstructUrl(key: string) {
    if (!key) return undefined;

    // The Tigris bucket is private, so we route reads through a same-origin
    // proxy that redirects to a short-lived presigned URL (see
    // src/app/api/s3/file/route.ts). Same-origin means next/image needs no
    // remotePatterns entry for the storage host.
    return `/api/s3/file?key=${encodeURIComponent(key)}`;
}