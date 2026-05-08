/*
  Warnings:

  - You are about to drop the column `doors` on the `Edge` table. All the data in the column will be lost.
  - You are about to drop the column `elevators` on the `Edge` table. All the data in the column will be lost.
  - You are about to drop the column `stairs` on the `Edge` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Edge" DROP COLUMN "doors",
DROP COLUMN "elevators",
DROP COLUMN "stairs";
