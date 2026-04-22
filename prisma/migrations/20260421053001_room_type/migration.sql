/*
  Warnings:

  - The values [CLASSROOM,FOOD_DRINK,FACILITY] on the enum `RoomType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoomType_new" AS ENUM ('DEFAULT', 'OFFICE', 'SEMINAR_ROOM', 'GROUP_ROOM', 'MEETING_ROOM', 'LABORATORY', 'AUDITORIUM', 'STUDY_SPACE', 'CORRIDOR', 'LOUNGE', 'KITCHEN', 'CANTEEN', 'ATRIUM', 'RECEPTION', 'LIBRARY', 'FITNESS', 'COVERED_AREA', 'TECHNICAL_ROOM', 'STORAGE', 'PRINT_ROOM', 'CLOAKROOM', 'TOILET', 'CHANGING_ROOM', 'CLEANING_ROOM', 'QUIET_ROOM', 'IT_SUPPORT', 'SERVICE_DESK', 'FACILITY_SUPPORT', 'LOADING_DOCK', 'WASTE', 'ELEVATOR', 'STAIRS', 'VESTIBULE', 'SHAFT', 'AIRLOCK', 'RAMP', 'VIBRATION_ROOM', 'SOUND_BOOTH');
ALTER TABLE "Room" ALTER COLUMN "type" TYPE "RoomType_new" USING ("type"::text::"RoomType_new");
ALTER TYPE "RoomType" RENAME TO "RoomType_old";
ALTER TYPE "RoomType_new" RENAME TO "RoomType";
DROP TYPE "public"."RoomType_old";
COMMIT;
