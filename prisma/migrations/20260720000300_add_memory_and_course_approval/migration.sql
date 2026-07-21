-- AlterTable
ALTER TABLE "Course" ADD COLUMN "approvedById" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StudentConceptMemory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "masteryScore" INTEGER NOT NULL DEFAULT 0,
    "misconception" TEXT,
    "observations" JSONB,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentConceptMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentConceptMemory_studentId_conceptId_key" ON "StudentConceptMemory"("studentId", "conceptId");

-- CreateIndex
CREATE INDEX "StudentConceptMemory_studentId_idx" ON "StudentConceptMemory"("studentId");

-- CreateIndex
CREATE INDEX "StudentConceptMemory_conceptId_idx" ON "StudentConceptMemory"("conceptId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentConceptMemory" ADD CONSTRAINT "StudentConceptMemory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentConceptMemory" ADD CONSTRAINT "StudentConceptMemory_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
