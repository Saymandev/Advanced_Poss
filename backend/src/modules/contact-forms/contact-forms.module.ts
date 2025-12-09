import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactForm, ContactFormSchema } from '../public/schemas/contact-form.schema';
import { ContactFormsController } from './contact-forms.controller';
import { ContactFormsService } from './contact-forms.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactForm.name, schema: ContactFormSchema },
    ]),
  ],
  controllers: [ContactFormsController],
  providers: [ContactFormsService],
  exports: [ContactFormsService],
})
export class ContactFormsModule {}

