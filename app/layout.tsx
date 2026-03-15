import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ZKLend — Income-Verified Lending on Starknet',
  description: 'Borrow without overcollateralizing. Prove your income range with ZK, powered by Starkzap gasless transactions.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
