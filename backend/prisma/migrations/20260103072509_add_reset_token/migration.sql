/*
  Warnings:

  - You are about to drop the column `bankAccount` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `baseMonthWage` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `baseYearlyWage` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `certifications` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `dob` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `ifsc` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `maritalStatus` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `nationality` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `pan` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `personalEmail` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `uan` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "bankAccount",
DROP COLUMN "bankName",
DROP COLUMN "baseMonthWage",
DROP COLUMN "baseYearlyWage",
DROP COLUMN "certifications",
DROP COLUMN "dob",
DROP COLUMN "gender",
DROP COLUMN "ifsc",
DROP COLUMN "maritalStatus",
DROP COLUMN "nationality",
DROP COLUMN "pan",
DROP COLUMN "personalEmail",
DROP COLUMN "uan";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT;
