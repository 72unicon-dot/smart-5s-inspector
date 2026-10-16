/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/api/reports': [
      './assets/NanumGothic.ttf',
      './node_modules/pdfkit/js/data/**/*',
    ],
  },
};
export default nextConfig;
