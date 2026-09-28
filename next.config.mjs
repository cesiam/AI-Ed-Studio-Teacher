/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow opening the dev server from another device on the local network.
  allowedDevOrigins: ['10.29.158.141'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
