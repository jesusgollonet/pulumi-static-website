# Pulumi Static Website Module

This Pulumi module provides infrastructure as code for deploying a static website using AWS S3 and CloudFront. It creates a secure setup with S3 bucket configured for web hosting, CloudFront distribution for content delivery, and proper security configurations including Origin Access Control (OAC).

## Features

- S3 bucket configured for static website hosting
- CloudFront distribution with HTTPS support
- Origin Access Control (OAC) for secure S3 access
- Bucket policy configured for CloudFront access
- Public access blocking for S3 bucket
- Default cache behavior configuration
- Automated SSL/TLS certificate management

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/)
- [Node.js](https://nodejs.org/)
- AWS credentials configured
- TypeScript knowledge

## Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

## Configuration

The module uses Pulumi configuration to manage environment-specific settings. Create a new stack and set the required configuration values:

```bash
pulumi stack init dev
```

While custom domain support is planned for future implementation, the current version uses CloudFront's default domain.

## Usage

Basic usage example:

```typescript
import * as pulumi from "@pulumi/pulumi";
import { StaticWebsite } from "./src/static-website";

const website = new StaticWebsite("my-static-website", {
  tags: {
    name: "my-static-website",
  },
});

// Export the infrastructure outputs
export const bucketName = website.bucketName;
export const cdnId = website.cdnId;
export const cdnUrl = website.cdnUrl;
```

## Outputs

The module exports the following values:

- `bucketName`: The name of the created S3 bucket
- `cdnId`: The ID of the CloudFront distribution
- `cdnUrl`: The CloudFront domain name for accessing your website

## Security Features

The module implements several security best practices:

- S3 bucket public access is blocked by default
- CloudFront Origin Access Control (OAC) for secure S3 access
- HTTPS-only content delivery
- Restricted S3 bucket policy

## Architecture

The infrastructure consists of:

1. **S3 Bucket**: Hosts the static website files
2. **CloudFront Distribution**: Serves content through AWS's global CDN network
3. **Origin Access Control**: Secures access between CloudFront and S3
4. **Bucket Policy**: Allows only CloudFront to access the S3 bucket

## Planned Features

- Custom domain support with ACM certificate integration
- Optional password protection using CloudFront functions
- Additional cache behavior configurations
- Custom error page configuration
- Multiple origin support

