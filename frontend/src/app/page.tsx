import Link from 'next/link'

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Advanced POS Frontend</h1>
      <ul className="list-disc pl-5 space-y-2">
        <li><Link href="/auth/login" className="underline">Login</Link></li>
        <li><Link href="/dashboard" className="underline">Dashboard</Link></li>
        <li><Link href="/orders" className="underline">Orders</Link></li>
        <li><Link href="/menu-items" className="underline">Menu Items</Link></li>
      </ul>
    </main>
  )
}


