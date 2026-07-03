import type { Metadata } from "next";
import { Srisakdi } from "next/font/google";
import "./globals.css";

const displayFont = Srisakdi({
  subsets: ["thai", "latin"],
  weight: ["400", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ลายไทย Generator",
  description:
    "สร้างลายไทย (ประจำยาม กนก ลายต่อเนื่อง) แบบ parametric — เล่นพารามิเตอร์ สุ่มลาย แล้ว export SVG/PNG ได้ฟรี",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={displayFont.variable}>
      <head>
        <script
          defer
          src="https://umami-host-peerapongsms-projects.vercel.app/script.js"
          data-website-id="3f09453d-0b39-443e-8845-5e65611cc58a"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
