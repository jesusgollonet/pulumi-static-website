import * as pulumi from "@pulumi/pulumi";
import { StaticWebsite } from "./src/static-website";

const PROJECT_NAME = "pulumi-static-website";
//const stack = pulumi.getStack();

const config = new pulumi.Config();
//const domainName = config.require("customDomain");
//const acmCertificateArn = config.require("acmCertificateArn");

const website = new StaticWebsite(PROJECT_NAME, {
  tags: {
    name: PROJECT_NAME,
  },
});

export const bucket = website.bucketName;
export const cdnId = website.cdnId;
export const cdnUrl = website.cdnUrl;
