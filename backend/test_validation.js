const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { ValidationPipe } = require('@nestjs/common');

// Let's just create a small Nest app context to test ValidationPipe
