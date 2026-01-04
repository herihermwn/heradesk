import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "./env";

export const s3Client = new S3Client({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKey,
    secretAccessKey: config.s3.secretKey,
  },
  forcePathStyle: config.s3.forcePathStyle,
});

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    })
  );

  return `${config.s3.publicUrl}/${key}`;
}

export async function getFile(key: string) {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    })
  );

  return response.Body;
}

export async function deleteFile(key: string) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    })
  );
}

export function getPublicUrl(key: string): string {
  return `${config.s3.publicUrl}/${key}`;
}
