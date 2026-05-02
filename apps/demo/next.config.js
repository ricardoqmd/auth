/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow consuming workspace packages without pre-build during dev
  transpilePackages: [
    "@ricardoqmd/auth-core",
    "@ricardoqmd/auth-keycloak",
    "@ricardoqmd/auth-nextjs",
  ],
};

module.exports = nextConfig;
