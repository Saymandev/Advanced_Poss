import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    SystemFeedback,
    SystemFeedbackSchema,
} from './schemas/system-feedback.schema';
import { SystemFeedbackController } from './system-feedback.controller';
import { SystemFeedbackService } from './system-feedback.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemFeedback.name, schema: SystemFeedbackSchema },
    ]),
  ],
  controllers: [SystemFeedbackController],
  providers: [SystemFeedbackService],
  exports: [SystemFeedbackService],
})
export class SystemFeedbackModule {}

