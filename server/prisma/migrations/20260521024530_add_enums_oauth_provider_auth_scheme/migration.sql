/*
  Warnings:

  - Changed the type of `name` on the `auth_schemes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `oauth_providers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OAuthProviderName" AS ENUM ('google');

-- CreateEnum
CREATE TYPE "AuthSchemeName" AS ENUM ('ldap', 'oauth', 'sso');

-- AlterTable
ALTER TABLE "auth_schemes" ALTER COLUMN "name" TYPE "AuthSchemeName" USING "name"::text::"AuthSchemeName";

-- AlterTable
ALTER TABLE "oauth_providers" ALTER COLUMN "name" TYPE "OAuthProviderName" USING "name"::text::"OAuthProviderName";
