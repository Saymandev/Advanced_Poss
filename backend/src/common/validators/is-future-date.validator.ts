import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsFutureDateString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDateString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Let @IsOptional handle if it's missing
          const date = new Date(value);
          if (isNaN(date.getTime())) return false; // Invalid date format
          
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Strip time component for fair comparison
          
          return date.getTime() >= today.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a future date (cannot be in the past).`;
        }
      },
    });
  };
}
