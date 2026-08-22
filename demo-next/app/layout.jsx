import { Carbon8r } from 'next-carbon8r/client'

export const metadata = { title: 'carbon8r · Next demo' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ font: '15px system-ui', margin: 0, padding: 32 }}>
        {children}
        <Carbon8r />
      </body>
    </html>
  )
}
