/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    '/api/reports': ['./assets/NanumGothic.ttf'],
  },
};
export default nextConfig;
