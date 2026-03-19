export const metadata = {
  title: 'Maintenance - Toonator',
  description: 'Toonator is currently undergoing maintenance.',
};

export default function MaintenanceLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
