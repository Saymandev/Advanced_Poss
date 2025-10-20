import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginActivityController } from './login-activity.controller';
import { LoginActivityService } from './login-activity.service';
import { LoginActivity, LoginActivitySchema } from './schemas/login-activity.schema';
import { LoginSession, LoginSessionSchema } from './schemas/login-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoginActivity.name, schema: LoginActivitySchema },
      { name: LoginSession.name, schema: LoginSessionSchema },
    ]),
  ],
  controllers: [LoginActivityController],
  providers: [LoginActivityService],
  exports: [LoginActivityService],
})
export class LoginActivityModule {}
