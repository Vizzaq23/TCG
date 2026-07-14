import type { NextConfig } from "next";

// Windows / antivirus HTTPS inspection often installs a local root CA that
// Node's bundled Mozilla store does not trust. Opt Turbopack into the OS store.
if (process.env.NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS === undefined) {
  process.env.NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS = "1";
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
