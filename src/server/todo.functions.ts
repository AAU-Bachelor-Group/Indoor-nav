import { createServerFn } from "@tanstack/react-start";
import { getServerTodos } from "./todo.server";

export const getTodos = createServerFn({method: "GET"}).handler(async () => {
    return await getServerTodos()
})
