import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'res.cloudinary.com',
          port: '',
          pathname: '/dfsbtqsxh/image/upload/**',
        },
      ],
    },
  };
  
  export default nextConfig;
