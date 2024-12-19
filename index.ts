import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const PROJECT_NAME = "pulumi-static-website";
const stack = pulumi.getStack();

const config = new pulumi.Config();
const domainName = config.require("customDomain");
const acmCertificateArn = config.require("acmCertificateArn");

// Create a web ready S3 Bucket
const bucket = new aws.s3.Bucket(`${PROJECT_NAME}-${stack}`, {
  website: {
    indexDocument: "index.html",
  },
});

// Create a BucketPublicAccessBlock policy
const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "bucket-public-access-block",
  {
    bucket: bucket.id, // Reference to the S3 bucket we created above
    blockPublicAcls: true, // Setting this to 'true' blocks new public ACLs on the bucket
    ignorePublicAcls: true, // Setting this to 'true' causes S3 to ignore all public ACLs on the bucket
    blockPublicPolicy: true, // Setting this to 'true' prevents new public bucket policies from being applied
    restrictPublicBuckets: true, // Setting this to 'true' restricts public bucket policies to only the bucket owner and AWS services
  },
);

// Create Origin Access Control
const oac = new aws.cloudfront.OriginAccessControl("example", {
  description: "Example Policy",
  originAccessControlOriginType: "s3",
  signingBehavior: "always",
  signingProtocol: "sigv4",
});
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html
const cdn = new aws.cloudfront.Distribution("cdn", {
  enabled: true,
  defaultRootObject: "index.html",
  origins: [
    {
      originId: bucket.arn,
      domainName: bucket.bucketRegionalDomainName,
      originAccessControlId: oac.id, // Use OAC instead of OAI
    },
  ],
  defaultCacheBehavior: {
    cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    compress: true,
    targetOriginId: bucket.arn,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    minTtl: 0,
    defaultTtl: 0,
    maxTtl: 0,
  },

  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  aliases: [domainName],

  viewerCertificate: {
    acmCertificateArn: acmCertificateArn,
    cloudfrontDefaultCertificate: false,
    sslSupportMethod: "sni-only",
  },
});

// Modified bucket policy to only allow CloudFront access
const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
  bucket: bucket.id,
  policy: pulumi
    .all([bucket.id, cdn.arn])
    .apply(([bucketName, distributionArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowCloudFrontServicePrincipal",
            Effect: "Allow",
            Principal: {
              Service: "cloudfront.amazonaws.com",
            },
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${bucketName}/*`,
            Condition: {
              StringEquals: {
                "AWS:SourceArn": distributionArn,
              },
            },
          },
        ],
      }),
    ),
});

// Export the name of the bucket
export const bucketName = bucket.id;
export const bucketWebsiteUrl = bucket.websiteEndpoint;
export const cdnUrl = cdn.domainName;
export const cdnId = cdn.id;
