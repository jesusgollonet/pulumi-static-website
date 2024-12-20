import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface StaticWebsiteArgs {
  tags?: { [key: string]: string };
}

export class StaticWebsite extends pulumi.ComponentResource {
  public readonly bucket: aws.s3.Bucket;
  public readonly bucketPublicAccessBlock: aws.s3.BucketPublicAccessBlock;
  public readonly cdn: aws.cloudfront.Distribution;
  public readonly oac: aws.cloudfront.OriginAccessControl;
  public readonly bucketPolicy: aws.s3.BucketPolicy;
  public readonly bucketName: pulumi.Output<string>;
  public readonly cdnId: pulumi.Output<string>;
  public readonly cdnUrl: pulumi.Output<string>;

  constructor(
    name: string,
    args: StaticWebsiteArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("custom:resource:StaticWebsite", name, args, opts);
    // Create a web ready S3 Bucket
    this.bucket = new aws.s3.Bucket(
      name,
      {
        website: {
          indexDocument: "index.html",
        },
      },
      { parent: this },
    );

    this.bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      `${name}-bpab`,
      {
        bucket: this.bucket.id, // Reference to the S3 bucket we created above
        blockPublicAcls: true, // Setting this to 'true' blocks new public ACLs on the bucket
        ignorePublicAcls: true, // Setting this to 'true' causes S3 to ignore all public ACLs on the bucket
        blockPublicPolicy: true, // Setting this to 'true' prevents new public bucket policies from being applied
        restrictPublicBuckets: true, // Setting this to 'true' restricts public bucket policies to only the bucket owner and AWS services
      },
      { parent: this },
    );

    this.oac = new aws.cloudfront.OriginAccessControl(
      `${name}-aoc`,
      {
        description: "Example Policy",
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
      { parent: this },
    );

    this.cdn = new aws.cloudfront.Distribution(
      `${name}-cdn`,
      {
        enabled: true,
        defaultRootObject: "index.html",
        origins: [
          {
            originId: this.bucket.arn,
            domainName: this.bucket.bucketRegionalDomainName,
            originAccessControlId: this.oac.id, // Use OAC instead of OAI
          },
        ],
        defaultCacheBehavior: {
          cachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
          compress: true,
          targetOriginId: this.bucket.arn,
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
        //aliases: [domainName],

        viewerCertificate: {
          //acmCertificateArn: acmCertificateArn,
          //cloudfrontDefaultCertificate: false,
          cloudfrontDefaultCertificate: true,

          sslSupportMethod: "sni-only",
        },
      },
      { parent: this },
    );

    this.bucketPolicy = new aws.s3.BucketPolicy(
      `${name}-bucket-policy`,
      {
        bucket: this.bucket.bucket,
        policy: pulumi
          .all([this.bucket.id, this.cdn.arn])
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
      },
      { parent: this },
    );

    this.bucketName = this.bucket.bucket;
    this.cdnId = this.cdn.id;
    this.cdnUrl = this.cdn.domainName;

    // Export the name of the Bucket
    this.registerOutputs({
      bucketName: this.bucket.id,
      cdnId: this.cdn.id,
      cdnUrl: this.cdn.domainName,
    });
  }
}
