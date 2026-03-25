import { prisma } from "#/db"

export const getServerTodos = async () => {
  return await prisma.todo.findMany()
}
