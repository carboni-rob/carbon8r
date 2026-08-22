export default function Card({ title, children }) {
  return (
    <section style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, margin: '16px 0' }}>
      <h2 style={{ margin: '0 0 8px' }}>{title}</h2>
      <div>{children}</div>
    </section>
  )
}
