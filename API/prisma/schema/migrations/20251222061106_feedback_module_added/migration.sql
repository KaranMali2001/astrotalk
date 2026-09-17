-- CreateTable
CREATE TABLE "public"."call_feedbacks" (
    "id" UUID NOT NULL,
    "callId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "professionalId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_feedbacks_callId_key" ON "public"."call_feedbacks"("callId");

-- CreateIndex
CREATE INDEX "call_feedbacks_callId_idx" ON "public"."call_feedbacks"("callId");

-- CreateIndex
CREATE INDEX "call_feedbacks_professionalId_idx" ON "public"."call_feedbacks"("professionalId");

-- CreateIndex
CREATE INDEX "call_feedbacks_userId_idx" ON "public"."call_feedbacks"("userId");

-- CreateIndex
CREATE INDEX "call_feedbacks_createdAt_idx" ON "public"."call_feedbacks"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."call_feedbacks" ADD CONSTRAINT "call_feedbacks_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."calls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_feedbacks" ADD CONSTRAINT "call_feedbacks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_feedbacks" ADD CONSTRAINT "call_feedbacks_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
