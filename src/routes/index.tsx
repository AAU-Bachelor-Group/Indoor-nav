import { getTodos } from '#/server/todo.functions'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { data: todos } = useQuery({ queryKey: ['todos'], queryFn: getTodos })
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      {todos?.map((todo) => (
        <div key={todo.id}>
          <h1>{todo.title}</h1>
        </div>
      ))}
    </main>
  )
}
