import { useState } from 'react'
import Button from './components/Button.jsx'
import Card from './components/Card.jsx'

const FRUITS = ['Apple', 'Banana', 'Cherry']

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <header className="app-header">
        <h1>carbon8r demo</h1>
        <p>
          Hold <kbd>Option</kbd> (<kbd>Alt</kbd>) and hover anything, then click
          to open its source in your editor.
        </p>
      </header>

      <Card title="Counter">
        <p className="count">Count: {count}</p>
        <Button onClick={() => setCount((c) => c + 1)}>Increment</Button>
        <Button variant="ghost" onClick={() => setCount(0)}>
          Reset
        </Button>
      </Card>

      <Card title="Fruit list">
        <ul className="fruit-list">
          {FRUITS.map((fruit) => (
            <li key={fruit}>{fruit}</li>
          ))}
        </ul>
      </Card>
    </main>
  )
}
