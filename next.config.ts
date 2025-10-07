import type { NextConfig } from "next";
import withPWA from "next-pwa";

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
  
  export default withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
  // @ts-expect-error PWA type issue
  })(nextConfig);

