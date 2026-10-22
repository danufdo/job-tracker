/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "exceljs", 
    "@react-pdf/renderer", 
    "pdfkit"
  ],
  outputFileTracingIncludes: {
    "**/*": ["./node_modules/pdfkit/**/*"],
  },
};

export default nextConfig;