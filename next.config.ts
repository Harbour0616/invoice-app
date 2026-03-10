import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/sites/manage",
        destination: "/master",
        permanent: false,
      },
      {
        source: "/clients",
        destination: "/master",
        permanent: false,
      },
      {
        source: "/master/vendors",
        destination: "/master",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
