import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'

export const metadata: Metadata = {
  title: 'MedMap+ | Votre santé, à portée de main',
  description: 'MedMap+ centralise hôpitaux, pharmacies, vétérinaires et téléconsultations sur une seule application intelligente.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider><CartProvider>{children}</CartProvider></AuthProvider>
      </body>
    </html>
  )
}
