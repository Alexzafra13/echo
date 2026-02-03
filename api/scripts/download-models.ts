#!/usr/bin/env npx ts-node
/**
 * Download ML models for Echo
 *
 * This script downloads required ONNX models for stem separation.
 * It runs automatically during `pnpm install` (postinstall) and can
 * also be run manually: `pnpm run download:models`
 *
 * Models are downloaded to: ./models/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';

interface ModelConfig {
  name: string;
  url: string;
  sha256: string;
  sizeBytes: number;
  description: string;
}

const MODELS: ModelConfig[] = [
  {
    name: 'htdemucs.onnx',
    url: 'https://github.com/Alexzafra13/echo/releases/download/models-v1.0.0/htdemucs.onnx',
    sha256: '', // Skip verification - file from trusted source
    sizeBytes: 2_600_000, // ~2.6 MB (model structure)
    description: 'Demucs v4 Hybrid Transformer - model structure',
  },
  {
    name: 'htdemucs.onnx.data',
    url: 'https://github.com/Alexzafra13/echo/releases/download/models-v1.0.0/htdemucs.onnx.data',
    sha256: '', // Skip verification - file from trusted source
    sizeBytes: 168_000_000, // ~168 MB (model weights)
    description: 'Demucs v4 Hybrid Transformer - model weights',
  },
];


const MODELS_DIR = path.join(__dirname, '..', 'models');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function downloadFile(url: string, destPath: string, expectedSize: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloadedBytes = 0;
    let lastProgress = 0;

    const handleResponse = (response: http.IncomingMessage) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath, expectedSize).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10) || expectedSize;

      response.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        const progress = Math.floor((downloadedBytes / totalSize) * 100);
        if (progress >= lastProgress + 10) {
          process.stdout.write(`\r  Downloading: ${progress}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalSize)})`);
          lastProgress = progress;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`\r  Downloading: 100% (${formatBytes(downloadedBytes)})                    `);
        resolve();
      });
    };

    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, handleResponse);

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

function calculateSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function downloadModel(model: ModelConfig): Promise<boolean> {
  const modelPath = path.join(MODELS_DIR, model.name);

  console.log(`\n[${model.name}]`);
  console.log(`  ${model.description}`);

  // Check if model already exists
  if (fs.existsSync(modelPath)) {
    // Skip verification if no checksum provided
    if (!model.sha256) {
      console.log(`  File exists - skipping (no checksum to verify)`);
      return true;
    }
    console.log(`  File exists, verifying checksum...`);
    const existingHash = await calculateSha256(modelPath);

    if (existingHash === model.sha256) {
      console.log(`  Checksum OK - skipping download`);
      return true;
    } else {
      console.log(`  Checksum mismatch - redownloading`);
      fs.unlinkSync(modelPath);
    }
  }

  // Download
  console.log(`  Source: ${model.url}`);
  console.log(`  Size: ${formatBytes(model.sizeBytes)}`);

  try {
    await downloadFile(model.url, modelPath, model.sizeBytes);
  } catch (error) {
    console.error(`  Download failed: ${(error as Error).message}`);
    return false;
  }

  // Verify checksum (skip if not provided)
  if (model.sha256) {
    console.log(`  Verifying checksum...`);
    const downloadedHash = await calculateSha256(modelPath);

    if (downloadedHash !== model.sha256) {
      console.error(`  Checksum verification FAILED!`);
      console.error(`  Expected: ${model.sha256}`);
      console.error(`  Got:      ${downloadedHash}`);
      fs.unlinkSync(modelPath);
      return false;
    }
    console.log(`  Checksum OK`);
  } else {
    console.log(`  Skipping checksum verification`);
  }

  return true;
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Echo - Downloading ML Models');
  console.log('='.repeat(60));

  // Skip in CI environment unless explicitly requested
  if (process.env.CI && !process.env.DOWNLOAD_MODELS) {
    console.log('\nSkipping model download in CI environment.');
    console.log('Set DOWNLOAD_MODELS=1 to force download.');
    return;
  }

  // Create models directory
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`\nCreated models directory: ${MODELS_DIR}`);
  }

  // Download each model
  let success = 0;
  let failed = 0;

  for (const model of MODELS) {
    const result = await downloadModel(model);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Download complete: ${success} succeeded, ${failed} failed`);

  if (failed > 0) {
    console.log('\nNote: Some models failed to download.');
    console.log('Stem separation will not be available until models are present.');
    console.log('Run `pnpm run download:models` to retry.');
  }

  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
