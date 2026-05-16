import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Providers } from '@/components/Providers'
import ScrollToTop from '@/components/ScrollToTop'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LDN in Africa',
  description: 'Africa\'s Integrated Land Degradation Monitoring System',
  icons: {
    icon: '/images/Logo-ILDMC.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ScrollToTop />
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
