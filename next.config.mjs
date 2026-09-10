/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    'hiroschi-dev-preview.preview.emergentagent.com',
    'hiroschi-dev-preview.cluster-1.preview.emergentcf.cloud',
  ],
}

export default nextConfig
