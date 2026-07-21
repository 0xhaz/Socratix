// One-off: apply a CORS policy to the Tigris bucket so browser presigned
// PUT/GET/DELETE uploads are allowed. Run with:
//   node --env-file=.env scripts/set-s3-cors.mjs
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

const bucket = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
const client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: false,
});

// POC: allow all origins. Tighten AllowedOrigins to your real domains for prod.
const CORSConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ["*"],
      AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
      AllowedOrigins: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration }));
console.log(`✅ CORS policy applied to bucket "${bucket}"`);

const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
console.log("Current CORS rules:", JSON.stringify(current.CORSRules, null, 2));
