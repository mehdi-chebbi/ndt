'use client'

import Link from 'next/link'

const sans = { fontFamily: 'system-ui, sans-serif' }

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-[#060a08]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">

          {/* Column 1 — Logo & About */}
          <div className="lg:col-span-1">
            {/* Logo placeholder */}
            <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center mb-5">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="#22c55e" strokeWidth="1.5" opacity="0.6"/>
                <path d="M8 16 Q12 10 16 16 Q20 22 24 16" stroke="#22c55e" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
              </svg>
            </div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-1" style={sans}>
              Africa&apos;s Integrated LDN Monitoring System
            </h4>
            <p className="text-sm text-green-400/80 font-medium mb-4" style={sans}>
              LDN Platform Africa
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mb-6" style={sans}>
              Monitor land degradation. Track LDN. Support sustainable land management across Africa.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {[
                { label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                { label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                { label: 'X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { label: 'YouTube', path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center text-gray-500 hover:text-green-400 hover:border-green-400/20 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — Pages */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5" style={sans}>
              Pages
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Home', href: '/' },
                { label: 'LDN in Africa', href: '#' },
                { label: 'Geoportal', href: '/map' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Success stories', href: '/story' },
                { label: 'Resources', href: '/api-docs' },
                { label: 'Connexion', href: '/login' },
              ].map((page) => (
                <li key={page.label}>
                  <Link href={page.href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors duration-200 inline-flex items-center gap-2" style={sans}>
                    <span className="w-1 h-1 rounded-full bg-green-400/40" />
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Contact */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5" style={sans}>
              Contact
            </h4>
            <div className="space-y-5">
              {/* Phone */}
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-1" style={sans}>Phone</p>
                <a href="tel:+21671206633" className="text-sm text-gray-400 hover:text-green-400 transition-colors duration-200" style={sans}>
                  (+216) 71 206 633
                </a>
              </div>
              {/* Email */}
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-1" style={sans}>Email</p>
                <a href="mailto:boc@oss.org.tn" className="text-sm text-gray-400 hover:text-green-400 transition-colors duration-200" style={sans}>
                  boc@oss.org.tn
                </a>
              </div>
              {/* Address */}
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-1" style={sans}>Address</p>
                <p className="text-sm text-gray-400 leading-relaxed" style={sans}>
                  Sahara and Sahel Observatory (OSS),<br />
                  Leader Yasser Arafat Blvd,<br />
                  PO Box 31,<br />
                  Tunis, Carthage 1080<br />
                  Tunisia
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600" style={sans}>
            Developed by OSS
          </p>
          <p className="text-xs text-gray-600" style={sans}>
            &copy; {new Date().getFullYear()} LDN Platform Africa. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
