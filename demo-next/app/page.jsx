import Card from './components/Card'
import Counter from './components/Counter'

export default function Home() {
  return (
    <main>
      <h1>carbon8r × Next.js</h1>
      <p>Hold Alt/Option and click anything below.</p>
      <Card title="Server component">
        <span>Rendered on the server (RSC).</span>
      </Card>
      <Counter />
    </main>
  )
}
