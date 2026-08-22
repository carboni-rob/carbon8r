'use client'

import { useState } from 'react'

export default function Counter() {
  const [n, setN] = useState(0)
  return (
    <button onClick={() => setN(n + 1)} style={{ padding: '8px 14px', borderRadius: 6 }}>
      client component clicked {n}×
    </button>
  )
}
