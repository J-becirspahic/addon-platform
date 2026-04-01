import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import crypto from 'crypto';

export interface UploadResult {
  url: string;
  size: number;
  checksum: string;
}

export class StorageClient {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(config: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
  }) {
    this.endpoint = config.endpoint;
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true,
    });
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async uploadArtifact(key: string, filePath: string): Promise<UploadResult> {
    const fileBuffer = await fs.readFile(filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: 'application/gzip',
      })
    );

    return {
      url: `${this.endpoint}/${this.bucket}/${key}`,
      size: fileBuffer.length,
      checksum,
    };
  }
}
