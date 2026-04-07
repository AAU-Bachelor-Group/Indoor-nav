import { prisma } from "#/db";

export const getAllRooms = async () => {
    const rooms = await prisma.room.findMany();
    return rooms;
}