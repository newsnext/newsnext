import Card from "../card"
import { MOCK_SOURCES } from "../card/mock-data"

export function Board() {
  const sources = Object.keys(MOCK_SOURCES)

  return (
    <ol
      className="grid gap-6"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(350px, 1fr))`,
      }}
    >
      {sources.map(id => (
        <li key={id}>
          <Card id={id} />
        </li>
      ))}
    </ol>
  )
}

export default Board
