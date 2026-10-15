import type { ReactNode } from 'react';
import './style.css';
export const metadata={title:'Smart 5S Inspector',description:'제조현장 5S 모바일 점검'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="ko"><body>{children}</body></html>}
