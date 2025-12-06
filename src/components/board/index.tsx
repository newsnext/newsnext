import Card from "../card"
import { MOCK_SOURCES } from "../card/mock-data"

export function Board() {
  const sources = Object.keys(MOCK_SOURCES)

  return (
    <ol className="flex flex-wrap justify-center gap-2 sm:gap-6">
      {sources.map(id => (
        <li key={id}>
          <Card id={id} />
        </li>
      ))}
    </ol>
  )
}

export default Board
