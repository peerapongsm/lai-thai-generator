/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/lai-thai-generator",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
